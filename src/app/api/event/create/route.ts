import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { SmartSender } from '@/lib/server/engine/smartSender';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const EVENTS_COL = 'events';
const PARTICIPANTS_COL = 'participants';
const TOKEN_INVITES_COL = 'tokenInvites';
const USERS_COL = 'users';

const createEventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    inviteEmails: z.array(z.string().email()).optional().default([]),
});

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let uid, userEmail, userName;
        try {
            const decoded = await adminAuth.verifyIdToken(idToken);
            uid = decoded.uid;
            userEmail = decoded.email || '';
            userName = decoded.name || 'Organizer';

            if (userEmail !== 'gauravpatil9262@gmail.com') {
                return NextResponse.json({ error: 'Forbidden User' }, { status: 403 });
            }
        } catch {
            return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
        }

        const body = await req.json();
        const validation = createEventSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation Error', details: validation.error.format() }, { status: 400 });
        }

        const { title, description, location, startTime, endTime, inviteEmails } = validation.data;
        const start = new Date(startTime);
        const end = new Date(endTime);

        const eventId = adminDb.collection(EVENTS_COL).doc().id;
        const invitesToSend: { email: string; token: string; inviteId: string }[] = [];

        await adminDb.runTransaction(async (t: FirebaseFirestore.Transaction) => {
            const eventRef = adminDb.collection(EVENTS_COL).doc(eventId);
            t.set(eventRef, {
                title,
                description: description || '',
                location: location || '',
                startTime: Timestamp.fromDate(start),
                endTime: Timestamp.fromDate(end),
                createdBy: uid,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                status: 'active',
                participantCount: 1,
                inviteCount: inviteEmails.length,
            });

            // Owner is an accepted participant
            const ownerRef = eventRef.collection(PARTICIPANTS_COL).doc();
            t.set(ownerRef, {
                userId: uid,
                email: userEmail,
                displayName: userName,
                role: 'owner',
                addedAt: FieldValue.serverTimestamp(),
                status: 'accepted'
            });

            // Process Invites 
            const uniqueEmails = [...new Set(inviteEmails)].filter(e => e !== userEmail);
            for (const email of uniqueEmails) {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                const inviteId = adminDb.collection(TOKEN_INVITES_COL).doc().id;

                invitesToSend.push({ email, token: rawToken, inviteId });

                const inviteRef = adminDb.collection(TOKEN_INVITES_COL).doc(inviteId);
                const expiry = new Date();
                expiry.setHours(expiry.getHours() + 10); // 10 hr expiry

                t.set(inviteRef, {
                    tokenHash,
                    eventId,
                    eventTitle: title,
                    inviterId: uid,
                    inviterName: userName,
                    inviterEmail: userEmail,
                    inviteeEmail: email,
                    role: 'viewer',
                    status: 'pending',
                    createdAt: FieldValue.serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiry)
                });
            }

            // Usage increment
            const dateStr = new Date().toISOString().split('T')[0];
            const usageRef = adminDb.collection(USERS_COL).doc(uid).collection('usage').doc(dateStr);
            t.set(usageRef, {
                eventCount: FieldValue.increment(1),
                lastActive: FieldValue.serverTimestamp()
            }, { merge: true });
        });

        // Dispatch emails async using the SmartSender
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        Promise.all(invitesToSend.map(async (inv) => {
            const inviteUrl = `${appUrl}/invite/${inv.token}`;
            try {
                const result = await SmartSender.send({
                    toEmail: inv.email,
                    subject: `Invitation: ${title}`,
                    templateParams: {
                        event_title: title,
                        inviter_name: userName,
                        invite_url: inviteUrl
                    }
                });
                if (result.success) {
                    await adminDb.collection(TOKEN_INVITES_COL).doc(inv.inviteId).update({
                        status: 'email_sent',
                        emailSentAt: FieldValue.serverTimestamp(),
                        lastProvider: result.providerId
                    });
                }
            } catch {
                await adminDb.collection(TOKEN_INVITES_COL).doc(inv.inviteId).update({
                    status: 'email_failed'
                });
            }
        })).catch(console.error);

        return NextResponse.json({ success: true, eventId, message: "Event created successfully" });

    } catch (error: unknown) {
        console.error('Event Creation Error:', error);
        const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
