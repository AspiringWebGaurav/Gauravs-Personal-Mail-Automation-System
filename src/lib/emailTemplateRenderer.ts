/**
 * GMSS Email Template Renderer
 * Generates complete HTML email strings for 4 layout types.
 * Used both client-side (preview) and server-side (Cloud Functions).
 */

import { renderBrandingFooter } from './emailSystem/brandingFooter';

export interface EmailTemplateData {
  eventTitle: string;
  eventTime: string;
  eventLocation?: string;
  message?: string;
  recipientName?: string;
  // Dynamic Labels
  headerText?: string;
  timeLabel?: string;
  locationLabel?: string;
  // Action Button
  actionUrl?: string;
  actionLabel?: string;
  // Dynamic Branding
  brandName?: string;
  productName?: string;
  homeUrl?: string;
}

export interface EmailThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
}

export type LayoutType = 'minimal' | 'card' | 'banner' | 'elegant';

const DEFAULT_THEME: EmailThemeColors = {
  primaryColor: '#6c5ce7',
  secondaryColor: '#00d2ff',
  backgroundColor: '#ffffff',
  textColor: '#1a1a2e',
  borderRadius: 12,
};

const DEFAULT_DATA: EmailTemplateData = {
  eventTitle: 'Team Meeting',
  eventTime: 'Today at 3:00 PM',
  eventLocation: 'Zoom Meeting Room',
  message: 'Your event is coming up! Don\'t forget to prepare.',
  recipientName: 'Gaurav',
  headerText: 'Upcoming Event',
  timeLabel: 'When',
  locationLabel: 'Where',
  brandName: 'GMSS',
  productName: 'Enterprise',
  homeUrl: 'https://gaurav-mail-sheduling-system.vercel.app',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Helper: Convert Hex to RGB for rgba() usage
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '108, 92, 231'; // Default backup
}

export interface RenderOptions {
  stripEnvelope?: boolean;
}

function wrap(body: string, bgColor: string, options?: RenderOptions): string {
  if (options?.stripEnvelope) {
    return `<div style="background-color:${bgColor};padding:20px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${body}</div>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GMSS Reminder</title>
</head>
<body style="margin:0;padding:0;background:${bgColor};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${body}
</body>
</html>`;
}

// ────────────────────────────────────────────────
// LAYOUT 1: MINIMAL
// ────────────────────────────────────────────────
function renderMinimal(data: EmailTemplateData, theme: EmailThemeColors, options?: RenderOptions): string {
  const d = { ...DEFAULT_DATA, ...data };
  const t = { ...DEFAULT_THEME, ...theme };

  const header = d.headerText || "Event Reminder";
  const timeLbl = d.timeLabel || "When";
  const locLbl = d.locationLabel || "Where";

  const body = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;padding:32px;">
  <tr><td>
    <div style="border-left:4px solid ${t.primaryColor};padding-left:20px;margin-bottom:24px;">
      <h1 style="margin:0 0 4px;font-size:22px;color:${t.textColor};font-weight:600;">📅 ${esc(d.eventTitle)}</h1>
      <p style="margin:0;font-size:14px;color:${t.textColor};opacity:0.6;">${esc(header)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:${t.textColor};opacity:0.5;width:80px;">${esc(timeLbl)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:${t.textColor};font-weight:500;">${esc(d.eventTime)}</td>
      </tr>
      ${d.eventLocation ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:${t.textColor};opacity:0.5;width:80px;">${esc(locLbl)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:${t.textColor};font-weight:500;">${esc(d.eventLocation)}</td>
      </tr>` : ''}
    </table>
    ${d.message ? `<p style="margin:0 0 24px;font-size:14px;color:${t.textColor};line-height:1.6;opacity:0.8;">${esc(d.message)}</p>` : ''}
    
    ${renderBrandingFooter(t)}
  </td></tr>
</table>`;
  return wrap(body, '#f8f9fa', options);
}

// ────────────────────────────────────────────────
// HELPER: BRANDING HEADER
// ────────────────────────────────────────────────
function renderBrandingHeader(theme: EmailThemeColors, data: EmailTemplateData): string {
  const { primaryColor, textColor } = theme;
  // We don't necessarily need RGB here unless we do transparency, but consistency is good
  const brandName = data.brandName || "GMSS";
  const productName = data.productName || "Enterprise";
  const homeUrl = data.homeUrl || "#";

  return `
  <div style="padding: 16px 24px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between;">
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 700; font-size: 18px; color: ${textColor}; letter-spacing: -0.5px;">
      ${esc(brandName)} <span style="font-weight:400;opacity:0.6;font-size:14px;">| ${esc(productName)}</span>
    </div>
    <div style="font-size: 12px; font-weight: 600;">
      <a href="${esc(homeUrl)}" style="text-decoration: none; color: ${primaryColor};">Open App &rarr;</a>
    </div>
  </div>
  `;
}

// ────────────────────────────────────────────────
// LAYOUT 2: CARD (Symmetric & Simplified)
// ────────────────────────────────────────────────
export function renderCard(data: EmailTemplateData, theme: EmailThemeColors, options?: RenderOptions): string {
  const d = { ...DEFAULT_DATA, ...data };
  const t = { ...DEFAULT_THEME, ...theme };

  const primaryRgb = hexToRgb(t.primaryColor);

  const body = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;margin:20px auto;background:#ffffff;border:1px solid #eee;border-radius:12px;">
  <!-- Branding Header (Centered) -->
  <tr><td style="padding:24px 24px 16px;text-align:center;border-bottom:1px solid #f8f9fa;">
    <span style="font-weight:700;color:${t.textColor};font-size:18px;letter-spacing:-0.5px;">${esc(d.brandName || 'GMSS')}</span>
    <span style="color:${t.textColor};opacity:0.4;font-size:14px;">| ${esc(d.productName || 'Enterprise')}</span>
  </td></tr>

  <!-- Main Content (Centered) -->
  <tr><td style="padding:32px 24px;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#888;text-transform:uppercase;font-weight:700;letter-spacing:1px;">${esc(d.headerText || 'Invitation')}</p>
    <h1 style="margin:0 0 24px;font-size:24px;color:${t.textColor};line-height:1.3;font-weight:700;">${esc(d.eventTitle)}</h1>

    <!-- PRIMARY ACTION (Centered) -->
    ${d.actionUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr><td align="center">
      <a href="${esc(d.actionUrl)}" style="display:inline-block;background:${t.primaryColor};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 4px 10px rgba(${primaryRgb}, 0.2);">${esc(d.actionLabel || 'View Details')}</a>
    </td></tr></table>
    <!-- Secondary Link Below Button -->
    <p style="margin:0 0 32px;font-size:13px;">
       <a href="${esc(d.actionUrl)}" style="color:${t.primaryColor};text-decoration:none;border-bottom:1px solid ${t.primaryColor};opacity:0.8;">Or copy link to browser</a>
    </p>` : ''}

    <div style="margin-top: 32px;"></div> <!-- Spacer -->

      <!-- Footer (Centered & Minimal) -->
      ${renderBrandingFooter(t, d.homeUrl)}

    </td></tr>
  </table>`;

  if (options?.stripEnvelope) {
    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f4f7;padding:20px;text-align:center;">${body}</div>`;
  }
  return wrap(body, '#f4f4f7');
}

// ────────────────────────────────────────────────
// LAYOUT 3: BANNER
// ────────────────────────────────────────────────
function renderBanner(data: EmailTemplateData, theme: EmailThemeColors, options?: RenderOptions): string {
  const d = { ...DEFAULT_DATA, ...data };
  const t = { ...DEFAULT_THEME, ...theme };

  const header = d.headerText || "Reminder";
  const locLbl = d.locationLabel || "Location:";

  const body = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td>
    <!-- Hero Banner -->
    <div style="background:linear-gradient(135deg,${t.primaryColor} 0%,${t.secondaryColor} 50%,${t.primaryColor} 100%);padding:48px 40px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">${esc(header)}</p>
      <h1 style="margin:0 0 12px;font-size:28px;color:#fff;font-weight:800;">${esc(d.eventTitle)}</h1>
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:20px;padding:8px 20px;">
        <span style="font-size:14px;color:#fff;font-weight:500;">${esc(d.eventTime)}</span>
      </div>
    </div>
    <!-- Content -->
    <div style="background:${t.backgroundColor};padding:32px 40px;">
      ${d.eventLocation ? `<div style="margin-bottom:16px;padding:14px 18px;background:#f8f9fa;border-radius:8px;border-left:3px solid ${t.primaryColor};">
        <p style="margin:0;font-size:13px;color:${t.textColor};"><strong>${esc(locLbl)}</strong> ${esc(d.eventLocation)}</p>
      </div>` : ''}
      ${d.message ? `<p style="margin:0 0 20px;font-size:15px;color:${t.textColor};line-height:1.7;">${esc(d.message)}</p>` : ''}
      ${d.recipientName ? `<p style="margin:0 0 8px;font-size:14px;color:${t.textColor};">Hello <strong>${esc(d.recipientName)}</strong>! 👋</p>` : ''}
    </div>
    <!-- Footer -->
    <div style="background:#f8f9fa;padding:0 40px 16px;">
      ${renderBrandingFooter(t)}
    </div>
  </td></tr>
</table>`;
  return wrap(body, '#e8e8ec', options);
}

// ────────────────────────────────────────────────
// LAYOUT 4: ELEGANT
// ────────────────────────────────────────────────
function renderElegant(data: EmailTemplateData, theme: EmailThemeColors, options?: RenderOptions): string {
  const d = { ...DEFAULT_DATA, ...data };
  const t = { ...DEFAULT_THEME, ...theme };

  const header = d.headerText || "Event Reminder";
  const timeLbl = d.timeLabel || "Date & Time";
  const locLbl = d.locationLabel || "Location";

  const body = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:40px auto;">
  <tr><td>
    <div style="background:${t.backgroundColor};border:1px solid #e0d9cf;border-radius:${t.borderRadius}px;overflow:hidden;">
      <!-- Gold Accent Bar -->
      <div style="height:4px;background:linear-gradient(90deg,${t.primaryColor},${t.secondaryColor},${t.primaryColor});"></div>
      <!-- Content -->
      <div style="padding:40px 36px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;color:${t.primaryColor};text-transform:uppercase;letter-spacing:3px;font-weight:600;">${esc(header)}</p>
        <h1 style="margin:0 0 20px;font-size:24px;color:${t.textColor};font-family:Georgia,'Times New Roman',serif;font-weight:400;font-style:italic;">${esc(d.eventTitle)}</h1>
        <div style="width:40px;height:1px;background:${t.primaryColor};margin:0 auto 20px;"></div>
        <table style="margin:0 auto 24px;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 16px;text-align:right;font-size:12px;color:${t.textColor};opacity:0.5;font-family:Georgia,serif;">${esc(timeLbl)}</td>
            <td style="padding:8px 16px;text-align:left;font-size:14px;color:${t.textColor};font-family:Georgia,serif;">${esc(d.eventTime)}</td>
          </tr>
          ${d.eventLocation ? `<tr>
            <td style="padding:8px 16px;text-align:right;font-size:12px;color:${t.textColor};opacity:0.5;font-family:Georgia,serif;">${esc(locLbl)}</td>
            <td style="padding:8px 16px;text-align:left;font-size:14px;color:${t.textColor};font-family:Georgia,serif;">${esc(d.eventLocation)}</td>
          </tr>` : ''}
        </table>
        ${d.message ? `<p style="margin:0 0 24px;font-size:14px;color:${t.textColor};line-height:1.8;font-family:Georgia,serif;opacity:0.85;">${esc(d.message)}</p>` : ''}
        ${d.recipientName ? `<p style="margin:0;font-size:14px;color:${t.textColor};font-family:Georgia,serif;">Warm regards,</p>` : ''}
      </div>
      <!-- Footer -->
      <div style="padding:0 36px 14px;background:#faf9f7;border-top:1px solid #e0d9cf;">
        ${renderBrandingFooter(t)}
      </div>
    </div>
  </td></tr>
</table>`;
  return wrap(body, '#f5f3ef', options);
}

// ── Main Export ─────────────────────────────────
export function renderEmailTemplate(
  layout: LayoutType,
  data?: Partial<EmailTemplateData>,
  theme?: Partial<EmailThemeColors>,
  options?: RenderOptions
): string {
  const d = { ...DEFAULT_DATA, ...data } as EmailTemplateData;
  const t = { ...DEFAULT_THEME, ...theme } as EmailThemeColors;

  switch (layout) {
    case 'minimal': return renderMinimal(d, t, options);
    case 'card': return renderCard(d, t, options);
    case 'banner': return renderBanner(d, t, options);
    case 'elegant': return renderElegant(d, t, options);
    default: return renderCard(d, t, options);
  }
}

export { DEFAULT_THEME, DEFAULT_DATA };
