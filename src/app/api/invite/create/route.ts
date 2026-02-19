import 'server-only';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { logInviteAction } from '@/lib/server/audit-logger';
import { sendInviteEmail } from '@/lib/server/email';
import { cleanupLazy } from '@/lib/server/cleanup';
import { apiWrapper, AppError } from '@/lib/api-framework';
import { rateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ── Constants ──
const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 10;
const MAX_INVITES_PER_EVENT = 50;
const MAX_INVITES_PER_DAY = 100;
const TOKEN_INVITES_COL = 'tokenInvites';

// ── Main Handler ──
export const POST = (req: NextRequest) => apiWrapper(async () => {
    // 1. Auth verification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED', 'Missing auth token', 401);
    }

    // 1b. Checking IP Rate Limit (DDoS Protection)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = await rateLimit(`ip_${ip}_create_invite`, 10, 60); // 10/min

    if (!limitResult.success) {
        throw new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, { retryAfter: Math.ceil((limitResult.reset - Date.now()) / 1000) });
    }

    let uid: string;
    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
    } catch (error) {
        throw new AppError('UNAUTHORIZED', 'Invalid auth token', 401, error);
    }

    // 2. Parse and Validate body (Zod)
    const body = await req.json();

    const inviteSchema = z.object({
        eventId: z.string().min(1),
        eventTitle: z.string().min(1),
        inviteeEmail: z.string().email(),
        role: z.enum(['viewer', 'editor', 'admin', 'guest']).optional(),
        inviterName: z.string().optional(),
        inviterEmail: z.string().email().optional(),
        eventTime: z.string().optional(),
        eventLocation: z.string().optional(),
    });

    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
        throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, validation.error.format());
    }

    const { eventId, eventTitle, inviteeEmail, role, inviterName, inviterEmail, eventTime, eventLocation } = validation.data;

    // 3. Rate limiting checks (Cost Optimized - Firestore Read)
    const today = new Date().toISOString().split('T')[0];
    const usageRef = adminDb.collection('users').doc(uid).collection('usage').doc(today);
    const usageSnap = await usageRef.get();
    const usageData = usageSnap.data() || {};

    const dailyInviteCount = usageData.inviteCount || 0;

    if (dailyInviteCount >= MAX_INVITES_PER_DAY) {
        throw new AppError('QUOTA_EXCEEDED', `Daily invite limit (${MAX_INVITES_PER_DAY}) reached`, 429);
    }

    // Event-level limit
    const eventRef = adminDb.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();
    const eventData = eventSnap.data();

    const eventInviteCount = eventData?.inviteCount || 0;

    if (eventInviteCount >= MAX_INVITES_PER_EVENT) {
        throw new AppError('QUOTA_EXCEEDED', `Maximum ${MAX_INVITES_PER_EVENT} invites per event`, 429);
    }

    // 4. Generate secure token
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const inviteDocId = adminDb.collection(TOKEN_INVITES_COL).doc().id;

    // 6. Atomic invite creation via transaction
    try {
        await adminDb.runTransaction(async (t) => {
            // Idempotency: Efficient check via Query
            const existingQuery = adminDb.collection(TOKEN_INVITES_COL)
                .where('eventId', '==', eventId)
                .where('inviteeEmail', '==', inviteeEmail)
                .where('status', 'in', ['pending', 'email_sent', 'email_failed'])
                .limit(1);

            const existingSnap = await t.get(existingQuery);

            if (!existingSnap.empty) {
                const existingDoc = existingSnap.docs[0];
                const data = existingDoc.data();
                const now = new Date();
                // Handle different Timestamp formats if needed, usually toDate() works on backend sdk
                const expiresAt = data.expiresAt.toDate();

                if (expiresAt > now) {
                    throw new AppError('DUPLICATE_INVITE', 'An active invitation already exists for this email', 409);
                }
            }

            // Update usage counters
            t.update(eventRef, {
                inviteCount: FieldValue.increment(1)
            });

            t.set(usageRef, {
                inviteCount: FieldValue.increment(1),
                lastInviteAt: FieldValue.serverTimestamp()
            }, { merge: true });

            const expiresAt = new Date();
            expiresAt.setTime(expiresAt.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

            const docRef = adminDb.collection(TOKEN_INVITES_COL).doc(inviteDocId);
            t.set(docRef, {
                tokenHash,
                eventId,
                eventTitle,
                inviterId: uid,
                inviterName: inviterName || 'Organizer',
                inviterEmail: inviterEmail || '',
                inviteeEmail,
                role: role || 'viewer',
                status: 'pending',
                createdAt: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
                eventTime: eventTime || null,
                eventLocation: eventLocation || null,
                metadata: {
                    apiVersion: '2.0',
                    clientIp: ip
                },
                version: 2,
                providerAttemptCount: 0,
                emailSentAt: null,
                acceptedAt: null,
                acceptedByUid: null,
                updatedAt: FieldValue.serverTimestamp(),
            });

            return inviteDocId;
        });
    } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.message.includes('DUPLICATE_INVITE')) {
            throw new AppError('DUPLICATE_INVITE', 'An active invitation already exists for this email', 409);
        }
        throw new AppError('DB_ERROR', 'Failed to create invite transaction', 500, err);
    }

    // 7. Audit Log
    await logInviteAction({
        inviteId: inviteDocId,
        action: 'CREATED',
        performedBy: uid,
        details: { inviteeEmail, eventId }
    });

    // 8. Send Email
    let emailStatus = 'sent';
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const inviteUrl = `${baseUrl}/invite/${rawToken}`;

        const emailResult = await sendInviteEmail({
            toEmail: inviteeEmail,
            inviteUrl: inviteUrl,
            eventName: eventTitle,
            inviterName: inviterName || 'Organizer',
            eventDate: eventTime || 'TBD',
            location: eventLocation || 'TBD'
        });

        if (!emailResult.success) {
            emailStatus = 'email_failed';
        }

        await adminDb.collection(TOKEN_INVITES_COL).doc(inviteDocId).update({
            status: emailStatus === 'sent' ? 'email_sent' : 'email_failed',
            emailSentAt: emailStatus === 'sent' ? FieldValue.serverTimestamp() : null,
            updatedAt: FieldValue.serverTimestamp(),
            lastProvider: emailResult.provider
        }).catch(e => logger.error('Failed to update invite status', e));

    } catch (emailErr) {
        emailStatus = 'email_failed';
        logger.error('Email sending exception', { error: emailErr });
    }

    // 9. Lazy Cleanup
    // 9. Lazy Cleanup
    cleanupLazy(0.05);

    return {
        success: true,
        inviteId: inviteDocId,
        emailStatus,
        message: emailStatus === 'sent' ? 'Invite sent successfully' : 'Invite created but email failed'
    };
});
