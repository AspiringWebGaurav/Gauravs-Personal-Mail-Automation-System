/**
 * GPMAS Email Template Renderer
 * Generates complete HTML email strings.
 * We now strictly use dynamic templates without static boilerplate.
 */


export interface EmailThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
}

const DEFAULT_THEME: EmailThemeColors = {
  primaryColor: '#6c5ce7',
  secondaryColor: '#00d2ff',
  backgroundColor: '#ffffff',
  textColor: '#1a1a2e',
  borderRadius: 12,
};

export interface RenderOptions {
  stripEnvelope?: boolean;
}

export function extractTemplateVariables(html: string): string[] {
  const regex = /\{\{([\w]+)\}\}/g;
  const matches = Array.from(html.matchAll(regex));
  return Array.from(new Set(matches.map(m => m[1])));
}

export function interpolateTemplate(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    // Replace all instances of {{key}} with value
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

function wrap(body: string, bgColor: string, options?: RenderOptions): string {
  if (options?.stripEnvelope) {
    return `<div style="background-color:${bgColor};padding:20px;font-family:'Inter',Roboto,Helvetica,Arial,sans-serif;">${body}</div>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GPMAS Reminder</title>
</head>
<body style="margin:0;padding:0;background:${bgColor};font-family:'Inter',Roboto,Helvetica,Arial,sans-serif;">
${body}
</body>
</html>`;
}

// ────────────────────────────────────────────────
// Dynamic Render
// ────────────────────────────────────────────────
export function renderEmailTemplate(
  bodyHtml: string,
  variables: Record<string, string>,
  theme?: Partial<EmailThemeColors>,
  options?: RenderOptions
): string {
  // Interpolate user variables into the body html
  // Add fallback for missing variables (replace with empty string or keep)
  const content = interpolateTemplate(bodyHtml || '', variables);

  const container = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #eaeaea;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;">
    
    <!-- Brand Header -->
    <tr><td style="padding:32px 32px 24px;background:linear-gradient(135deg, rgba(108,92,231,0.05) 0%, rgba(0,210,255,0.05) 100%);border-bottom:1px solid rgba(0,0,0,0.05);">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="left">
                    <span style="font-weight:700;color:#1a1a2e;font-size:24px;letter-spacing:-0.5px;">Gaurav Patil</span>
                </td>
                <td align="right">
                    <span style="font-size:12px;font-weight:600;color:#6c5ce7;letter-spacing:1px;text-transform:uppercase;">Communication</span>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:40px 32px;background:#ffffff;">
        <div style="font-size:15px;line-height:1.7;color:#333333;white-space:pre-wrap;">
${content}
        </div>
    </td></tr>

    <!-- Brand Footer -->
    <tr><td style="padding:32px;background:#f8f9fa;border-top:1px solid #eaeaea;text-align:center;">
        
        <div style="margin-bottom:24px;">
            <a href="https://gauravpatil.online" style="display:inline-block;margin:0 12px;color:#6c5ce7;text-decoration:none;font-size:13px;font-weight:500;">Portfolio</a>
            <span style="color:#cbd5e1;font-size:13px;">&bull;</span>
            <a href="https://gauravworkspace.site" style="display:inline-block;margin:0 12px;color:#6c5ce7;text-decoration:none;font-size:13px;font-weight:500;">Workspace</a>
        </div>
        
        <div style="font-size:12px;color:#94a3b8;line-height:1.5;">
            Sent by <strong>Gaurav's Personal Mail Automation System (GPMAS)</strong><br/>
            Engineered for elite, high-performance transactional correspondence.
        </div>
        
    </td></tr>

</table>`;

  if (options?.stripEnvelope) {
    return `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;padding:24px;min-height:100vh;">${container}</div>`;
  }
  return wrap(container, '#f1f5f9');
}

export { DEFAULT_THEME };
