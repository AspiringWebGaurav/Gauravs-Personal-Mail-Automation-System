import 'server-only';
import { logger } from '@/lib/logger';
import { renderEmailTemplate } from '@/lib/emailTemplateRenderer';

import { getActiveProviders } from './emailProviderManager';

interface SendInviteEmailParams {
    toEmail: string;
    inviteUrl: string;
    eventName: string;
    inviterName: string;
    eventDate: string;
    location: string;
}

interface EmailResult {
    success: boolean;
    provider: string;
    durationMs: number;
    error?: string;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<EmailResult> {
    const start = Date.now();
    const providers = getActiveProviders('random'); // Get randomized list

    if (providers.length === 0) {
        return {
            success: false,
            provider: 'none',
            durationMs: Date.now() - start,
            error: 'No email providers configured'
        };
    }

    // Loop through providers until success
    const errors: string[] = [];

    for (const provider of providers) {
        try {
            // Generate HTML Body
            const htmlBody = renderEmailTemplate('card', {
                eventTitle: params.eventName,
                eventTime: params.eventDate,
                eventLocation: params.location,
                message: `You have been invited by ${params.inviterName}. Click the button below to accept.`,
                recipientName: params.toEmail, // Or fetch name if known?
                headerText: 'You are Invited!',
                timeLabel: 'When',
                locationLabel: 'Where',
                actionUrl: params.inviteUrl,
                actionLabel: 'Accept Invitation'
            }, undefined, { stripEnvelope: true });

            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: provider.serviceId,
                    template_id: provider.templateId,
                    user_id: provider.publicKey,
                    accessToken: provider.privateKey,
                    template_params: {
                        to_email: params.toEmail,
                        from_name: params.inviterName,
                        subject: `You're invited: ${params.eventName}`,
                        message: htmlBody, // Sending full HTML here
                        reply_to: 'no-reply@gmss.app',
                        invite_link: params.inviteUrl,
                        event_name: params.eventName,
                        event_date: params.eventDate,
                        event_location: params.location
                    },
                }),
            });

            const responseText = await response.text();
            const durationMs = Date.now() - start;

            if (response.ok) {
                logger.info(`Email sent successfully via ${provider.name}`, { provider: provider.serviceId, durationMs, to: params.toEmail });
                return { success: true, provider: provider.serviceId, durationMs };
            }

            // If failed, log and try next
            const errorMsg = `Provider ${provider.name} (${provider.serviceId}) failed: ${response.status} ${responseText}`;
            logger.warn(errorMsg);
            errors.push(errorMsg);

        } catch (err) {
            const errorMsg = `Provider ${provider.name} exception: ${err instanceof Error ? err.message : String(err)}`;
            logger.warn(errorMsg);
            errors.push(errorMsg);
        }
    }

    // If we reach here, ALL providers failed
    logger.error('All email providers failed', { errors, totalProviders: providers.length });
    return {
        success: false,
        provider: 'all',
        durationMs: Date.now() - start,
        error: `All ${providers.length} providers failed. Last error: ${errors[errors.length - 1]}`
    };
}
