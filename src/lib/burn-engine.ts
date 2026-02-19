import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

/**
 * FIREBASE BURN INTELLIGENCE ENGINE
 * Tracks estimated reads, writes, and deletes to monitor free-tier usage.
 * Stores stats in `users/{userId}/usage/{date}` to avoid global contention.
 */

// Approximate costs (reads/writes) for common operations
export const ACTION_COSTS = {
    READ_DOC: { reads: 1, writes: 0 },
    WRITE_DOC: { reads: 0, writes: 1 },
    DELETE_DOC: { reads: 0, writes: 1 },
    QUERY_LIST: (count: number) => ({ reads: count, writes: 0 }),
    // Complex flows
    INVITE_CREATE: { reads: 2, writes: 2 }, // auth check + count + write invite + write usage
    INVITE_ACCEPT: { reads: 3, writes: 4 }, // read invite + read event + transaction...
    EMAIL_SEND: { reads: 1, writes: 2 }, // read template + write log + write usage
} as const;

export type BurnActionType = keyof typeof ACTION_COSTS | 'CUSTOM';

interface BurnMetrics {
    reads: number;
    writes: number;
    deletes: number;
}

export class BurnEngine {
    /**
     * Track an action's estimated cost for a specific user.
     * @param userId User ID (or 'system')
     * @param action Action type or custom metrics
     * @param customMetrics If action is CUSTOM, provide { reads, writes, deletes }
     */
    static async track(userId: string, action: BurnActionType, customMetrics?: Partial<BurnMetrics>) {
        try {
            const dateKey = new Date().toISOString().split('T')[0];
            const usageRef = adminDb.collection('users').doc(userId).collection('usage').doc(dateKey);

            let incrementReads = 0;
            let incrementWrites = 0;
            let incrementDeletes = 0;

            if (action === 'CUSTOM' && customMetrics) {
                incrementReads = customMetrics.reads || 0;
                incrementWrites = customMetrics.writes || 0;
                incrementDeletes = customMetrics.deletes || 0;
            } else if (action !== 'CUSTOM') {
                const cost = ACTION_COSTS[action as keyof typeof ACTION_COSTS];
                if (typeof cost === 'function') {
                    // Handled by custom calls usually, but for type safety:
                    incrementReads = 0;
                } else {
                    incrementReads = cost.reads;
                    incrementWrites = cost.writes;
                }
            }

            if (userId === 'system') {
                // HOTSPOT PROTECTION (10k Scale):
                // 'system' user doc would arguably allow only ~1 write/sec.
                // For high-volume system tracking (like API base reads), we sample 1% of traffic.
                // We then increment by 100x to keep stats roughly accurate.
                if (Math.random() > 0.01) return;

                // Scale up the increment to account for sampling
                incrementReads *= 100;
                incrementWrites *= 100;
                incrementDeletes *= 100;
            }

            const currentHour = new Date().getHours();

            // Atomic Increment: Daily Totals + Hourly Slot
            await usageRef.set({
                reads: FieldValue.increment(incrementReads),
                writes: FieldValue.increment(incrementWrites),
                deletes: FieldValue.increment(incrementDeletes),
                [`hourly.${currentHour}.reads`]: FieldValue.increment(incrementReads),
                [`hourly.${currentHour}.writes`]: FieldValue.increment(incrementWrites),
                [`hourly.${currentHour}.deletes`]: FieldValue.increment(incrementDeletes),
                lastUpdated: FieldValue.serverTimestamp(),
                // Keep legacy fields for backward compatibility if needed
                ...(action === 'EMAIL_SEND' ? { sentCount: FieldValue.increment(1) } : {}),
            }, { merge: true });

        } catch (error) {
            // Failsafe: Don't crash main flow for stats
            logger.warn('[BurnEngine] Failed to track usage', { userId, action, error });
        }
    }

    /**
     * Get today's usage for a user.
     */
    static async getDailyUsage(userId: string) {
        try {
            const dateKey = new Date().toISOString().split('T')[0];
            const snap = await adminDb.collection('users').doc(userId).collection('usage').doc(dateKey).get();
            if (!snap.exists) return { reads: 0, writes: 0, deletes: 0 };
            return snap.data() as BurnMetrics;
        } catch (error) {
            logger.error('[BurnEngine] Failed to get usage', { userId, error });
            return { reads: 0, writes: 0, deletes: 0 };
        }
    }

    /**
     * Predict monthly burn based on daily usage and trend.
     */
    static async predictMonthlyBurn(userId: string) {
        // Simplified prediction: Today * 30. 
        // Real model would use moving average, but "No heavy listeners" = simple math.
        const daily = await this.getDailyUsage(userId);
        return {
            predictedReads: (daily?.reads || 0) * 30,
            predictedWrites: (daily?.writes || 0) * 30,
        };
    }

    /**
     * check free-tier status
     */
    static async checkFreeTierStatus(userId: string) {
        const daily = await this.getDailyUsage(userId);
        const dailyReads = daily?.reads || 0;
        const dailyWrites = daily?.writes || 0;

        // Firebase Free Tier (Global): 50k reads/day, 20k writes/day
        // We assume single-tenant for now, or per-user is fraction of global.
        // If system is multi-tenant, "userId" might be "system" for global view.

        const READ_LIMIT = 50000;
        const WRITE_LIMIT = 20000;

        const readUsage = (dailyReads / READ_LIMIT) * 100;
        const writeUsage = (dailyWrites / WRITE_LIMIT) * 100;
        const maxUsage = Math.max(readUsage, writeUsage);

        if (maxUsage > 90) return 'CRITICAL';
        if (maxUsage > 70) return 'WARNING';
        return 'SAFE';
    }
}
