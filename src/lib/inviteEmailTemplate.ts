/**
 * Professional HTML email template for GMSS event invitations.
 * Matches the existing GMSS email aesthetic (gradient header, card layout).
 */

import { renderBrandingFooter } from './emailSystem/brandingFooter';
import { EmailThemeColors } from './emailTemplateRenderer';

export interface InviteEmailParams {
    inviterName: string;
    eventTitle: string;
    eventTime: string;
    eventLocation?: string;
    inviteLink: string;
    role: string;
    // Dynamic Content Overrides
    headerText?: string; // Default: "EVENT INVITATION"
    bodyText?: string;   // Default: "{inviterName} has invited you to join an event as {role}."
    whenLabel?: string;  // Default: "WHEN"
    whereLabel?: string; // Default: "WHERE"
    buttonText?: string; // Default: "Accept Invitation"
    expiryText?: string; // Default: "This invitation expires in 7 days..."
}

// Theme used for the Invite Email (Dark Mode Aesthetic)
const INVITE_THEME: EmailThemeColors = {
    primaryColor: '#6c5ce7',
    secondaryColor: '#a855f7',
    backgroundColor: '#1a1a2e', // Card background
    textColor: '#ffffff',       // Text color for footer
    borderRadius: 16
};

export function renderInviteEmail(params: InviteEmailParams): string {
    const {
        inviterName,
        eventTitle,
        eventTime,
        eventLocation,
        inviteLink,
        role,
        headerText = "EVENT INVITATION",
        // We handle bodyText construction dynamically below if not provided
        whenLabel = "WHEN",
        whereLabel = "WHERE",
        buttonText = "Accept Invitation",
        expiryText = "This invitation expires in 7 days. If the button doesn't work, copy and paste this link:"
    } = params;

    // Construct default body text if not provided, allowing for partial dynamic injection
    // Note: A true dynamic system might pass the full string with placeholders, but for now we keep the structure.

    // Generate Branding Footer
    const footerHtml = renderBrandingFooter(INVITE_THEME);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Event Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a0a0f;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(108,92,231,0.15);">

<!-- Header Gradient -->
<tr>
<td style="background:linear-gradient(135deg,#6c5ce7,#a855f7,#6366f1);padding:32px 32px 24px;text-align:center;">
    <div style="font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:8px;">${escapeHtml(headerText)}</div>
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(eventTitle)}</h1>
</td>
</tr>

<!-- Body -->
<tr>
<td style="background-color:#12121a;padding:32px;">

    <p style="margin:0 0 24px;font-size:16px;color:#c8c8d0;line-height:1.6;">
        <strong style="color:#ffffff;">${escapeHtml(inviterName)}</strong> has invited you to join an event as <strong style="color:#a855f7;">${escapeHtml(role)}</strong>.
    </p>

    <!-- Event Details Card -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#1a1a2e;border-radius:12px;border-left:4px solid #6c5ce7;margin-bottom:28px;">
    <tr><td style="padding:20px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding-bottom:12px;">
                <div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#8888a0;margin-bottom:4px;">${escapeHtml(whenLabel)}</div>
                <div style="font-size:15px;color:#ffffff;">${escapeHtml(eventTime)}</div>
            </td>
        </tr>
        ${eventLocation ? `<tr>
            <td>
                <div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#8888a0;margin-bottom:4px;">${escapeHtml(whereLabel)}</div>
                <div style="font-size:15px;color:#ffffff;">${escapeHtml(eventLocation)}</div>
            </td>
        </tr>` : ''}
        </table>
    </td></tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center">
        <a href="${escapeHtml(inviteLink)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6c5ce7,#a855f7);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(108,92,231,0.3);">
            ${escapeHtml(buttonText)}
        </a>
    </td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:#6b6b80;line-height:1.6;text-align:center;">
        ${escapeHtml(expiryText)}<br>
        <a href="${escapeHtml(inviteLink)}" style="color:#a855f7;word-break:break-all;">${escapeHtml(inviteLink)}</a>
    </p>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:#0d0d15; border-top:1px solid #1e1e30;">
    ${footerHtml}
</td>
</tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
