import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/admin';
import { SmartSender } from '@/lib/server/engine/smartSender';

export const dynamic = 'force-dynamic';

const EVENTS_COL = 'events';
const PARTICIPANTS_COL = 'participants';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, secretKey } = body;

        // Extremely basic dev-mode check, for V1
        if (secretKey !== process.env.CRON_SECRET_KEY && process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized system execution' }, { status: 403 });
        }

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        // 1. Fetch Event
        const eventSnap = await adminDb.collection(EVENTS_COL).doc(eventId).get();
        if (!eventSnap.exists) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }
        const event = eventSnap.data()!;

        if (event.status === 'completed') {
            return NextResponse.json({ message: 'Event already executed' }, { status: 200 });
        }

        // 2. Fetch all accepted participants dynamically (Core Fix for Participant Miss Bug)
        const participantsSnap = await adminDb.collection(EVENTS_COL).doc(eventId).collection(PARTICIPANTS_COL).get();
        if (participantsSnap.empty) {
            console.warn(`[ExecuteEvent] No participants found for event ${eventId}`);
        }

        const participants = participantsSnap.docs.map(doc => doc.data());
        console.log(`[ExecuteEvent] Found ${participants.length} total participants for event ${eventId}`);

        const results: { email: string, success: boolean }[] = [];

        // 3. Dispatch Emails via Smart Sender
        for (const p of participants) {
            try {
                const sendResult = await SmartSender.send({
                    toEmail: p.email,
                    toName: p.displayName || 'Participant',
                    subject: `Event Completed: ${event.title}`,
                    message: `Thank you for attending ${event.title}. We hope you found the event valuable.`,
                    templateParams: {
                        event_title: event.title,
                        event_date: event.startTime ? new Date(event.startTime._seconds * 1000).toLocaleString() : 'TBD'
                    }
                });
                results.push({ email: p.email, success: sendResult.success });
            } catch (error) {
                console.error(`[ExecuteEvent] Failed sending to ${p.email}`, error);
                results.push({ email: p.email, success: false });
            }
        }

        // 4. Mark Event as Completed
        await adminDb.collection(EVENTS_COL).doc(eventId).update({
            status: 'completed',
            executedAt: new Date()
        });

        return NextResponse.json({ success: true, results });

    } catch (error: unknown) {
        console.error('Execute Event Error:', error);
        const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
