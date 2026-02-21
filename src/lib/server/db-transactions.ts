import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateEventParams {
    title: string;
    description?: string;
    eventTime: string;
    location?: string;
    ownerId: string;
}

export interface ClaimInviteParams {
    tokenHash: string;
    userEmail: string;
}

export const DBTransactions = {
    /**
     * Creates an Event and automatically adds the owner as the first participant.
     */
    async createEvent(params: CreateEventParams) {
        return adminDb.runTransaction(async (t) => {
            const eventRef = adminDb.collection('events').doc();
            const participantRef = eventRef.collection('participants').doc(params.ownerId);

            t.set(eventRef, {
                title: params.title,
                description: params.description || '',
                eventTime: params.eventTime,
                location: params.location || '',
                ownerId: params.ownerId,
                createdAt: FieldValue.serverTimestamp(),
            });

            t.set(participantRef, {
                userId: params.ownerId,
                role: 'owner',
                joinedAt: FieldValue.serverTimestamp(),
            });

            return eventRef.id;
        });
    },

    /**
     * Atomically deletes an event and heavily prevents orphaned data types.
     * Note: Deleting a document does not delete its subcollections in Firestore.
     * This transaction deletes the event, its participants, its invites, and its mailQueue jobs.
     */
    async deleteEvent(eventId: string) {
        // Run reads outside or inside? Batch deletes can be up to 500 operations.
        // For safety and strict consistency, we collect REFS first.
        // Firestore transactions require reads before writes.

        return adminDb.runTransaction(async (t) => {
            const eventRef = adminDb.collection('events').doc(eventId);
            const eventSnap = await t.get(eventRef);

            if (!eventSnap.exists) {
                throw new Error('Event not found.');
            }

            // Read Participants
            const participantsSnap = await t.get(eventRef.collection('participants'));

            // Read Invites
            const invitesSnap = await t.get(
                adminDb.collection('invites').where('eventId', '==', eventId)
            );

            // Read MailQueue jobs related to this event
            const mailQueueSnap = await t.get(
                adminDb.collection('mailQueue').where('eventId', '==', eventId)
            );

            // IMPORTANT restriction: Transactions have a max of 500 document writes.
            // Assuming for a personal automation system we won't hit 500 per event.
            // If it exceeds, a batch processor in a background function is needed. For V1 we stay within 500.
            const totalWrites = 1 + participantsSnap.docs.length + invitesSnap.docs.length + mailQueueSnap.docs.length;
            if (totalWrites > 500) {
                throw new Error("Event too large to delete in a single transaction (max 500). Please manually prune data first.");
            }

            // Perform Deletes
            t.delete(eventRef);
            participantsSnap.docs.forEach(doc => t.delete(doc.ref));
            invitesSnap.docs.forEach(doc => t.delete(doc.ref));
            mailQueueSnap.docs.forEach(doc => t.delete(doc.ref));

            return { success: true, deletedCount: totalWrites };
        });
    },

    /**
     * Strictly atomic claim to fix race-conditions.
     * Reads the invite inside the transaction, validates status, marks accepted, adds participant.
     */
    async claimInvite(params: ClaimInviteParams) {
        return adminDb.runTransaction(async (t) => {
            // Find invite by token Hash
            const invitesSnap = await t.get(
                adminDb.collection('invites').where('tokenHash', '==', params.tokenHash).limit(1)
            );

            if (invitesSnap.empty) {
                throw new Error('INVALID_TOKEN');
            }

            const inviteDoc = invitesSnap.docs[0];
            const inviteData = inviteDoc.data();

            if (inviteData.status === 'accepted') {
                throw new Error('ALREADY_ACCEPTED');
            }
            if (inviteData.status === 'revoked') {
                throw new Error('REVOKED');
            }

            // Validate Expiry
            const expiresAt = inviteData.expiresAt.toDate();
            if (expiresAt < new Date()) {
                t.update(inviteDoc.ref, { status: 'expired' });
                throw new Error('EXPIRED');
            }

            const eventId = inviteData.eventId;

            // Check if user is already a participant (idempotency safety)
            const eventRef = adminDb.collection('events').doc(eventId);
            const participantQuery = await t.get(
                eventRef.collection('participants').where('email', '==', params.userEmail).limit(1)
            );

            if (!participantQuery.empty) {
                // They are already in, just update invite status and succeed
                t.update(inviteDoc.ref, {
                    status: 'accepted',
                    acceptedAt: FieldValue.serverTimestamp(),
                    acceptedByEmail: params.userEmail
                });
                return { success: true, eventId, existing: true };
            }

            // Add new participant
            const newParticipantRef = eventRef.collection('participants').doc();
            t.set(newParticipantRef, {
                email: params.userEmail,
                role: inviteData.role || 'viewer',
                joinedAt: FieldValue.serverTimestamp(),
                inviteId: inviteDoc.id
            });

            // Mark invite accepted
            t.update(inviteDoc.ref, {
                status: 'accepted',
                acceptedAt: FieldValue.serverTimestamp(),
                acceptedByEmail: params.userEmail
            });

            return { success: true, eventId, existing: false };
        });
    }
};
