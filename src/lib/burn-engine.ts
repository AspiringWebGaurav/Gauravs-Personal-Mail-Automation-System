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
    private static usageCache: Map<string, { data: BurnMetrics, expireAt: number }> = new Map();
    private static CACHE_TTL_MS = 60 * 1000; // 1 minute cache

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
                // NOTE: This logic was previously flawed (returning early but not scaling correctly in all paths).
                // Fixed: Explicit logic.
                if (Math.random() > 0.01) return;

                // Scale up the increment to account for sampling
                incrementReads *= 100;
                incrementWrites *= 100;
                incrementDeletes *= 100;
            }

            const currentHour = new Date().getHours();

            // Invalidate cache for this user since we are updating
            this.usageCache.delete(userId);

            // Atomic Increment: Daily Totals + Hourly Slot
            // We use 'set' with merge: true to create if not exists
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
     * Get today's usage for a user with caching.
     * @param forceRefresh Ignore cache
     */
    static async getDailyUsage(userId: string, forceRefresh = false): Promise<BurnMetrics> {
        try {
            if (!forceRefresh) {
                const cached = this.usageCache.get(userId);
                if (cached && cached.expireAt > Date.now()) {
                    return cached.data;
                }
            }

            const dateKey = new Date().toISOString().split('T')[0];
            const snap = await adminDb.collection('users').doc(userId).collection('usage').doc(dateKey).get();

            let data: BurnMetrics = { reads: 0, writes: 0, deletes: 0 };
            if (snap.exists) {
                data = snap.data() as BurnMetrics;
            }

            // Update cache
            this.usageCache.set(userId, {
                data,
                expireAt: Date.now() + this.CACHE_TTL_MS
            });

            return data;
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
     * Check free-tier status using cached data.
     * This is safe to call frequently (e.g., on every request) as it hits memory 99% of the time.
     */
    static async checkFreeTierStatus(userId: string): Promise<'SAFE' | 'WARNING' | 'CRITICAL'> {
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
