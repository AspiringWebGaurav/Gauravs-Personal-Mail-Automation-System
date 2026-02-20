import { ProviderEngine } from './providerEngine';
import { SendEmailParams, EmailProvider, SentLog } from '@/types/engine';
import { ProviderError, NoProvidersAvailableError } from '../error';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';

export class SmartSender {
    /**
     * Intelligently send an email with zero-downtime intra-request failover.
     * If a provider fails, it instantly tries the next one.
     */
    static async send(params: SendEmailParams): Promise<{ success: boolean; providerId: string }> {
        const startTime = Date.now();
        let availableProviders: EmailProvider[];

        try {
            // 1. Fetch available provider pool
            availableProviders = await ProviderEngine.getAvailableProviders();

            if (availableProviders.length === 0) {
                await this.logSentTracker({
                    status: 'blocked',
                    mode: 'live',
                    recipient: { email: params.toEmail, name: params.toName },
                    eventReference: params.eventReference,
                    errorPayload: 'NO_PROVIDERS_AVAILABLE: The active pool is empty.'
                });
                throw new NoProvidersAvailableError();
            }
        } catch (error: unknown) {
            await this.logAudit({
                action: 'DISPATCH_FAILED',
                status: 'FAILED',
                recipient: params.toEmail,
                error: error instanceof Error ? error.message : 'No providers available'
            });
            throw error;
        }

        // 2. Intra-request Failover Loop
        // We try providers one by one. If one fails, we immediately try the next.
        for (let i = 0; i < availableProviders.length; i++) {
            const provider = availableProviders[i];
            try {
                console.log(`[SmartSender] Attempting dispatch via provider: ${provider.name} (${provider.serviceId})`);

                await this.executeSend(provider, params);

                // Success! Report to engine and exit loop
                await ProviderEngine.reportResult(provider.id, true);

                const durationMs = Date.now() - startTime;

                await this.logSentTracker({
                    status: 'success',
                    mode: 'live',
                    providerId: provider.id,
                    providerName: provider.name,
                    recipient: { email: params.toEmail, name: params.toName },
                    eventReference: params.eventReference,
                    dispatchLatencyMs: durationMs
                });

                await this.logAudit({
                    action: 'DISPATCH_SUCCESS',
                    status: 'SENT',
                    recipient: params.toEmail,
                    provider: provider.serviceId,
                    durationMs
                });

                return { success: true, providerId: provider.id };

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown dispatch error';
                console.error(`[SmartSender] Provider ${provider.name} failed:`, errorMessage);

                // Mark provider as failed, engine handles degrading/suspension
                await ProviderEngine.reportResult(provider.id, false);
                const durationMs = Date.now() - startTime;

                // If it's the last provider, we throw the error
                if (i === availableProviders.length - 1) {
                    await this.logSentTracker({
                        status: 'failed',
                        mode: 'live',
                        providerId: provider.id,
                        providerName: provider.name,
                        recipient: { email: params.toEmail, name: params.toName },
                        eventReference: params.eventReference,
                        dispatchLatencyMs: durationMs,
                        errorPayload: errorMessage
                    });

                    await this.logAudit({
                        action: 'DISPATCH_FINAL_FAILURE',
                        status: 'FAILED',
                        recipient: params.toEmail,
                        provider: provider.serviceId,
                        error: errorMessage
                    });
                    throw new ProviderError(`All available providers failed. Last error: ${errorMessage}`);
                }

                // Log the switch before trying the next
                await this.logSentTracker({
                    status: 'switched',
                    mode: 'live',
                    providerId: provider.id,
                    providerName: provider.name,
                    recipient: { email: params.toEmail, name: params.toName },
                    eventReference: params.eventReference,
                    dispatchLatencyMs: durationMs,
                    errorPayload: errorMessage
                });

                // Otherwise, loop continues to the next provider immediately
                console.log(`[SmartSender] Failing over to next provider...`);
            }
        }

        throw new ProviderError('Unexpected complete failure in SmartSender loop');
    }

    /**
     * Private executor interacting with actual external API (EmailJS in this case)
     */
    private static async executeSend(provider: EmailProvider, params: SendEmailParams): Promise<void> {
        const emailData = {
            service_id: provider.serviceId,
            template_id: provider.templateId,
            user_id: provider.publicKey,
            accessToken: provider.privateKey,
            template_params: {
                to_email: params.toEmail,
                to_name: params.toName || 'User',
                from_name: provider.fromName || 'GMSS Engine',
                subject: params.subject || 'Notification from GMSS',
                message: params.message || '',
                ...params.templateParams
            }
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData),
            // We can add a timeout here to fail fast if provider is hanging
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`EmailJS API Error: ${response.status} - ${errorText}`);
        }
    }

    /**
     * Deterministic Audit Logging
     */
    private static async logAudit(data: {
        action: string;
        status: string;
        recipient: string;
        provider?: string;
        durationMs?: number;
        error?: string;
    }) {
        try {
            await adminDb.collection('audit_logs').add({
                ...data,
                timestamp: FieldValue.serverTimestamp(),
                system: 'v1.engine'
            });
        } catch (err: unknown) {
            console.error('[SmartSender] Audit log failed', err);
        }
    }

    /**
     * V2 Sent Tracker Observability Injection
     */
    private static async logSentTracker(log: Omit<SentLog, 'timestamp'>) {
        try {
            await adminDb.collection('sentLogs').add({
                ...log,
                timestamp: Date.now() // Precise MS tracking
            });
        } catch (err: unknown) {
            console.error('[SentTracker] Critical logging failure', err);
        }
    }
}
