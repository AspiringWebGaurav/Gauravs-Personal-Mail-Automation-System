import { adminDb } from '@/lib/server/admin';
import { EmailProvider, ProviderHealth } from '@/types/engine';
import { NoProvidersAvailableError } from '../error';

const HEALTH_COL = 'provider_health';
const PROVIDERS_COL = 'emailProviders';
const SUSPENSION_TIME_MS = 15 * 60 * 1000; // 15 minutes before retry

export class ProviderEngine {
    private static healthCache: Map<string, ProviderHealth> = new Map();
    private static lastCacheUpdate = 0;
    private static CACHE_TTL = 60 * 1000; // 1 min cache for health

    /**
     * Fetch all providers and dynamically filter by health.
     */
    static async getAvailableProviders(): Promise<EmailProvider[]> {
        await this.refreshHealthCacheIfNeeded();

        // 1. Fetch from DB
        // Assuming providers belong to the system or specific user. 
        // In V1, we pull all active providers since it's single user.
        const snap = await adminDb.collection(PROVIDERS_COL)
            .where('status', '==', 'active')
            .orderBy('priority', 'asc')
            .get();

        if (snap.empty) {
            throw new NoProvidersAvailableError();
        }

        const allProviders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailProvider));

        // 2. Filter by health state
        const now = Date.now();
        const available = allProviders.filter(p => {
            const health = this.healthCache.get(p.id);
            if (!health) return true; // No history = assume healthy

            if (health.status === 'suspended') {
                // Check if suspension time is over
                if (health.lastFailureAt && (now - health.lastFailureAt > SUSPENSION_TIME_MS)) {
                    // Auto-recover to degraded state to test the waters
                    health.status = 'degraded';
                    this.healthCache.set(p.id, health);
                    this.persistHealth(health); // async backup
                    return true;
                }
                return false;
            }
            return true;
        });

        if (available.length === 0) {
            console.warn('[ProviderEngine] All providers are suspended or none available. Triggering fail-safe.');
            throw new NoProvidersAvailableError();
        }

        return available;
    }

    /**
     * Report success or failure to dynamically adjust the pool.
     */
    static async reportResult(providerId: string, success: boolean) {
        const health = this.healthCache.get(providerId) || {
            providerId,
            successCount: 0,
            failureCount: 0,
            lastFailureAt: null,
            status: 'healthy',
            updatedAt: Date.now()
        } as ProviderHealth;

        if (success) {
            health.successCount++;
            health.failureCount = 0;
            if (health.status !== 'healthy') {
                console.log(`[ProviderEngine] Provider ${providerId} recovered to healthy state.`);
                health.status = 'healthy';
            }
        } else {
            health.failureCount++;
            health.lastFailureAt = Date.now();

            // Circuit Breaker Logic
            if (health.failureCount >= 3 && health.status !== 'suspended') {
                console.warn(`[ProviderEngine] Provider ${providerId} suspended due to consecutive failures.`);
                health.status = 'suspended';
            } else if (health.failureCount > 0 && health.status === 'healthy') {
                health.status = 'degraded';
            }
        }

        health.updatedAt = Date.now();
        this.healthCache.set(providerId, health);

        // Fire-and-forget persist
        this.persistHealth(health).catch(e => console.error('Failed to sync health', e));
    }

    private static async refreshHealthCacheIfNeeded() {
        if (Date.now() - this.lastCacheUpdate < this.CACHE_TTL) return;

        try {
            const snap = await adminDb.collection(HEALTH_COL).get();
            snap.forEach(doc => {
                const data = doc.data() as ProviderHealth;
                this.healthCache.set(data.providerId, data);
            });
            this.lastCacheUpdate = Date.now();
        } catch (err: unknown) {
            console.warn('[ProviderEngine] Failed to refresh health cache.', err);
        }
    }

    private static async persistHealth(health: ProviderHealth) {
        await adminDb.collection(HEALTH_COL).doc(health.providerId).set(health, { merge: true });
    }
}
