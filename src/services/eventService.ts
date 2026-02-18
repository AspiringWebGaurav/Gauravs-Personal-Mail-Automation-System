import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
    query, where, orderBy, serverTimestamp, Timestamp, onSnapshot, limit,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackRead, trackWrite, trackDelete } from '@/lib/burnTracker';
import type { GMSSEvent } from '@/types';

const EVENTS_COL = 'events';

export async function createEvent(data: {
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    categoryId: string;
    createdBy: string;
}): Promise<string> {
    const ref = await addDoc(collection(db, EVENTS_COL), {
        ...data,
        startTime: Timestamp.fromDate(data.startTime),
        endTime: Timestamp.fromDate(data.endTime),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    trackWrite();
    return ref.id;
}

export async function getEvent(eventId: string): Promise<GMSSEvent | null> {
    const snap = await getDoc(doc(db, EVENTS_COL, eventId));
    trackRead();
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as GMSSEvent;
}

export async function updateEvent(eventId: string, data: Partial<Omit<GMSSEvent, 'id'>>): Promise<void> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    if (data.startTime && data.startTime instanceof Date) {
        updateData.startTime = Timestamp.fromDate(data.startTime as unknown as Date);
    }
    if (data.endTime && data.endTime instanceof Date) {
        updateData.endTime = Timestamp.fromDate(data.endTime as unknown as Date);
    }
    await updateDoc(doc(db, EVENTS_COL, eventId), updateData);
    trackWrite();
}

export async function deleteEvent(eventId: string): Promise<void> {
    await deleteDoc(doc(db, EVENTS_COL, eventId));
    trackDelete();
}

export async function getUserEvents(userId: string): Promise<GMSSEvent[]> {
    const q = query(
        collection(db, EVENTS_COL),
        where('createdBy', '==', userId),
        orderBy('startTime', 'desc'), // Show newest first
        limit(50) // Limit to 50 items to prevent massive reads
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GMSSEvent));
}

export function subscribeToUserEvents(
    userId: string,
    callback: (events: GMSSEvent[]) => void
): Unsubscribe {
    const q = query(
        collection(db, EVENTS_COL),
        where('createdBy', '==', userId),
        orderBy('startTime', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snap) => {
        trackRead(snap.docs.length || 1);
        const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GMSSEvent));
        callback(events);
    }, (error) => {
        console.warn('[Events] Snapshot error:', error.code);
        callback([]);
    });
}

export function subscribeToEvent(
    eventId: string,
    callback: (event: GMSSEvent | null) => void
): Unsubscribe {
    return onSnapshot(doc(db, EVENTS_COL, eventId), (snap) => {
        trackRead();
        if (!snap.exists()) {
            callback(null);
        } else {
            callback({ id: snap.id, ...snap.data() } as GMSSEvent);
        }
    }, (error) => {
        console.warn('[Event] Snapshot error:', error.code);
    });
}
