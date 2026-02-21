import {
    collection, query, where, orderBy, limit, onSnapshot, getDocs,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { trackRead } from '@/lib/burnTracker';

// ── Per-Event Reminder Query Service ──
// Provides real-time and one-shot queries for scheduledReminders filtered by eventId.

export interface EventReminderDoc {
    id: string;
    eventId: string;
    eventTitle: string;
    participantId: string;
    participantName?: string;
    userId: string;
    email: string;
    scheduledTime: { toDate: () => Date } | null;
    status: string;
    attempts: number;
    lastAttemptAt: { toDate: () => Date } | null;
    failureReason?: string;
    lastError?: string;
    providerUsed: string;
    createdAt: { toDate: () => Date } | null;
    processedAt: { toDate: () => Date } | null;
    sentAt?: { toDate: () => Date } | null;
    failedAt?: { toDate: () => Date } | null;
    idempotencyKey?: string;
    customMessage?: string;
    senderName?: string;
    senderEmail?: string;
    templateId?: string;
}

/**
 * Real-time subscription to reminders for a specific event.
 * Ordered by scheduledTime (desc), limited to 50 to keep reads safe.
 */
export function subscribeToEventReminders(
    eventId: string,
    callback: (reminders: EventReminderDoc[]) => void
): Unsubscribe {
    const q = query(
        collection(db, 'scheduledReminders'),
        where('eventId', '==', eventId),
        orderBy('scheduledTime', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snap) => {
        trackRead(snap.docs.length || 1);
        const reminders = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as EventReminderDoc[];
        callback(reminders);
    }, (error) => {
        console.warn('[ReminderService] Snapshot error for event', eventId, ':', error.message);
        // Graceful degradation: return empty on error
        callback([]);
    });
}

/**
 * One-shot fetch of reminders for a specific event.
 * Use when real-time isn't needed (e.g., batch loading in HomePage).
 */
export async function getEventReminders(eventId: string): Promise<EventReminderDoc[]> {
    try {
        const q = query(
            collection(db, 'scheduledReminders'),
            where('eventId', '==', eventId),
            orderBy('scheduledTime', 'desc'),
            limit(50)
        );
        const snap = await getDocs(q);
        trackRead(snap.docs.length || 1);
        return snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as EventReminderDoc[];
    } catch (error) {
        console.warn('[ReminderService] Fetch error for event', eventId, ':', error);
        return [];
    }
}

/**
 * Batch fetch reminders for multiple events (cost-safe: single query per event).
 * Returns a map of eventId → reminders.
 */
export async function getBatchEventReminders(
    eventIds: string[]
): Promise<Record<string, EventReminderDoc[]>> {
    const result: Record<string, EventReminderDoc[]> = {};
    // Initialize all entries
    for (const id of eventIds) {
        result[id] = [];
    }

    if (eventIds.length === 0) return result;

    try {
        // Firestore `in` supports max 30 values, chunk if needed
        const chunks: string[][] = [];
        for (let i = 0; i < eventIds.length; i += 30) {
            chunks.push(eventIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            const q = query(
                collection(db, 'scheduledReminders'),
                where('eventId', 'in', chunk),
                orderBy('scheduledTime', 'desc'),
                limit(200) // Cap total reads
            );
            const snap = await getDocs(q);
            trackRead(snap.docs.length || 1);

            for (const docSnap of snap.docs) {
                const data = { id: docSnap.id, ...docSnap.data() } as EventReminderDoc;
                if (result[data.eventId]) {
                    result[data.eventId].push(data);
                }
            }
        }
    } catch (error) {
        console.warn('[ReminderService] Batch fetch error:', error);
        // Return whatever we have (partial data is better than none)
    }

    return result;
}
