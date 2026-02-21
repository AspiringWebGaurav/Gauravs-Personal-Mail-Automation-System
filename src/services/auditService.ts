import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
// import { trackWrite } from '@/lib/burnTracker'; // Optional: decide if audit logs count towards burn

export interface MailAuditLog {
    id?: string;
    timestamp: Timestamp | Date;
    action: 'CREATE' | 'DELETE' | 'RETRY' | 'PROCESS_START' | 'SEND_SUCCESS' | 'SEND_FAILURE' | 'HALT_BLOCK' | 'CLAIM' | 'SYSTEM_HALT_TOGGLE' | 'INVITE' | 'SIMULATION_TOGGLE' | 'CREATED';
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'HALTED' | 'DELETED' | 'RETRY_INITIATED' | 'SIMULATION_ON' | 'SIMULATION_OFF';

    // Core Identifiers
    reminderId?: string; // The ID of the ScheduledReminder doc
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
}

const AUDIT_COL = 'mailAuditLogs';

/**
 * Logs a financial-grade audit entry for any mail subsystem action.
 * Fire-and-forget by default to not block main thread, but returns promise if needed.
 */
export async function logMailAction(entry: Omit<MailAuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, AUDIT_COL), {
            ...entry,
            timestamp: serverTimestamp(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-Worker',
        });
        // trackWrite(); // Uncomment if tracking burn
        return docRef.id;
    } catch (error) {
        console.error('[AuditService] FAILED TO LOG:', error, entry);
        // In a real financial system, we might want to halt here if we can't log.
        // For now, we just error to console to avoid crashing the app flow.
        return '';
    }
}
