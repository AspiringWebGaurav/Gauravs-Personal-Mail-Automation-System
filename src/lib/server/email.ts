import 'server-only';
import { logger } from '@/lib/logger';
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
        // Generate hyper-minimal HTML Body (NVIDIA-style)
        const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <div style="margin-bottom: 30px;">
        <span style="font-size: 24px; font-weight: 800; color: #76b900; letter-spacing: -0.5px;">GPMAS</span>
    </div>
    
    <p style="margin-bottom: 16px;">Hello,</p>
    
    <p style="margin-bottom: 24px;">You have been formally invited to <strong>${params.eventName}</strong> by <strong>${params.inviterName}</strong>.</p>
    
    <div style="margin-bottom: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 6px;">
        <strong style="display: inline-block; margin-bottom: 8px; color: #555;">When:</strong> ${params.eventDate}<br/>
        <strong style="display: inline-block; margin-bottom: 8px; color: #555;">Where:</strong> ${params.location}
    </div>
    
    <p style="margin-bottom: 24px;">Click the button below to accept your invitation and access the event hub.</p>
    
    <div style="margin: 30px 0;">
        <a href="${params.inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #76b900; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 4px;">Accept Invitation</a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #666666;">
        <p style="margin-bottom: 8px;">If the button above does not work, copy and paste the following link into your browser:</p>
        <p style="word-break: break-all;"><a href="${params.inviteUrl}" style="color: #76b900;">${params.inviteUrl}</a></p>
    </div>
    
    <div style="margin-top: 40px; font-size: 11px; color: #999999;">
        Sent via Gaurav's Personal Mail Automation System (GPMAS) <br/>
        Engineered by Gaurav Patil. All rights reserved.
    </div>
</body>
</html>`;

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
