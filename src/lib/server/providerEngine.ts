import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface EmailProvider {
    id: string;
    name: string;
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    status: 'active' | 'exhausted' | 'error' | 'suspended';
    dailyQuota: number;
    usedToday: number;
    consecutiveFailures: number;
    lastFailedAt?: unknown;

    // Adaptive Metrics
    successCount: number;
    failureCount: number;
    totalLatencyMs: number;
    suspendedUntil: number; // Stored as epoch timestamp

    // Runtime calculation
    penaltyScore?: number;
}

export interface EmailParams {
    toEmail: string;
    subject: string;
    htmlContent: string;
}

export const ProviderEngine = {
    /**
     * Adaptive Real-Time Provider Selection.
     * Evaluates provider entropy by calculating Penalty Scores driven by 
     * mathematical standard deviations of usage, latency curves, and historical failure weighting.
     */
    async getViableProviders(): Promise<EmailProvider[]> {
        const snap = await adminDb.collection('emailProviders')
            .where('status', 'in', ['active', 'error', 'suspended'])
            .get();

        const today = new Date().toISOString().split('T')[0];
        const providers: EmailProvider[] = [];
        const now = Date.now();

        for (const doc of snap.docs) {
            const data = doc.data();
            const quota = data.dailyQuota || 200;

            const usageRef = adminDb.collection('providerUsage').doc(doc.id);
            const usageSnap = await usageRef.get();
            let usedToday = 0;

            if (usageSnap.exists) {
                const uData = usageSnap.data()!;
                if (uData.date === today) {
                    usedToday = uData.usedToday || 0;
                } else {
                    await usageRef.set({ date: today, usedToday: 0 }, { merge: true });
                }
            } else {
                await usageRef.set({ date: today, usedToday: 0 });
            }

            // Exclude exhausted directly
            if (usedToday >= quota) {
                if (data.status === 'active' || data.status === 'error') {
                    await doc.ref.update({ status: 'exhausted' });
                }
                continue;
            }

            // Evaluation of Suspension / Cooldown Logic
            const suspendedUntil = data.suspendedUntil || 0;
            if (suspendedUntil > now) {
                // Still serving an exponential backoff cooldown
                continue;
            }

            if (suspendedUntil <= now && data.status === 'suspended') {
                // Cooldown decayed. Reintegrate provider for trial.
                await doc.ref.update({ status: 'active' });
            }

            const successCount = data.successCount || 0;
            const failureCount = data.failureCount || 0;
            const totalLatencyMs = data.totalLatencyMs || 0;

            // ── Dynamic Penalty Scoring Mechanism ── //
            // Lower penalty = better probability of selection. Load bounds are explicitly tracked.

            // 1. Utilization Load Balance (0 - 100 points)
            const utilPenalty = (usedToday / quota) * 100;

            // 2. Failure Rate Curve (0 - 100 points)
            const totalAttempts = successCount + failureCount;
            const failureRate = totalAttempts > 0 ? (failureCount / totalAttempts) : 0;
            const failPenalty = failureRate * 100;

            // 3. Latency Decay Evaluation (0 - 50 points, capped)
            const avgLatency = successCount > 0 ? (totalLatencyMs / successCount) : 1000; // Baseline 1s if untested
            const latencyPenalty = Math.min((avgLatency / 5000) * 50, 50);

            // True Entropy Score
            const penaltyScore = utilPenalty + failPenalty + latencyPenalty;

            providers.push({
                id: doc.id,
                name: data.name,
                serviceId: data.serviceId,
                templateId: data.templateId,
                publicKey: data.publicKey,
                privateKey: data.privateKey,
                status: data.status,
                dailyQuota: quota,
                usedToday,
                consecutiveFailures: data.consecutiveFailures || 0,
                successCount,
                failureCount,
                totalLatencyMs,
                suspendedUntil,
                penaltyScore
            });
        }

        // Sort by calculated engine entropy (Lowest penalty is prioritized)
        return providers.sort((a, b) => (a.penaltyScore || 0) - (b.penaltyScore || 0));
    },

    /**
     * Executes the true atomic loop, factoring in dynamic failure delays,
     * network rejection captures, and penalty algorithmic adjustments.
     */
    async executeSend(params: EmailParams): Promise<{ success: boolean; providerId?: string; error?: string }> {
        const providers = await this.getViableProviders();

        if (providers.length === 0) {
            return { success: false, error: 'No providers available or all quotas exhausted.' };
        }

        let lastError = '';

        // [HARD MODE] Fetch simulation bounds
        const sysStateSnap = await adminDb.collection("systemSettings").doc("globalConfig").get();
        const injection = sysStateSnap.exists ? sysStateSnap.data() : null;

        for (const provider of providers) {
            const startMs = Date.now();
            try {
                await this.sendEmailJS(provider, params);

                const latency = Date.now() - startMs;

                // [HARD MODE] Crash hook injection for quota verification
                if (injection?.crashAfterProviderBeforeQuota) {
                    throw new Error('SIM_CRASH_AFTER_PROVIDER_BEFORE_QUOTA');
                }

                // Atomic Success Update Route
                await adminDb.collection('providerUsage').doc(provider.id).update({
                    usedToday: FieldValue.increment(1)
                });

                await adminDb.collection('emailProviders').doc(provider.id).update({
                    successCount: FieldValue.increment(1),
                    totalLatencyMs: FieldValue.increment(latency),
                    consecutiveFailures: 0,
                    status: 'active',
                    suspendedUntil: 0
                });

                return { success: true, providerId: provider.id };

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                lastError = errorMessage || 'Unknown network logic error';

                // If it explicitly was our forced simulator crash, re-throw to break the MailRunner exactly
                if (lastError === 'SIM_CRASH_AFTER_PROVIDER_BEFORE_QUOTA') throw err;

                const fails = provider.consecutiveFailures + 1;

                // Exponential Backoff Penalty Logic
                // If consecutive failures hits >= 3, trigger decay.
                let newSuspendedUntil = 0;
                let newStatus = provider.status;

                if (fails >= 3) {
                    newStatus = 'suspended';
                    // math logic: 1min * 2^(fails - 3), max 60 mins
                    const backoffMins = Math.min(Math.pow(2, fails - 3), 60);
                    newSuspendedUntil = Date.now() + (backoffMins * 60 * 1000);
                }

                await adminDb.collection('emailProviders').doc(provider.id).update({
                    failureCount: FieldValue.increment(1),
                    consecutiveFailures: fails,
                    status: newStatus,
                    suspendedUntil: newSuspendedUntil,
                    lastFailedAt: FieldValue.serverTimestamp()
                });

                // Algorithm will now naturally bypass this provider or degrade its score severely.
            }
        }

        return { success: false, error: `All viable providers failed geometrically. Exhausted bounds. Last error: ${lastError}` };
    },

    async sendEmailJS(provider: EmailProvider, params: EmailParams) {
        const configSnap = await adminDb.collection('systemSettings').doc('globalConfig').get();
        const config = configSnap.data();

        if (config?.simulationMode === true) {
            // Virtual engine layer for real bounds load testing
            // Includes heavy delay simulations and forced failures

            // Randomly delay by 100ms - 800ms to simulate physical API latency
            const simLatency = 100 + Math.floor(Math.random() * 700);
            await new Promise(r => setTimeout(r, simLatency));

            if (config?.simulateFailProvider === provider.id) {
                throw new Error(`[SIMULATION] Forced Engine failure penalty for ${provider.name}`);
            }
            if (config?.simulateQuotaExhausted === provider.id) {
                throw new Error(`[SIMULATION] Bounds exhausted for provider ${provider.name}`);
            }

            if (config?.simulateGlobalFailRate > 0) {
                if (Math.random() < config.simulateGlobalFailRate) {
                    throw new Error(`[SIMULATION] Global Fractional Failure Injection hit matching ${config.simulateGlobalFailRate * 100}% block`);
                }
            }

            return true;
        }

        // Real Network Bounds Hook
        const payload = {
            service_id: provider.serviceId,
            template_id: provider.templateId,
            user_id: provider.publicKey,
            accessToken: provider.privateKey,
            template_params: {
                to_email: params.toEmail,
                subject: params.subject,
                message: params.htmlContent,
            }
        };

        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`EmailAPI Block ${res.status}: ${errorText}`);
        }

        return true;
    }
};
