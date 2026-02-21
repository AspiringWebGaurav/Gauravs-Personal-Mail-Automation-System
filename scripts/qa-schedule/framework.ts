import * as admin from 'firebase-admin';
import { MailRunner } from '../../src/lib/server/mailRunner';

// Initialize Firebase Admin (Only once)
const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
}

export const adminDb = admin.firestore();
export const auth = admin.auth();
export const FV = admin.firestore.FieldValue;

export const BASE_URL = 'http://localhost:3000';
export const CRON_SECRET = process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026';
export const configRef = adminDb.collection('systemSettings').doc('globalConfig');

// ── Test Tracker ──
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

export function t(category: string, name: string, ok: boolean, detail: string) {
    if (ok) {
        console.log(`✅ [${category}] ${name}: ${detail}`);
        passCount++;
    } else {
        console.log(`❌ [${category}] ${name}: ${detail}`);
        failCount++;
        failures.push(`[${category}] ${name}`);
    }
}

export function getTestStats() {
    return { passCount, failCount, failures };
}

export async function clearTestStats() {
    passCount = 0;
    failCount = 0;
    failures.length = 0;
}

// ── Helpers ──

export async function createTestEvent(title: string, eventTime: Date) {
    const ref = await adminDb.collection('events').add({
        title,
        ownerId: 'qa-owner',
        eventTime: admin.firestore.Timestamp.fromDate(eventTime),
        createdAt: FV.serverTimestamp()
    });
    return ref.id;
}

export async function addParticipant(eventId: string, email: string) {
    await adminDb.collection('events').doc(eventId).collection('participants').doc(email).set({
        email,
        role: 'invitee',
        joinedAt: FV.serverTimestamp()
    });
}

export async function createScheduledReminder(eventId: string, email: string, execTime: Date) {
    const ref = await adminDb.collection('mailQueue').add({
        jobType: 'event_reminder',
        eventId,
        toEmail: email,
        subject: 'Scheduled Test',
        renderedHtml: '<p>Test</p>',
        status: 'pending',
        scheduledTime: admin.firestore.Timestamp.fromDate(execTime),
        attempts: 0,
        maxAttempts: 3,
        createdAt: FV.serverTimestamp()
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
