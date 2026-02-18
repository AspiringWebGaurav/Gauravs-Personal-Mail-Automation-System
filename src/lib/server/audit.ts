import 'server-only';
import { adminDb } from '@/lib/server/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { MailAuditLog } from '@/services/auditService'; // Type definition

const AUDIT_COL = 'mailAuditLogs';

export async function logMailActionServer(entry: Omit<MailAuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
        const docRef = await adminDb.collection(AUDIT_COL).add({
            ...entry,
            timestamp: FieldValue.serverTimestamp(),
            userAgent: 'Server-Worker-NextJS',
        });
        return docRef.id;
    } catch (error) {
        console.error('[AuditService-Server] FAILED TO LOG:', error, entry);
        return '';
    }
}
