import * as admin from 'firebase-admin';
import { logger } from '../logger';

/**
 * FIREBASE BURN INTELLIGENCE ENGINE (Functions Version)
 * Tracks estimated reads, writes, and deletes to monitor free-tier usage.
 * Stores stats in `users/{userId}/usage/{date}`.
 */

export const ACTION_COSTS = {
    READ_DOC: { reads: 1, writes: 0 },
    WRITE_DOC: { reads: 0, writes: 1 },
    DELETE_DOC: { reads: 0, writes: 1 },
    QUERY_LIST: (count: number) => ({ reads: count, writes: 0 }),
    // Complex flows
    SCHEDULER_BATCH: { reads: 0, writes: 0 }, // Logic handles dynamic counts
    EMAIL_SEND: { reads: 1, writes: 2 },
} as const;

export type BurnActionType = keyof typeof ACTION_COSTS | 'CUSTOM';

interface BurnMetrics {
    reads: number;
    writes: number;
    deletes: number;
}

export class BurnEngine {
    static async track(userId: string, action: BurnActionType, customMetrics?: Partial<BurnMetrics>) {
        try {
            const db = admin.firestore();
            const dateKey = new Date().toISOString().split('T')[0];
            const usageRef = db.collection('users').doc(userId).collection('usage').doc(dateKey);

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
                    incrementReads = 0;
                } else {
                    incrementReads = cost.reads;
                    incrementWrites = cost.writes;
                }
            }

            const currentHour = new Date().getHours();

            await usageRef.set({
                reads: admin.firestore.FieldValue.increment(incrementReads),
                writes: admin.firestore.FieldValue.increment(incrementWrites),
                deletes: admin.firestore.FieldValue.increment(incrementDeletes),
                [`hourly.${currentHour}.reads`]: admin.firestore.FieldValue.increment(incrementReads),
                [`hourly.${currentHour}.writes`]: admin.firestore.FieldValue.increment(incrementWrites),
                [`hourly.${currentHour}.deletes`]: admin.firestore.FieldValue.increment(incrementDeletes),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

        } catch (error) {
            logger.warn('[BurnEngine] Failed to track usage', { userId, action, error });
        }
    }
}
