import { adminDb } from '@/lib/server/admin';
import { logger } from '@/lib/logger';

export async function cleanupExpiredInvites() {
    try {
        const now = new Date();
        // Delete invites expired more than 24 hours ago
        // This gives a buffer for any "just expired" checks or user confusion
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Query for old expired docs
        // We limit to 50 to ensure this operation is fast and doesn't timeout
        const snapshot = await adminDb.collection('invites')
            .where('expiresAt', '<', cutoff)
            .limit(50)
            .get();

        if (snapshot.empty) return 0;

        const batch = adminDb.batch();
        snapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        logger.info(`[Cleanup] Deleted ${snapshot.size} expired invites.`);

        return snapshot.size;
    } catch (error) {
        logger.error('[Cleanup] Failed to cleanup expired invites', { error });
        return 0;
    }
}

export async function getExpiredInviteCount() {
    try {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const snapshot = await adminDb.collection('invites')
            .where('expiresAt', '<', cutoff)
            .count()
            .get();

        return snapshot.data().count;
    } catch (error) {
        logger.error('[Cleanup] Failed to count expired invites', { error });
        return 0;
    }
}

/**
 * Complete relational cleanup for a consumed/expired invite.
 * Deletes: tokenInvites doc, execution logs, in-app invitation.
 * Best-effort — failures never propagate.
 */
export async function cleanupInviteData(inviteId: string): Promise<void> {
    try {
        const batch = adminDb.batch();
        const INVITE_LOGS_COL = 'inviteExecutionLogs';
        const TOKEN_INVITES_COL = 'invites';

        // 1. Delete execution logs for this invite
        const logsSnap = await adminDb.collection(INVITE_LOGS_COL)
            .where('inviteId', '==', inviteId)
            .get();
        logsSnap.docs.forEach((doc: any) => batch.delete(doc.ref));

        // 2. Get invite data before deletion (for in-app invitation cleanup)
        const inviteRef = adminDb.collection(TOKEN_INVITES_COL).doc(inviteId);
        const inviteSnap = await inviteRef.get();
        const inviteData = inviteSnap.data();

        // 3. Delete the tokenInvites document
        batch.delete(inviteRef);

        // 4. Delete corresponding in-app invitation if exists
        if (inviteData?.eventId && inviteData?.inviteeEmail) {
            const inAppSnap = await adminDb.collection('invitations')
                .where('eventId', '==', inviteData.eventId)
                .where('toEmail', '==', inviteData.inviteeEmail)
                .limit(1)
                .get();
            inAppSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
        }

        await batch.commit();
        logger.info(`[InviteCleanup] Cleaned invite ${inviteId}`, { logsRemoved: logsSnap.size });
    } catch (err) {
        logger.warn('[InviteCleanup] Partial or failed cleanup', { error: err });
    }
}

/**
 * Lazy Cleanup Trigger
 * "No Cron Jobs" compliant. Randomly triggers cleanup based on probability (0.0 - 1.0).
 * Fire-and-forget: does not block the request.
 */
export function cleanupLazy(probability: number = 0.1): void {
    if (Math.random() < probability) {
        // Run in background, don't await
        cleanupExpiredInvites().catch(err => {
            logger.warn('[CleanupLazy] Background cleanup failed', { error: err });
        });
    }
}
