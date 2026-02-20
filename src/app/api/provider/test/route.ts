import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/admin';
import { EmailProvider } from '@/types/engine';

export async function POST(request: Request) {
    const startTime = Date.now();
    let parsedProviderId = 'unknown';
    let parsedTestEmail = 'unknown';
    let parsedProviderName = 'unknown';

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Strict superadmin check
        if (decodedToken.email !== 'gauravpatil9262@gmail.com') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { providerId, testEmail } = await request.json();

        if (providerId) parsedProviderId = providerId;
        if (testEmail) parsedTestEmail = testEmail;

        if (!providerId || !testEmail) {
            return NextResponse.json({ error: 'Provider ID and Test Email are required' }, { status: 400 });
        }

        // Fetch the specific provider
        const docSnap = await adminDb.collection('emailProviders').doc(providerId).get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const provider = { id: docSnap.id, ...docSnap.data() } as EmailProvider;
        parsedProviderName = provider.name;

        // Construct a dynamic sandbox test payload
        const emailData = {
            service_id: provider.serviceId,
            template_id: provider.templateId,
            user_id: provider.publicKey,
            accessToken: provider.privateKey,
            template_params: {
                to_email: testEmail,
                to_name: 'GMSS Administrator',
                from_name: provider.fromName || 'GMSS Engine Sandbox',
                subject: 'Sandbox Diagnostics: Routing Test Successful',
                message: `This is an automated sandbox verification dispatch from GMSS V1.\n\nProvider Alias: ${provider.name}\nService ID: ${provider.serviceId}\nTimestamp: ${new Date().toISOString()}\n\nIf you are reading this, your fully dynamic EmailJS template is working perfectly without any hardcoded static text!`,
            }
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData),
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`EmailJS API Error: ${response.status} - ${errorText}`);
        }

        // --- BACKGROUND LOGGER: SANDBOX SUCCESS ---
        try {
            await adminDb.collection('sentLogs').add({
                status: 'success',
                mode: 'sandbox',
                providerId: provider.id,
                providerName: provider.name,
                recipient: { email: testEmail, name: 'GMSS Administrator' },
                eventReference: { id: 'sandbox-test', name: 'Sandbox Diagnostic Dispatch' },
                dispatchLatencyMs: Date.now() - startTime,
                timestamp: Date.now()
            });
        } catch (logErr) {
            console.error('[SentTracker] Failed to log sandbox success', logErr);
        }

        return NextResponse.json({ success: true, message: 'Sandbox email dispatched successfully!' });

    } catch (error: unknown) {
        console.error('[Provider Sandbox Error]', error);

        // --- BACKGROUND LOGGER: SANDBOX FAILURE ---
        try {
            await adminDb.collection('sentLogs').add({
                status: 'failed',
                mode: 'sandbox',
                providerId: parsedProviderId,
                providerName: parsedProviderName,
                recipient: { email: parsedTestEmail, name: 'GMSS Administrator' },
                eventReference: { id: 'sandbox-test', name: 'Sandbox Diagnostic Dispatch' },
                dispatchLatencyMs: Date.now() - startTime,
                errorPayload: error instanceof Error ? error.message : 'Unknown sandbox execution error',
                timestamp: Date.now()
            });
        } catch (logErr) {
            console.error('[SentTracker] Failed to log sandbox error', logErr);
        }

        const errMsg = error instanceof Error ? error.message : 'Internal server error during sandbox test';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
