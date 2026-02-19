import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Fixed Window Rate Limiter powered by Firestore.
 * Costs: 1 Write per allowed request (Increment). 1 Read per blocked request (Check).
 * 
 * @param key Unique key (e.g. `ip_127.0.0.1_invite_create`)
 * @param limit Max requests per window
 * @param windowSeconds Window duration in seconds
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = Math.floor(now / (windowSeconds * 1000));
    const docId = `${key}_${windowKey}`;
    const ref = adminDb.collection('rateLimits').doc(docId);

    // Optimistic: Increment. If new value > limit, we are blocked.
    // However, getting the new value requires usage of returns from update/set? 
    // Firestore increment doesn't return the new value in a simple write.
    // We need a transaction or assume logic.
    // Transaction is safest but slower.
    // Optimization: Read first? No (Read + Write = 2 ops).

    // Let's use a Transaction to be "Financial Grade".

    try {
        return await adminDb.runTransaction(async (t) => {
            const doc = await t.get(ref);
            const data = doc.data();

            const count = data?.count || 0;

            if (count >= limit) {
                return {
                    success: false,
                    limit,
                    remaining: 0,
                    reset: (windowKey + 1) * windowSeconds * 1000
                };
            }

            // Increment
            t.set(ref, {
                count: count + 1,
                expiresAt: new Date(now + windowSeconds * 1000 * 2) // TTL for cleanup
            }, { merge: true });

            return {
                success: true,
                limit,
                remaining: limit - (count + 1),
                reset: (windowKey + 1) * windowSeconds * 1000
            };
        });
    } catch (err) {
        logger.error('[RateLimit] Error', { error: err });
        // Fail open to avoid blocking users on DB error, or fail closed?
        // "Never crash" -> Fail Open (allow)
        return { success: true, limit, remaining: 1, reset: 0 };
    }
}
