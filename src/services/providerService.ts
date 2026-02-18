import {
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp, onSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackRead, trackWrite, trackDelete } from '@/lib/burnTracker';
import type { EmailProvider } from '@/types';

const COLLECTION = 'emailProviders';

/** Get all providers for a user (including system-seeded defaults) */
export async function getProviders(userId: string): Promise<EmailProvider[]> {
    const q = query(
        collection(db, COLLECTION),
        where('createdBy', 'in', [userId, 'system']),
        orderBy('priority', 'asc')
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailProvider));
}

/** Real-time subscription to providers (including system-seeded) */
export function subscribeProviders(userId: string, cb: (providers: EmailProvider[]) => void): Unsubscribe {
    const q = query(
        collection(db, COLLECTION),
        where('createdBy', 'in', [userId, 'system']),
        orderBy('priority', 'asc')
    );
    return onSnapshot(q, (snap) => {
        trackRead(snap.docs.length || 1);
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailProvider)));
    }, (error) => {
        console.warn('[Providers] Snapshot error:', error.code);
        cb([]);
    });
}

/** Add a new provider */
export async function addProvider(data: {
    name: string;
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    dailyQuota?: number;
    priority?: number;
    createdBy: string;
}): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTION), {
        name: data.name,
        serviceId: data.serviceId,
        templateId: data.templateId,
        publicKey: data.publicKey,
        privateKey: data.privateKey,
        dailyQuota: data.dailyQuota || 200,
        priority: data.priority || 10,
        status: 'active',
        isDefault: false,
        createdBy: data.createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    trackWrite();
    return ref.id;
}

/** Update provider fields */
export async function updateProvider(id: string, data: Partial<Omit<EmailProvider, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
    trackWrite();
}

/** Toggle provider active/disabled */
export async function toggleProvider(id: string, enabled: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
        status: enabled ? 'active' : 'disabled',
        updatedAt: serverTimestamp(),
    });
    trackWrite();
}

/** Delete provider (only non-default) */
export async function deleteProvider(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
    trackDelete();
}
