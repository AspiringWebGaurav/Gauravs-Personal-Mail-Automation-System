import 'server-only';
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { apiWrapper, AppError } from '@/lib/api-framework';
import { rateLimit } from '@/lib/rate-limiter';
import { logInviteAction } from '@/lib/server/audit-logger';
import { cleanupInviteData, cleanupLazy } from '@/lib/server/cleanup';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TOKEN_INVITES_COL = 'tokenInvites';

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export const POST = (
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) => apiWrapper(async () => {
    const { token } = await params;

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = await rateLimit(`ip_${ip}_accept_invite`, 20, 60);

    if (!limitResult.success) {
        throw new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, { retryAfter: Math.ceil((limitResult.reset - Date.now()) / 1000) });
    }

    if (!token || token.length < 32) {
        throw new AppError('VALIDATION_ERROR', 'Invalid token', 400);
    }

    const tokenHash = hashToken(token);

    const result = await adminDb.runTransaction(async (t) => {
        const inviteQuery = adminDb.collection(TOKEN_INVITES_COL)
            .where('tokenHash', '==', tokenHash)
            .limit(1);
        const snap = await t.get(inviteQuery);

        if (snap.empty) {
            return { status: 'invalid' as const };
        }

        const doc = snap.docs[0];
        const data = doc.data();
        const docRef = adminDb.collection(TOKEN_INVITES_COL).doc(doc.id);

        if (data.status === 'accepted') {
            return {
                status: 'already_accepted' as const,
                inviteId: doc.id,
                eventTitle: data.eventTitle,
            };
        }

        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) {
            t.update(docRef, {
                status: 'expired',
                updatedAt: FieldValue.serverTimestamp(),
                version: (data.version || 1) + 1,
            });
            return { status: 'expired' as const, inviteId: doc.id };
        }

        if (data.status !== 'pending' && data.status !== 'email_sent') {
            return {
                status: 'invalid_state' as const,
                inviteId: doc.id,
                currentStatus: data.status,
            };
        }

        const eventRef = adminDb.collection('events').doc(data.eventId);
        const eventSnap = await t.get(eventRef);
        const eventData = eventSnap.data();

        if (!eventSnap.exists || !eventData) {
            logger.warn(`[InviteAccept] Event ${data.eventId} not found for invite ${doc.id}`);
        }

        let inheritedTemplate = 'sys_template_prof_reminder';
        let inheritedTheme = 'sys_theme_modern_blue';
        try {
            const reminderQuery = adminDb.collection('scheduledReminders')
                .where('eventId', '==', data.eventId)
                .orderBy('createdAt', 'asc')
                .limit(1);
            const reminderSnap = await t.get(reminderQuery);

            if (!reminderSnap.empty) {
                const rData = reminderSnap.docs[0].data();
                if (rData.templateId) inheritedTemplate = rData.templateId;
                if (rData.themeId) inheritedTheme = rData.themeId;
            }
        } catch (err) {
            logger.warn('[InviteAccept] Failed to fetch inheritance branding in transaction', { error: err });
        }

        t.update(docRef, {
            status: 'accepted',
            acceptedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            version: (data.version || 1) + 1,
        });

        t.update(eventRef, {
            participantCount: FieldValue.increment(1)
        });

        const participantRef = adminDb
            .collection('events')
            .doc(data.eventId)
            .collection('participants')
            .doc();

        const newParticipantId = participantRef.id;
        const reminderOffset = 30;
        const reminderBase = 'start';

        t.set(participantRef, {
            userId: '',
            email: data.inviteeEmail,
            displayName: data.inviteeEmail.split('@')[0],
            role: data.role || 'viewer',
            reminderEnabled: true,
            reminderOffset,
            reminderBase,
            templateId: inheritedTemplate,
            themeId: inheritedTheme,
            addedAt: FieldValue.serverTimestamp(),
            addedVia: 'invite_link',
            inviteId: doc.id,
        });

        if (eventData && eventData.startTime) {
            let val = eventData.startTime;
            const startTime = (val && typeof val.toDate === 'function') ? val.toDate() : new Date(val);
            const scheduledTime = new Date(startTime.getTime() - reminderOffset * 60 * 1000);

            if (scheduledTime > new Date()) {
                const reminderId = `rem_${data.eventId}_${newParticipantId}_auto`;
                const reminderRef = adminDb.collection('scheduledReminders').doc(reminderId);

                t.set(reminderRef, {
                    eventId: data.eventId,
                    eventTitle: data.eventTitle || eventData.title || 'Event',
                    participantId: newParticipantId,
                    userId: 'system',
                    email: data.inviteeEmail,
                    scheduledTime: scheduledTime,
                    status: 'pending',
                    attempts: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    createdBy: 'invite_accept',
                    idempotencyKey: `auto_invite_${doc.id}`,
                    lastAttemptAt: null,
                    failureReason: '',
                    providerUsed: '',
                    processedAt: null,
                    senderName: data.inviterName || 'GMSS User',
                    senderEmail: data.inviterEmail || '',
                    templateId: inheritedTemplate,
                    themeId: inheritedTheme,
                });
            }
        }

        if (eventData && eventData.endTime) {
            let val = eventData.endTime;
            const endTime = (val && typeof val.toDate === 'function') ? val.toDate() : new Date(val);
            const scheduledTimeEnd = endTime;

            if (scheduledTimeEnd > new Date()) {
                const reminderIdEnd = `rem_${data.eventId}_${newParticipantId}_auto_end`;
                const reminderRefEnd = adminDb.collection('scheduledReminders').doc(reminderIdEnd);

                t.set(reminderRefEnd, {
                    eventId: data.eventId,
                    eventTitle: data.eventTitle || eventData.title || 'Event',
                    participantId: newParticipantId,
                    userId: 'system',
                    email: data.inviteeEmail,
                    scheduledTime: scheduledTimeEnd,
                    status: 'pending',
                    attempts: 0,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    createdBy: 'invite_accept',
                    idempotencyKey: `auto_invite_end_${doc.id}`,
                    lastAttemptAt: null,
                    failureReason: '',
                    providerUsed: '',
                    processedAt: null,
                    senderName: data.inviterName || 'GMSS User',
                    senderEmail: data.inviterEmail || '',
                    templateId: 'sys_template_prof_followup',
                    themeId: inheritedTheme,
                    customMessage: 'Thank you for attending! We hope you found the event valuable.',
                });
            }
        }

        return {
            status: 'accepted' as const,
            inviteId: doc.id,
            eventId: data.eventId,
            eventTitle: data.eventTitle,
        };
    });

    if ('inviteId' in result && result.inviteId) {
        const actionMap: Record<string, string> = {
            accepted: 'ACCEPTED',
            already_accepted: 'REJECTED_CLAIMED',
            expired: 'REJECTED_EXPIRED',
            invalid: 'REJECTED_INVALID',
            invalid_state: 'REJECTED_INVALID',
        };

        logInviteAction({
            inviteId: result.inviteId,
            action: actionMap[result.status] || 'REJECTED_INVALID',
            metadata: { status: result.status },
        }).catch(err => logger.error('Failed to log invite action', err));
    }

    if ('inviteId' in result && result.inviteId && (result.status === 'accepted' || result.status === 'expired')) {
        cleanupInviteData(result.inviteId).catch(() => { });
    }

    // Self-Healing: 10% chance to clean up OTHER expired invites
    cleanupLazy(0.1);

    return result;
});
