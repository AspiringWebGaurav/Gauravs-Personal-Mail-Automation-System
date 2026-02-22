import 'server-only';
import { logger } from '@/lib/logger';
import { renderEmailTemplate } from '@/lib/emailTemplateRenderer';
import { ProviderEngine } from './providerEngine';

interface SendInviteEmailParams {
    toEmail: string;
    inviteUrl: string;
    eventName: string;
    inviterName: string;
    eventDate: string;
    location: string;
    simulationMode?: boolean;
}

interface EmailResult {
    success: boolean;
    provider: string;
    durationMs: number;
    error?: string;
    simulated?: boolean;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<EmailResult> {
    const start = Date.now();

    // Legacy Simulation Mode Check Removed.
    // ProviderEngine now exclusively handles simulation at the transport layer.

    try {
        // Fallback HTML Body if no dynamic template provided from caller
        const fallbackHtml = `
            <h2>{{headerText}}</h2>
            <p>{{message}}</p>
            <div style="margin: 20px 0;">
                <strong>{{timeLabel}}:</strong> {{eventTime}}<br/>
                <strong>{{locationLabel}}:</strong> {{eventLocation}}
            </div>
            <a href="{{actionUrl}}" style="display:inline-block;padding:12px 24px;background-color:#6c5ce7;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">{{actionLabel}}</a>
        `;

        // Generate HTML Body using fallback (dynamic templating happens higher up if needed)
        const htmlBody = renderEmailTemplate(fallbackHtml, {
            eventTitle: params.eventName,
            eventTime: params.eventDate,
            eventLocation: params.location,
            message: `You have been invited by ${params.inviterName}. Click the button below to accept.`,
            recipientName: params.toEmail,
            headerText: 'You are Invited!',
            timeLabel: 'When',
            locationLabel: 'Where',
            actionUrl: params.inviteUrl,
            actionLabel: 'Accept Invitation'
        }, undefined, { stripEnvelope: true });

        // Let ProviderEngine handle DB extraction, load balancing, quotas, failover, etc.
        const sendResult = await ProviderEngine.executeSend({
            toEmail: params.toEmail,
            subject: `You're invited: ${params.eventName}`,
            htmlContent: htmlBody
        });

        const durationMs = Date.now() - start;

        if (sendResult.success) {
            logger.info(`Invite email sent successfully`, { provider: sendResult.providerId, durationMs, to: params.toEmail });
            return { success: true, provider: sendResult.providerId || 'unknown', durationMs };
        } else {
            logger.warn(`ProviderEngine invite dispatch failed: ${sendResult.error}`);
            return {
                success: false,
                provider: 'none',
                durationMs,
                error: sendResult.error
            };
        }

    } catch (err) {
        const errorMsg = `Exception in sendInviteEmail: ${err instanceof Error ? err.message : String(err)}`;
        logger.error(errorMsg);
        return {
            success: false,
            provider: 'exception',
            durationMs: Date.now() - start,
            error: errorMsg
        };
    }
}
