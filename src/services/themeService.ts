import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
    query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { trackRead, trackWrite, trackDelete } from '@/lib/burnTracker';
import type { EmailTheme } from '@/types';

const THEMES_COL = 'emailThemes';

export async function createTheme(data: {
    name: string;
    layoutType: EmailTheme['layoutType'];
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    createdBy: string;
}): Promise<string> {
    const ref = await addDoc(collection(db, THEMES_COL), {
        ...data,
        createdAt: serverTimestamp(),
    });
    trackWrite();
    return ref.id;
}

export async function updateTheme(
    themeId: string,
    data: Partial<Omit<EmailTheme, 'id'>>
): Promise<void> {
    await updateDoc(doc(db, THEMES_COL, themeId), data as Record<string, unknown>);
    trackWrite();
}

export async function deleteTheme(themeId: string): Promise<void> {
    await deleteDoc(doc(db, THEMES_COL, themeId));
    trackDelete();
}

import { systemThemes } from '@/lib/emailSystem';

// ... (existing imports)

export async function getThemes(userId: string): Promise<EmailTheme[]> {
    const q = query(
        collection(db, THEMES_COL),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    const userThemes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailTheme));

    // Return System Themes + User Themes
    return [...systemThemes, ...userThemes];
}
