import 'server-only';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const TOKEN_INVITES_COL = 'tokenInvites';
const INVITE_LOGS_COL = 'inviteExecutionLogs';
const BATCH_SIZE = 100; // Firestore batch limit is 500, keep conservative

/**
 * Layer 2: Batch sweep API
 * Finds all expired or accepted tokenInvites and performs full relational cleanup.
 * Can be called periodically as a health check or triggered on demand.
 */
export async function POST() {
    const startTime = Date.now();
    let cleaned = 0;
    let errors = 0;

    try {
        const now = new Date();

        // Query expired invites (expiresAt < now AND status not already cleaned)
        const expiredSnap = await adminDb.collection(TOKEN_INVITES_COL)
            .where('expiresAt', '<', now)
            .limit(BATCH_SIZE)
            .get();

        // Query accepted invites (already consumed)
        const acceptedSnap = await adminDb.collection(TOKEN_INVITES_COL)
            .where('status', '==', 'accepted')
            .limit(BATCH_SIZE)
            .get();

        // Combine and deduplicate
        const docMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        expiredSnap.docs.forEach((d) => docMap.set(d.id, d));
        acceptedSnap.docs.forEach((d) => docMap.set(d.id, d));

        if (docMap.size === 0) {
            return NextResponse.json({
                success: true,
                cleaned: 0,
                message: 'No stale invites found',
                durationMs: Date.now() - startTime,
            });
        }

        // Process each invite
        for (const [inviteId, docSnap] of docMap) {
            try {
                const data = docSnap.data();
                const batch = adminDb.batch();

                // 1. Delete execution logs
                const logsSnap = await adminDb.collection(INVITE_LOGS_COL)
                    .where('inviteId', '==', inviteId)
                    .get();
                logsSnap.docs.forEach((log) => batch.delete(log.ref));

                // 2. Delete in-app invitation if exists
                if (data?.eventId && data?.inviteeEmail) {
                    const inAppSnap = await adminDb.collection('invitations')
                        .where('eventId', '==', data.eventId)
                        .where('toEmail', '==', data.inviteeEmail)
                        .limit(1)
                        .get();
                    inAppSnap.docs.forEach((inv) => batch.delete(inv.ref));
                }

                // 3. Delete the tokenInvites document itself
                batch.delete(docSnap.ref);

                await batch.commit();
                cleaned++;
            } catch (err) {
                errors++;
                console.warn(`[InviteCleanup] Failed to clean ${inviteId}:`, err);
            }
        }

        // Log the sweep
        try {
            await adminDb.collection(INVITE_LOGS_COL).add({
                inviteId: 'BATCH_SWEEP',
                action: 'CLEANUP_SWEEP',
                timestamp: FieldValue.serverTimestamp(),
                metadata: { cleaned, errors, total: docMap.size },
            });
        } catch { /* best effort */ }

        return NextResponse.json({
            success: true,
            cleaned,
            errors,
            total: docMap.size,
            durationMs: Date.now() - startTime,
        });

    } catch (error) {
        console.error('[InviteCleanup] Sweep error:', error);
        return NextResponse.json(
            { error: 'Cleanup sweep failed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
