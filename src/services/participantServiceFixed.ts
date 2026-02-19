import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
    query, where, orderBy, serverTimestamp, Timestamp, onSnapshot,
    type Unsubscribe, runTransaction, increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackRead, trackWrite, trackDelete } from '@/lib/burnTracker';
import { logMailAction } from '@/services/auditService';
import type { Participant } from '@/types';

function participantsCol(eventId: string) {
    return collection(db, 'events', eventId, 'participants');
}

export async function addParticipant(eventId: string, data: {
    userId: string;
    email: string;
    displayName: string;
    role: Participant['role'];
}): Promise<string> {
    const ref = await addDoc(participantsCol(eventId), {
        ...data,
        reminderEnabled: false,
        reminderOffset: 30,
        reminderBase: 'start',
        templateId: '',
        themeId: '',
        addedAt: serverTimestamp(),
    });
    trackWrite();

    // Atomic participant count — fire-and-forget, never blocks caller
    updateDoc(doc(db, 'events', eventId), { participantCount: increment(1) }).catch(() => { });

    return ref.id;
}

export async function updateParticipant(
    eventId: string,
    participantId: string,
    data: Partial<Omit<Participant, 'id'>>
): Promise<void> {
    await updateDoc(doc(db, 'events', eventId, 'participants', participantId), data as Record<string, unknown>);
    trackWrite();
}

export async function removeParticipant(eventId: string, participantId: string): Promise<void> {
    await deleteDoc(doc(db, 'events', eventId, 'participants', participantId));
    trackDelete();

    // Atomic participant count — fire-and-forget
    updateDoc(doc(db, 'events', eventId), { participantCount: increment(-1) }).catch(() => { });
}

export async function getParticipants(eventId: string): Promise<Participant[]> {
    const q = query(participantsCol(eventId), orderBy('addedAt', 'asc'));
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Participant));
}

export function subscribeToParticipants(
    eventId: string,
    callback: (participants: Participant[]) => void
): Unsubscribe {
    const q = query(participantsCol(eventId), orderBy('addedAt', 'asc'));
    return onSnapshot(q, (snap) => {
        trackRead(snap.docs.length || 1);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Participant));
        callback(items);
    }, (error) => {
        console.warn('[Participants] Snapshot error:', error.code);
        callback([]);
    });
}

export async function getEventsWhereParticipant(userId: string): Promise<string[]> {
    // Since participants are subcollections, we use collectionGroup
    const { collectionGroup } = await import('firebase/firestore');
    const q = query(
        collectionGroup(db, 'participants'),
        where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    return snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean) as string[];
}

export async function createScheduledReminder(data: {
    eventId: string;
    eventTitle: string;
    participantId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    email: string;
    scheduledTime: Date;
    templateId?: string;
    themeId?: string;
    customMessage?: string;
    idempotencyKey?: string;
}): Promise<string> {
    const { idempotencyKey } = data;
    const finalIdempotencyKey = idempotencyKey || `auto_${data.eventId}_${data.participantId}_${Date.now()}`;

    try {
        const docId = await runTransaction(db, async (transaction) => {
            // Deterministic ID for storage-layer uniqueness
            const deterministicId = `rem_${finalIdempotencyKey}`;
            const docRef = doc(db, 'scheduledReminders', deterministicId);
            const docSnap = await transaction.get(docRef);

            if (docSnap.exists()) {
                // console.log(`[Idempotency] Skipped duplicate creation for ${deterministicId}`);
                return deterministicId;
            }

            const reminderData = {
                ...data,
                senderName: data.userName || 'GMSS User',
                senderEmail: data.userEmail || '',
                idempotencyKey: finalIdempotencyKey,
                scheduledTime: Timestamp.fromDate(data.scheduledTime),
                status: 'pending',
                attempts: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: 'user',
                lastAttemptAt: null,
                failureReason: '',
                providerUsed: '',
                processedAt: null,
            };

            transaction.set(docRef, reminderData);
            return deterministicId;
        });

        // AUDIT LOG
        logMailAction({
            action: 'CREATE',
            status: 'PENDING',
            reminderId: docId,
            eventId: data.eventId,
            eventTitle: data.eventTitle,
            userId: data.userId,
            recipientEmail: data.email,
            templateId: data.templateId,
            idempotencyKey: finalIdempotencyKey,
            metadata: { participantId: data.participantId, scheduledTime: data.scheduledTime }
        });

        // Dev Mode Trigger — notify the scheduler hook AND call the API directly
        if (process.env.NODE_ENV === 'development') {
            // Dispatch custom event for instant pickup by useDevScheduler
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('reminder:created'));
            }
            // Also call API directly as backup
            fetch('/api/dev/process-reminders').catch(err => console.warn('Dev trigger failed:', err));
        }

        return docId;
    } catch (error) {
        console.error('Failed to create reminder:', error);
        throw error;
    }
}

export async function retryScheduledReminder(reminderId: string): Promise<void> {
    const { deleteField } = await import('firebase/firestore');
    await updateDoc(doc(db, 'scheduledReminders', reminderId), {
        status: 'pending',
        attempts: 0,
        scheduledTime: serverTimestamp(), // Reschedule for NOW
        processedAt: deleteField(),
        claimedAt: deleteField(),
        claimedBy: deleteField(),
        failureReason: deleteField(),
        lastError: deleteField(),
        lastAttemptAt: serverTimestamp(), // beneficial to track when retry was requested
    });
    trackWrite();

    // AUDIT LOG
    logMailAction({
        action: 'RETRY',
        status: 'RETRY_INITIATED',
        reminderId: reminderId,
        userId: 'system-or-user', //Ideally pass user ID here if available, or infer context
        metadata: { trigger: 'manual_retry' }
    });

    // ── DEV MODE: Trigger immediate processing ──
    if (process.env.NODE_ENV === 'development') {
        fetch('/api/dev/process-reminders').catch(err => console.warn('Dev trigger failed:', err));
    }
}

export async function deleteScheduledReminder(reminderId: string): Promise<void> {
    await deleteDoc(doc(db, 'scheduledReminders', reminderId));
    trackDelete();

    // AUDIT LOG (Best effort, since doc is gone, we might not have details unless we fetch first.
    // Ideally we fetch before delete for full audit, but for now we log the ID)
    await logMailAction({
        action: 'DELETE',
        status: 'DELETED',
        reminderId: reminderId,
        metadata: { method: 'manual_delete' }
    });
}

export async function toggleEmergencyStop(stop: boolean): Promise<void> {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'systemSettings', 'globalConfig'), { emergencyStop: stop }, { merge: true });
    trackWrite();

    // AUDIT LOG
    await logMailAction({
        action: 'SYSTEM_HALT_TOGGLE',
        status: stop ? 'HALTED' : 'PROCESSING', // 'PROCESSING' implies system is active/resumed
        metadata: { scope: 'global', newValue: stop }
    });
}
