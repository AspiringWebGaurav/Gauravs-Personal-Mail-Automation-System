
import { adminDb } from '@/lib/server/admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { logMailActionServer } from '@/lib/server/audit';
import { CircuitBreaker } from '@/lib/circuitBreaker';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ message: 'Dev mode only' }, { status: 403 });
    }

    try {
        // 0. EMERGENCY STOP CHECK
        const configSnap = await adminDb.doc('systemSettings/globalConfig').get();
        if (configSnap.exists && configSnap.data()?.emergencyStop) {
            console.warn('[DevWorker] EMERGENCY STOP ACTIVE. Skipping processing.');
            return NextResponse.json({ processed: 0, message: 'Emergency Stop Active' });
        }

        // Service ID for Circuit Breaker
        const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || process.env.EMAILJS_PROVIDER_1_SERVICE_ID || 'service_37etxg6';

        // 1. CIRCUIT BREAKER CHECK (Fail Fast)
        // Pass adminDb to ensure we can read protected systemSettings on server
        const isCircuitOpen = !(await CircuitBreaker.check(serviceId, adminDb));
        if (isCircuitOpen) {
            console.warn(`[DevWorker] Circuit Breaker OPEN for ${serviceId}. Skipping processing.`);
            // Using server-side audit log helper
            await logMailActionServer({
                action: 'HALT_BLOCK',
                status: 'FAILED',
                reminderId: 'system',
                eventId: 'system',
                recipientEmail: 'system',
                metadata: { reason: 'Circuit Breaker Open' }
            });
            return NextResponse.json({ processed: 0, message: 'Circuit Breaker Open - processing paused' });
        }

        const now = new Date();
        // 2. Fetch Candidates (Pending & Due)
        const pendingSnap = await adminDb.collection('scheduledReminders')
            .where('status', '==', 'pending')
            .where('scheduledTime', '<=', now)
            .get();

        if (pendingSnap.empty) {
            return NextResponse.json({ processed: 0, message: 'No pending reminders due', debug: { serviceId, circuit: isCircuitOpen ? 'OPEN' : 'CLOSED' } });
        }

        console.log(`[DevWorker] Found ${pendingSnap.size} candidates. ServiceID: ${serviceId}. Circuit: ${isCircuitOpen ? 'OPEN' : 'CLOSED'}`);

        let processedCount = 0;
        const results: Array<{ id: string; status: string; error?: string }> = [];

        for (const docSnap of pendingSnap.docs) {
            const reminder = docSnap.data();
            const ref = adminDb.collection('scheduledReminders').doc(docSnap.id);
            const start = Date.now();

            try {
                // 3. TRANSACTIONAL CLAIM (Prevent Duplicates)
                const claimed = await adminDb.runTransaction(async (t) => {
                    const freshDoc = await t.get(ref);
                    if (!freshDoc.exists) return null;

                    const data = freshDoc.data();
                    if (data?.status !== 'pending') return null; // Already taken

                    // Allow claiming
                    t.update(ref, {
                        status: 'processing',
                        lockedAt: FieldValue.serverTimestamp(),
                        workerId: 'dev-worker',
                        attempts: (data?.attempts || 0) + 1
                    });

                    return data;
                });

                if (!claimed) {
                    console.log(`[DevWorker] Reminder ${docSnap.id} already claimed/processed.`);
                    continue;
                }

                await logMailActionServer({
                    action: 'CLAIM',
                    status: 'PROCESSING',
                    reminderId: docSnap.id,
                    eventId: reminder.eventId,
                    eventTitle: reminder.eventTitle || '',
                    userId: reminder.userId || '',
                    recipientEmail: reminder.email,
                    recipientName: reminder.participantName || '',
                    idempotencyKey: reminder.idempotencyKey
                });

                // 4. SEND EMAIL — resolve credentials with fallback chain
                const templateId = reminder.templateId
                    || process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
                    || process.env.EMAILJS_PROVIDER_1_TEMPLATE_ID
                    || 'template_lh3q0q9';
                const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
                    || process.env.EMAILJS_PROVIDER_1_PUBLIC_KEY
                    || 'xwi6F0t3bw9NkVJHp';
                const privateKey = process.env.EMAILJS_PRIVATE_KEY
                    || process.env.EMAILJS_PROVIDER_1_PRIVATE_KEY
                    || '';

                if (!privateKey) {
                    throw new Error('EMAILJS_PRIVATE_KEY is not configured. Set EMAILJS_PRIVATE_KEY or EMAILJS_PROVIDER_1_PRIVATE_KEY in .env.local');
                }

                const emailData = {
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: publicKey,
                    accessToken: privateKey,
                    template_params: {
                        to_email: reminder.email,
                        to_name: reminder.participantName || 'Participant',
                        event_title: reminder.eventTitle || 'Event',
                        message: reminder.customMessage || "You have a reminder!",
                        reply_to: reminder.senderEmail,
                        from_name: reminder.senderName,
                    }
                };

                const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailData)
                });

                const duration = Date.now() - start;

                if (response.ok) {
                    // SUCCESS
                    await CircuitBreaker.onSuccess(serviceId, adminDb);

                    await ref.update({
                        status: 'sent',
                        processedAt: FieldValue.serverTimestamp(),
                        sentAt: FieldValue.serverTimestamp(),
                        providerUsed: serviceId,
                    });

                    // Atomically increment per-provider daily usage counter
                    const today = new Date().toISOString().split('T')[0];
                    const usageRef = adminDb.collection('providerUsage').doc(serviceId);
                    await adminDb.runTransaction(async (t) => {
                        const usageSnap = await t.get(usageRef);
                        const data = usageSnap.data();
                        if (data?.date === today) {
                            t.update(usageRef, { usedToday: FieldValue.increment(1) });
                        } else {
                            // New day or first use — reset counter
                            t.set(usageRef, { usedToday: 1, date: today, providerId: serviceId }, { merge: false });
                        }
                    });

                    await logMailActionServer({
                        action: 'SEND_SUCCESS',
                        status: 'SENT',
                        reminderId: docSnap.id,
                        eventId: reminder.eventId,
                        eventTitle: reminder.eventTitle || '',
                        userId: reminder.userId || '',
                        recipientEmail: reminder.email,
                        recipientName: reminder.participantName || '',
                        provider: 'emailjs',
                        durationMs: duration,
                        idempotencyKey: reminder.idempotencyKey
                    });

                    processedCount++;
                    results.push({ id: docSnap.id, status: 'sent' });
                } else {
                    // FAIL
                    const errorText = await response.text();
                    await CircuitBreaker.onFailure(serviceId, adminDb);
                    throw new Error(`EmailJS Error: ${errorText}`);
                }

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`[DevWorker] Failed to process ${docSnap.id}:`, err);
                const duration = Date.now() - start;

                await ref.update({
                    status: 'failed',
                    lastError: errorMessage,
                    failedAt: FieldValue.serverTimestamp(),
                    providerUsed: serviceId,
                });

                await logMailActionServer({
                    action: 'SEND_FAILURE',
                    status: 'FAILED',
                    reminderId: docSnap.id,
                    eventId: reminder.eventId,
                    eventTitle: reminder.eventTitle || '',
                    userId: reminder.userId || '',
                    recipientEmail: reminder.email,
                    recipientName: reminder.participantName || '',
                    errorMessage: errorMessage,
                    durationMs: duration,
                    idempotencyKey: reminder.idempotencyKey
                });

                results.push({ id: docSnap.id, status: 'failed', error: errorMessage });
            }
        }

        return NextResponse.json({ processed: processedCount, results });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[DevWorker] Critical Error:', error);
        return NextResponse.json({ error: 'Internal Worker Error', details: errorMessage }, { status: 500 });
    }
}
