
import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

const COLLECTION = 'systemSettings';
const DOC_ID = 'circuitBreaker';

interface CircuitState {
    status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureAt: number | null;
    nextTryAt: number | null;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60 * 1000;

export class CircuitBreaker {
    // Helper to get doc ref from either client or admin DB
    private static getDocRef(providerId: string, dbInstance: unknown = clientDb) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = dbInstance as any;
        if (db.collection) {
            return db.collection(COLLECTION).doc(DOC_ID + '_' + providerId);
        }
        return doc(db, COLLECTION, DOC_ID + '_' + providerId);
    }

    /**
     * Checks if a request can proceed for the given provider.
     * Returns TRUE if allowed, FALSE if circuit is open.
     */
    static async check(providerId: string, dbInstance: unknown = clientDb): Promise<boolean> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = dbInstance as any;
            let snap;
            const ref = this.getDocRef(providerId, dbInstance);

            // Fetch Doc
            if (db.collection) {
                // Admin SDK
                console.log(`[CircuitBreaker] Reading (Admin) ${ref.path}`);
                snap = await ref.get();
            } else {
                // Client SDK
                console.log(`[CircuitBreaker] Reading (Client) ${ref.path}`);
                snap = await getDoc(ref);
            }

            // Universal exists check
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const exists = typeof (snap as any).exists === 'function' ? (snap as any).exists() : (snap as any).exists;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (typeof (snap as any).data === 'function' ? (snap as any).data() : (snap as any).data ? (snap as any).data() : snap) as CircuitState;

            console.log(`[CircuitBreaker] ${ref.path} -> Exists: ${exists}, Status: ${data?.status}`);

            if (!exists) return true; // Default closed (healthy)

            if (data.status === 'CLOSED') return true;

            const now = Date.now();

            if (data.status === 'OPEN') {
                if (data.nextTryAt && now >= data.nextTryAt) {
                    // Transition to HALF_OPEN
                    if (db.collection) {
                        await ref.update({ status: 'HALF_OPEN' });
                    } else {
                        await updateDoc(ref, { status: 'HALF_OPEN' });
                    }
                    return true;
                }
                return false;
            }

            if (data.status === 'HALF_OPEN') {
                return true;
            }

            return true;
        } catch (err) {
            console.warn('[CircuitBreaker] Check failed, failing open (allowing):', err);
            return true;
        }
    }

    /**
     * Reports a successful execution. Resets the circuit.
     */
    static async onSuccess(providerId: string, dbInstance: unknown = clientDb): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = dbInstance as any;
        const ref = this.getDocRef(providerId, dbInstance);
        const resetData = {
            status: 'CLOSED',
            failureCount: 0,
            lastFailureAt: null,
            nextTryAt: null
        };

        try {
            if (db.collection) {
                await ref.set(resetData, { merge: true });
            } else {
                await setDoc(ref, resetData, { merge: true });
            }
        } catch (e) {
            console.warn('[CircuitBreaker] Success update failed', e);
        }
    }

    /**
     * Reports a failure. Increments count or opens circuit.
     */
    static async onFailure(providerId: string, dbInstance: unknown = clientDb): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = dbInstance as any;
        const ref = this.getDocRef(providerId, dbInstance);

        try {
            // Transaction wrapper for compatibility
            const runTx = async (updateFn: (data: CircuitState | null) => Promise<Partial<CircuitState> | null>) => {
                if (db.collection) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await db.runTransaction(async (t: any) => {
                        const s = await t.get(ref);
                        const data = s.exists ? s.data() : null;
                        const update = await updateFn(data);
                        if (update) {
                            if (!s.exists) t.set(ref, update);
                            else t.set(ref, update, { merge: true });
                        }
                    });
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await runTransaction(db, async (t: any) => {
                        const s = await t.get(ref);
                        const data = s.exists() ? s.data() : null;
                        const update = await updateFn(data);
                        if (update) {
                            if (!s.exists()) t.set(ref, update);
                            else t.set(ref, update, { merge: true });
                        }
                    });
                }
            };

            await runTx(async (data) => {
                const now = Date.now();
                if (!data) {
                    return {
                        status: 'CLOSED',
                        failureCount: 1,
                        lastFailureAt: now,
                        nextTryAt: null
                    };
                }

                if (data.status === 'OPEN') return null; // Already open

                const newCount = (data.failureCount || 0) + 1;

                if (newCount >= FAILURE_THRESHOLD || data.status === 'HALF_OPEN') {
                    console.error(`[CircuitBreaker] TRIPPED for ${providerId}. Pausing for ${COOLDOWN_MS}ms.`);
                    return {
                        status: 'OPEN',
                        failureCount: newCount,
                        lastFailureAt: now,
                        nextTryAt: now + COOLDOWN_MS
                    };
                } else {
                    return {
                        failureCount: newCount,
                        lastFailureAt: now
                    };
                }
            });

        } catch (e) {
            console.error('[CircuitBreaker] Failure update failed', e);
        }
    }
}
