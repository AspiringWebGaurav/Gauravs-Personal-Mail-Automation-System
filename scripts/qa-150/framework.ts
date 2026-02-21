import * as admin from 'firebase-admin';
import { MailRunner } from '../../src/lib/server/mailRunner';

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export const adminDb = admin.firestore();
export const configRef = adminDb.collection('systemSettings').doc('globalConfig');
export const FV = admin.firestore.FieldValue;

// --- INJECTION ENGINE ---
export const InjectionEngine = {
    async enableSimulation() {
        await configRef.set({
            simulationMode: true,
            emergencyStop: false,
            systemSuspended: false
        }, { merge: true });
    },
    async disableSimulation() {
        await configRef.set({
            simulationMode: false,
            simulateFailProvider: null,
            simulateQuotaExhausted: null
        }, { merge: true });
    },
    async forceProviderFailure(providerId: string | null) {
        await configRef.update({ simulateFailProvider: providerId });
    },
    async forceQuotaExhausted(providerId: string | null) {
        await configRef.update({ simulateQuotaExhausted: providerId });
    },
    async haltSystem() {
        await configRef.update({ systemSuspended: true });
    },
    async resumeSystem() {
        await configRef.update({ systemSuspended: false });
    },
    // --- HARD MODE INJECTIONS ---
    async forceCrash(type: 'crashBeforeLock' | 'crashAfterLockBeforeStatus' | 'crashAfterStatusBeforeProvider' | 'crashAfterProviderBeforeQuota' | 'crashAfterQuotaBeforeSent' | 'crashAfterSentBeforeLog' | null) {
        if (!type) {
            await configRef.update({
                crashBeforeLock: false,
                crashAfterLockBeforeStatus: false,
                crashAfterStatusBeforeProvider: false,
                crashAfterProviderBeforeQuota: false,
                crashAfterQuotaBeforeSent: false,
                crashAfterSentBeforeLog: false
            });
        } else {
            await configRef.update({ [type]: true });
        }
    },
    async setArtificialDelay(ms: number) {
        await configRef.update({ artificialDelayBeforeCommit: ms });
    }
};

// --- TEST TRACKER ---
let passed = 0;
let failed = 0;
let failures: string[] = [];
let testCounter = 1;

export function t(category: string, desc: string, assertion: boolean, data?: any) {
    const num = testCounter.toString().padStart(3, '0');
    if (assertion) {
        passed++;
        console.log(`✅ TEST ${num} [${category}] ${desc}${data ? ` (${data})` : ''}`);
    } else {
        failed++;
        const err = `❌ TEST ${num} [${category}] ${desc}${data ? ` (Got: ${data})` : ''}`;
        console.log(err);
        failures.push(err);
    }
    testCounter++;
}

export function getTestStats() {
    return { passed, failed, failures };
}

// --- HELPERS ---
export async function createProvider(name: string, quota: number = 200) {
    const ref = await adminDb.collection('emailProviders').add({
        name,
        serviceId: `mock_service_${name}`,
        templateId: 'mock_template',
        publicKey: 'mock_pub',
        privateKey: 'mock_priv',
        status: 'active',
        dailyQuota: quota,
        consecutiveFailures: 0
    });
    const today = new Date().toISOString().split('T')[0];
    await adminDb.collection('providerUsage').doc(ref.id).set({ date: today, usedToday: 0 });
    return ref.id;
}

export async function clearAllTestState() {
    const cols = ['events', 'mailQueue', 'invites', 'participants', 'emailProviders', 'providerUsage'];
    const maxBatch = 400; // safe limit
    for (const col of cols) {
        const snap = await adminDb.collection(col).get();
        if (snap.empty) continue;

        let batch = adminDb.batch();
        let i = 0;
        for (const doc of snap.docs) {
            batch.delete(doc.ref);
            i++;
            if (i >= maxBatch) {
                await batch.commit();
                batch = adminDb.batch();
                i = 0;
            }
        }
        if (i > 0) await batch.commit();
    }
}

export async function createTestEvent(title: string, scheduledTime: Date) {
    const ref = await adminDb.collection('events').add({
        title,
        status: 'scheduled',
        date: scheduledTime,
        organizerId: 'qa_user'
    });
    return ref.id;
}

export async function createScheduledReminder(eventId: string, toEmail: string, scheduledTime: Date, status: string = 'pending') {
    const ref = await adminDb.collection('mailQueue').add({
        eventId,
        toEmail,
        subject: 'Scheduled Test',
        scheduledTime,
        status,
        attempts: 0,
        jobType: 'reminder'
    });
    return ref.id;
}

export async function runScheduler() {
    const sysStateSnap = await adminDb.collection("systemSettings").doc("globalConfig").get();
    if (sysStateSnap.exists && sysStateSnap.data()?.systemSuspended === true) {
        return { message: 'System is currently suspended via STOP SERVICE.' };
    }
    return await MailRunner.processQueue();
}

export function wait(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}
