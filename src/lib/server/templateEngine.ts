export interface TemplateData {
    // Dynamic dictionary
    [key: string]: string | undefined;
}

export const TemplateEngine = {
    /**
     * Parses a string containing placeholders like {{var_name}} and replaces them.
     */
    render(templateHtml: string, data: TemplateData): string {
        let rendered = templateHtml;

        for (const [key, value] of Object.entries(data)) {
            // Replace globally all instances of the key
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            rendered = rendered.replace(regex, value || '');
        }

        return rendered;
    },

    /**
     * Minimal pure CSS glassmorphic wrapper for all emails, ensuring 
     * the requirement of "Minimal Clean like NVIDIA style".
     * No hardcoded text, just layout logic.
     */
    wrapEnterpriseGlass(innerHtml: string): string {
        return `
            <div style="font-family: 'Inter', -apple-system, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; min-height: 100vh;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #141414; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                    <!-- Brand Header -->
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px; margin-bottom: 32px;">
                        <h1 style="font-size: 20px; font-weight: 300; letter-spacing: -0.02em; margin: 0; color: #ffffff;">GPMAS</h1>
                    </div>
                    
                    <!-- Dynamic Body -->
                    <div style="font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.8); white-space: pre-wrap;">
                        ${innerHtml}
                    </div>

                    <!-- Footer -->
                    <div style="margin-top: 48px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 24px; font-size: 12px; color: rgba(255,255,255,0.4); text-align: center;">
                        Secured by GPMAS &middot; Transactional Mail Automation
                    </div>
                </div>
            </div>
        `;
    }
};
