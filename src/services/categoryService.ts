import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
    query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackRead, trackWrite, trackDelete } from '@/lib/burnTracker';
import type { Category } from '@/types';

const CATEGORIES_COL = 'categories';

export async function createCategory(data: {
    name: string;
    color: string;
    icon: string;
    createdBy: string;
}): Promise<string> {
    const ref = await addDoc(collection(db, CATEGORIES_COL), {
        ...data,
        createdAt: serverTimestamp(),
    });
    trackWrite();
    return ref.id;
}

export async function updateCategory(
    categoryId: string,
    data: Partial<Omit<Category, 'id'>>
): Promise<void> {
    await updateDoc(doc(db, CATEGORIES_COL, categoryId), data as Record<string, unknown>);
    trackWrite();
}

export async function deleteCategory(categoryId: string): Promise<void> {
    await deleteDoc(doc(db, CATEGORIES_COL, categoryId));
    trackDelete();
}

export async function getCategories(userId: string): Promise<Category[]> {
    const q = query(
        collection(db, CATEGORIES_COL),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}
