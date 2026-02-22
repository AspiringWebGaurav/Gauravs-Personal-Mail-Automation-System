import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { ProviderEngine } from '@/lib/server/providerEngine';
import { renderEmailTemplate } from '@/lib/emailTemplateRenderer';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        await adminAuth.verifyIdToken(token);

        const { toEmail, subjectFormat, messageBody, variables } = await req.json();

        if (!toEmail || !subjectFormat || !messageBody || !variables) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Interpolate subject
        let finalSubject = subjectFormat;
        for (const [key, val] of Object.entries(variables as Record<string, string>)) {
            finalSubject = finalSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val as string);
        }

        // Render completely via enterprise wrapper
        const finalHtml = renderEmailTemplate(messageBody, variables);

        // Execute send
        const sendResult = await ProviderEngine.executeSend({
            toEmail,
            subject: finalSubject,
            htmlContent: finalHtml
        });

        if (!sendResult.success) {
            return NextResponse.json({ error: sendResult.error || 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, providerId: sendResult.providerId }, { status: 200 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
