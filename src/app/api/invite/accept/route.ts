import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const TOKEN_INVITES_COL = 'tokenInvites';
const EVENTS_COL = 'events';
const PARTICIPANTS_COL = 'participants';

const acceptSchema = z.object({
    token: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = acceptSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        const { token } = validation.data;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await adminDb.runTransaction(async (t: FirebaseFirestore.Transaction) => {
            const inviteQuery = adminDb.collection(TOKEN_INVITES_COL)
                .where('tokenHash', '==', tokenHash)
                .limit(1);

            const snap = await t.get(inviteQuery);

            if (snap.empty) {
                return { status: 'invalid' };
            }

            const doc = snap.docs[0];
            const invite = doc.data();
            const inviteRef = adminDb.collection(TOKEN_INVITES_COL).doc(doc.id);

            if (invite.status === 'accepted') {
                return { status: 'already_accepted', eventId: invite.eventId };
            }

            const expiresAt = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);
            if (expiresAt < new Date()) {
                t.update(inviteRef, {
                    status: 'expired',
                    updatedAt: FieldValue.serverTimestamp()
                });
                return { status: 'expired' };
            }

            // Valid invite. Let's add them to the actual participants subcollection
            t.update(inviteRef, {
                status: 'accepted',
                acceptedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            const eventRef = adminDb.collection(EVENTS_COL).doc(invite.eventId);
            t.update(eventRef, {
                participantCount: FieldValue.increment(1)
            });

            // Crucial specific relational addition: strictly tied to event
            const participantRef = eventRef.collection(PARTICIPANTS_COL).doc();

            t.set(participantRef, {
                email: invite.inviteeEmail,
                displayName: invite.inviteeEmail.split('@')[0],
                role: invite.role || 'viewer',
                addedAt: FieldValue.serverTimestamp(),
                status: 'accepted',
                inviteId: doc.id
            });

            return { status: 'success', eventId: invite.eventId, eventTitle: invite.eventTitle };
        });

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error('Invite Accept Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
