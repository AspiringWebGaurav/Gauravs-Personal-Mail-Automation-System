import 'server-only';
import { adminDb } from '@/lib/server/admin';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

const INVITE_LOGS_COL = 'inviteExecutionLogs';

interface InviteLogData {
    inviteId: string;
    action: string;
    performedBy?: string;
    provider?: string;
    durationMs?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown> & { shouldSample?: boolean };
    details?: Record<string, unknown>;
}

export async function logInviteAction(data: InviteLogData) {
    // Cost-Safety: Periodic Sampling for high-volume logs
    // If 'shouldSample' is passed as true, we only write 10% of the time,
    // UNLESS it's an error or critical action.
    if (data.metadata?.shouldSample === true) {
        if (Math.random() > 0.1) return;
    }

    try {
        await adminDb.collection(INVITE_LOGS_COL).add({
            ...data,
            timestamp: FieldValue.serverTimestamp(),
            userAgent: 'Server-NextJS-API'
        });
    } catch (e) {
        logger.error('[InviteLog] Failed to write log', { error: e });
    }
}
