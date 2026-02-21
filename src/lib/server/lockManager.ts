import 'server-only';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/api-framework';

const LOCK_COLLECTION = 'system_locks';

/**
 * Distributed Lock Manager backed by Firestore.
 * Ensures critical sections (like invite creation) are mutually exclusive
 * for a specific resource (e.g., invitee email + event ID).
 */
export class LockManager {
    /**
     * Acquires a lock for a specific key.
     * @param key Unique lock key (e.g., "invite_eventId_email")
     * @param ttlSeconds Time-to-live in seconds (default: 10s). Lock auto-expires after this.
     * @returns true if lock acquired, false if already locked.
     * @throws AppError if DB fails.
     */
    static async acquire(key: string, ttlSeconds: number = 10): Promise<boolean> {
        const lockRef = adminDb.collection(LOCK_COLLECTION).doc(key);
        const now = Date.now();
        const expiresAt = now + ttlSeconds * 1000;

        try {
            return await adminDb.runTransaction(async (t: any) => {
                const doc = await t.get(lockRef);

                if (doc.exists) {
                    const data = doc.data();
                    // Check if expired
                    if (data?.expiresAt > now) {
                        return false; // Still locked and valid
                    }
                    // If expired, we can take over (fallthrough)
                }

                t.set(lockRef, {
                    key,
                    acquiredAt: now,
                    expiresAt,
                    ttl: ttlSeconds
                });

                return true;
            });
        } catch (error) {
            logger.error('[LockManager] Failed to acquire lock', { key, error });
            throw new AppError('DB_ERROR', 'Failed to acquire system lock', 500);
        }
    }

    /**
     * Releases a lock.
     * Should be called in a finally block.
     * @param key Unique lock key
     */
    static async release(key: string): Promise<void> {
        try {
            // we just delete the doc to release
            await adminDb.collection(LOCK_COLLECTION).doc(key).delete();
        } catch (error) {
            // Non-critical error, TTL will handle cleanup eventually
            logger.warn('[LockManager] Failed to release lock', { key, error });
        }
    }

    /**
     * Middleware-like wrapper to executing code with a lock
     */
    static async runWithLock<T>(key: string, fn: () => Promise<T>, ttlSeconds: number = 10): Promise<T> {
        const acquired = await this.acquire(key, ttlSeconds);
        if (!acquired) {
            throw new AppError('CONFLICT', 'Resource is currently locked. Please retry.', 409);
        }

        try {
            return await fn();
        } finally {
            await this.release(key);
        }
    }
}
