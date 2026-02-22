import { EmailThemeColors } from '../emailTemplateRenderer';

export function renderBrandingFooter(theme: EmailThemeColors, baseUrl: string = 'https://gaurav-mail-sheduling-system.vercel.app'): string {
    const year = new Date().getFullYear();
    const { textColor } = theme;
    // Auto-adjust footer color based on text color (opacity 0.6)
    const footerTextColor = textColor;

    // Minimal/Thin Footer (With Legal Links)
    return `
    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
        <p style="margin: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; color: ${footerTextColor}; opacity: 0.5;">
            <a href="${baseUrl}/terms" style="color:${footerTextColor};text-decoration:none;">Terms</a> &bull;
            <a href="${baseUrl}/privacy" style="color:${footerTextColor};text-decoration:none;">Privacy</a> &bull;
            <a href="${baseUrl}/license" style="color:${footerTextColor};text-decoration:none;">License</a>
            <span style="margin:0 8px;opacity:0.3">|</span>
            <span style="opacity:0.8;">&copy; ${year} GPMAS</span>
        </p>
    </div>
    `;
}
