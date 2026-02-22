import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
    query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { trackRead, trackWrite, trackDelete } from '@/lib/burnTracker';
import type { EmailTemplate } from '@/types';

const TEMPLATES_COL = 'emailTemplates';

export async function createTemplate(data: {
    name: string;
    subjectFormat: string;
    layoutType: EmailTemplate['layoutType'];
    messageBody: string;
    createdBy: string;
    category?: string;
}): Promise<string> {
    const ref = await addDoc(collection(db, TEMPLATES_COL), {
        ...data,
        createdAt: serverTimestamp(),
    });
    trackWrite();
    return ref.id;
}

export async function updateTemplate(
    templateId: string,
    data: Partial<Omit<EmailTemplate, 'id'>>
): Promise<void> {
    await updateDoc(doc(db, TEMPLATES_COL, templateId), data as Record<string, unknown>);
    trackWrite();
}

export async function deleteTemplate(templateId: string): Promise<void> {
    await deleteDoc(doc(db, TEMPLATES_COL, templateId));
    trackDelete();
}

import { starterTemplates } from '@/lib/emailSystem';

export async function getTemplates(userId: string): Promise<EmailTemplate[]> {
    const q = query(
        collection(db, TEMPLATES_COL),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    const userTemplates = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailTemplate));

    // Return System Templates + User Templates
    return [...starterTemplates, ...userTemplates];
}
