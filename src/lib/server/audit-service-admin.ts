import 'server-only';
import { adminDb } from '@/lib/server/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

export interface MailAuditLog {
    id?: string;
    timestamp: Timestamp | Date | FieldValue;
    action: 'CREATE' | 'DELETE' | 'RETRY' | 'PROCESS_START' | 'SEND_SUCCESS' | 'SEND_FAILURE' | 'HALT_BLOCK' | 'CLAIM' | 'SYSTEM_HALT_TOGGLE' | 'INVITE' | 'SIMULATION_TOGGLE' | 'CREATED';
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'HALTED' | 'DELETED' | 'RETRY_INITIATED' | 'SIMULATION_ON' | 'SIMULATION_OFF';

    // Core Identifiers
    reminderId?: string; // The ID of the ScheduledReminder doc or Invite Doc
    eventId?: string;
    eventTitle?: string;

    // User Context
    userId?: string;     // Who performed the action (or system)
    userEmail?: string;

    // Recipient Context
    recipientEmail?: string;
    recipientName?: string;

    // Technical Details
    provider?: string;   // e.g., 'emailjs'
    templateId?: string;
    idempotencyKey?: string; // Critical for deduplication

    // Diagnostics
    durationMs?: number; // How long the operation took
    errorMessage?: string;
    errorCode?: string;
    retryCount?: number;
    metadata?: Record<string, unknown>;
    userAgent?: string;
}

const AUDIT_COL = 'mailAuditLogs';

/**
 * Server-side audit logger using Firebase Admin SDK.
 * Use this for API routes and backend workers.
 */
export async function logMailActionAdmin(entry: Omit<MailAuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
        const docRef = await adminDb.collection(AUDIT_COL).add({
            ...entry,
            timestamp: FieldValue.serverTimestamp(),
            userAgent: 'Server-Admin-SDK',
        });
        return docRef.id;
    } catch (error) {
        logger.error('[AuditServiceAdmin] FAILED TO LOG:', { error, entry });
        // Failsafe: Don't crash main flow
        return '';
    }
}
