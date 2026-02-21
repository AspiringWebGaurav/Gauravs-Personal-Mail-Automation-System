import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { z } from 'zod';

const createInviteSchema = z.object({
    eventId: z.string().min(1),
    inviteeEmail: z.string().email(),
    role: z.enum(['viewer', 'editor', 'guest']).optional(),
});

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Ensure Single User Access is enforced strictly at the API boundaries too
        if (decodedToken.email !== 'gauravpatil9262@gmail.com') {
            return NextResponse.json({ error: 'Forbidden. Access locked to owner.' }, { status: 403 });
        }

        const body = await req.json();
        const validation = createInviteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload', details: validation.error.format() }, { status: 400 });
        }

        const { eventId, inviteeEmail, role } = validation.data;

        // Verify Event
        const eventRef = adminDb.collection('events').doc(eventId);
        const eventSnap = await eventRef.get();
        if (!eventSnap.exists) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }
        const eventData = eventSnap.data()!;

        // Zero-provider guard: prevent creating invites that can never send
        const providerCheck = await adminDb.collection('emailProviders').limit(1).get();
        if (providerCheck.empty) {
            return NextResponse.json({ code: 'NO_PROVIDER_CONFIGURED', error: 'No email providers configured. Add a provider before sending invites.' }, { status: 503 });
        }

        // Generate Token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Check if an invite already exists (Atomic constraint check)
        const existingQuery = await adminDb.collection('invites')
            .where('eventId', '==', eventId)
            .where('inviteeEmail', '==', inviteeEmail)
            .where('status', 'in', ['pending', 'email_sent', 'email_failed'])
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            return NextResponse.json({ error: 'Duplicate invite. A pending invite already exists.' }, { status: 409 });
        }

        // Set Expiry (24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const inviteRef = adminDb.collection('invites').doc();

        // Batch creation: Invite + Queue Job
        const batch = adminDb.batch();

        batch.set(inviteRef, {
            tokenHash,
            eventId,
            inviteeEmail,
            role: role || 'guest',
            status: 'pending', // Will become 'email_sent' upon async queue success
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: expiresAt,
            createdBy: uid
        });

        const queueJobRef = adminDb.collection('mailQueue').doc();
        batch.set(queueJobRef, {
            jobType: 'invite',
            inviteId: inviteRef.id,
            eventId,
            toEmail: inviteeEmail,
            subject: `You're invited to ${eventData.title}`,
            // In a full implementation, we'd render this using TemplateEngine here.
            // For now, storing a base HTML layout.
            renderedHtml: `
                <h2>Invitation to ${eventData.title}</h2>
                <p>You have been invited to join this event on GPMAS.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${rawToken}">Click here to Accept</a></p>
                <p>This link expires in 24 hours.</p>
            `,
            status: 'pending',
            scheduledTime: FieldValue.serverTimestamp(),
            attempts: 0,
            maxAttempts: 3,
            createdAt: FieldValue.serverTimestamp()
        });

        await batch.commit();

        return NextResponse.json({ success: true, inviteId: inviteRef.id });
    } catch (error: any) {
        console.error('Invite Create Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
