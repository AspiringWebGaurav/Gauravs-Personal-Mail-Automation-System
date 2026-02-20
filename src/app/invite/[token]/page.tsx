import { adminDb } from '@/lib/server/admin';
import crypto from 'crypto';
import InviteClient from './InviteClient';
import { notFound } from 'next/navigation';

const TOKEN_INVITES_COL = 'tokenInvites';
const EVENTS_COL = 'events';

export default async function InvitePage({ params }: { params: { token: string } }) {
    const { token } = params;

    // Hash token to verify securely against stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const snap = await adminDb.collection(TOKEN_INVITES_COL)
        .where('tokenHash', '==', tokenHash)
        .limit(1)
        .get();

    if (snap.empty) {
        return notFound(); // Standard 404 for invalid tokens completely hides logic
    }

    const doc = snap.docs[0];
    const invite = doc.data();

    // Check generic expiration
    const expiry = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);
    const isExpired = expiry < new Date();

    // Fetch Event for rich context
    const eventSnap = await adminDb.collection(EVENTS_COL).doc(invite.eventId).get();
    const eventData = eventSnap.exists ? eventSnap.data() : null;

    let uiState = 'valid';
    if (invite.status === 'accepted') uiState = 'accepted';
    else if (invite.status === 'expired' || isExpired) uiState = 'expired';
    else if (!eventData || eventData.status === 'completed') uiState = 'event_ended';

    return (
        <InviteClient
            token={token}
            uiState={uiState as 'valid' | 'accepted' | 'expired' | 'event_ended'}
            eventTitle={invite.eventTitle}
            inviterName={invite.inviterName}
            inviteeEmail={invite.inviteeEmail}
            startTime={eventData?.startTime ? new Date(eventData.startTime._seconds * 1000).toISOString() : null}
            location={eventData?.location}
        />
    );
}
