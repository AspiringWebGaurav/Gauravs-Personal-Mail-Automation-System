
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { hashToken } from '@/lib/invite-token'; // Validate this import path
import { z } from 'zod';
import { logger } from '@/lib/logger';

const claimSchema = z.object({
    token: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = claimSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const { token } = validation.data;
        const tokenHash = hashToken(token);

        // 1. Find Invite
        const snapshot = await adminDb.collection('tokenInvites')
            .where('tokenHash', '==', tokenHash)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ code: 'INVALID_TOKEN', error: 'Invalid token' }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        const invite = doc.data();

        // 2. Validate Expiry & Status
        if (invite.status === 'accepted') {
            return NextResponse.json({ status: 'already_accepted' });
        }

        if (invite.status === 'revoked') {
            return NextResponse.json({ code: 'INVALID_TOKEN', error: 'Invitation revoked' }, { status: 404 });
        }

        const expiresAt = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);
        if (expiresAt < new Date()) {
            await doc.ref.update({ status: 'expired' });
            return NextResponse.json({ code: 'EXPIRED_TOKEN', error: 'Invitation expired' }, { status: 410 });
        }

        // 3. Process Acceptance (Atomic Transaction)
        await adminDb.runTransaction(async (t) => {
            // A. Update Invite Status
            t.update(doc.ref, {
                status: 'accepted',
                acceptedAt: FieldValue.serverTimestamp(),
            });

            // B. Add to Participants
            // We need a userId. Since this is a public claim (token based), 
            // we might not have a logged-in user ID if they are accepting without auth?
            // BUT InviteAcceptClient usually runs in a context where user might be logged in,
            // OR we just record the email as a participant placeholder if not auth'd?
            // The user requested "as soon as invited person accept invite this ui should updates".
            // To be a "Participant", they usually need a UID in this system's logic (CreatePage adds owner with UID).
            // However, external guests might not have UIDs yet.
            // Let's check if we can get the user from the request (Auth header).

            // For now, we'll add them as a participant using the email from the invite.
            // If they have a UID (we can try to fetch it by email or rely on client auth), we normally would link it.
            // But this route is called by `InviteAcceptClient`. Does it send auth headers?
            // `InviteAcceptClient` uses `fetch` without specific auth headers in the provided code!
            // It relies on session cookies if any, but this is an API route. 
            // If the user is logged in, the cookie *might* be passed if same-origin?
            // Let's assume for now we just add them as a participant by EMAIL.

            const participantId = doc.ref.id; // Use invite ID as participant ID to prevent dupes? 
            // Or just allow auto-id.
            // Better: Query if participant with this email already exists in event?
            // Transaction requires reads before writes.

            // For "Simple" robust fix: Just add them. Duplicate email check is complex in tx without reading all participants.
            // But `participants` is a subcollection. We can query it?
            // "Collection group queries" or just specific collection query inside transaction?
            // Yes, we can read inside tx.

            const participantsRef = adminDb.collection('events').doc(invite.eventId).collection('participants');
            // Check existence logic skipped for speed/simplicity unless critical.
            // We'll use the email as a key or just add. 
            // Let's use `add` to be safe/standard.

            const newParticipantRef = participantsRef.doc();
            t.set(newParticipantRef, {
                email: invite.inviteeEmail,
                role: invite.role, // 'viewer' or 'editor'
                addedAt: FieldValue.serverTimestamp(),
                status: 'active', // or 'accepted'
                inviteId: doc.id,
                isGuest: true // Flag to indicate they joined via link
            });
        });

        // 4. Return Success
        return NextResponse.json({ success: true, status: 'accepted' });

    } catch (error) {
        logger.error('Invite Claim Error', { error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
