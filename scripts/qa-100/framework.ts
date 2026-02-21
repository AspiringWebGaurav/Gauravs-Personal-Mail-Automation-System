/**
 * GPMAS QA Framework — Shared utilities for 100+ test suite
 */
import * as admin from 'firebase-admin';
import crypto from 'crypto';

// ── Firebase Admin Init ──
const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount as admin.ServiceAccount) });
}
export const db = admin.firestore();
export const auth = admin.auth();
export const FV = admin.firestore.FieldValue;

export const BASE_URL = 'http://localhost:3000';
export const CRON_SECRET = process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026';
export const OWNER_EMAIL = 'gauravpatil9262@gmail.com';
export const configRef = db.collection('systemSettings').doc('globalConfig');

export interface TestResult { id: string; cat: string; name: string; ok: boolean; detail: string }
export const results: TestResult[] = [];
let testCounter = 0;

export function t(cat: string, name: string, ok: boolean, detail: string) {
    testCounter++;
    const id = `T${String(testCounter).padStart(3, '0')}`;
    console.log(`${ok ? '✅' : '❌'} [${id}] [${cat}] ${name}: ${detail}`);
    results.push({ id, cat, name, ok, detail });
}

export async function getOwnerIdToken(): Promise<string> {
    const customToken = await auth.createCustomToken('qa-owner', { email: OWNER_EMAIL });
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true })
        }
    );
    const data = await res.json();
    if (!data.idToken) throw new Error(`ID token failed: ${JSON.stringify(data)}`);
    return data.idToken;
}

export async function getIntruderIdToken(): Promise<string> {
    const customToken = await auth.createCustomToken('intruder', { email: 'intruder@gmail.com' });
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true })
        }
    );
    const data = await res.json();
    return data.idToken || '';
}

export function makeToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
}

export async function createTestEvent(title = 'QA Event') {
    const ref = await db.collection('events').add({
        title, ownerId: 'qa-owner',
        eventTime: new Date(Date.now() + 7200000).toISOString(),
        createdAt: FV.serverTimestamp(),
    });
    return ref.id;
}

export async function createTestInvite(eventId: string, email: string, opts: any = {}) {
    const token = makeToken();
    const ref = await db.collection('invites').add({
        tokenHash: token.hash, eventId, inviteeEmail: email,
        role: opts.role || 'guest', status: opts.status || 'pending',
        createdAt: FV.serverTimestamp(), createdBy: 'qa-owner',
        expiresAt: opts.expiresAt || new Date(Date.now() + 86400000),
    });
    return { id: ref.id, ...token };
}

export async function createMailJob(opts: any) {
    const ref = await db.collection('mailQueue').add({
        jobType: opts.jobType || 'test',
        toEmail: opts.toEmail || 'test@qa.com',
        subject: opts.subject || 'QA Test',
        renderedHtml: opts.html || '<p>Test</p>',
        status: opts.status || 'pending',
        eventId: opts.eventId || 'none',
        inviteId: opts.inviteId || null,
        scheduledTime: opts.scheduledTime || FV.serverTimestamp(),
        attempts: opts.attempts || 0,
        maxAttempts: opts.maxAttempts || 3,
        createdAt: FV.serverTimestamp(),
    });
    return ref.id;
}

export async function triggerScheduler() {
    const res = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    return { status: res.status, data: await res.json() };
}

export async function cleanupDocs(collection: string, field: string, values: string[]) {
    for (const val of values) {
        const snap = await db.collection(collection).where(field, '==', val).get();
        for (const doc of snap.docs) await doc.ref.delete();
    }
}

export async function deleteEvent(eventId: string) {
    // Manual cascade
    const parts = await db.collection('events').doc(eventId).collection('participants').get();
    for (const d of parts.docs) await d.ref.delete();
    const invites = await db.collection('invites').where('eventId', '==', eventId).get();
    for (const d of invites.docs) await d.ref.delete();
    const mail = await db.collection('mailQueue').where('eventId', '==', eventId).get();
    for (const d of mail.docs) await d.ref.delete();
    await db.collection('events').doc(eventId).delete();
}

export function printReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('  GPMAS V1 — 100+ TEST QA REPORT');
    console.log('═'.repeat(60));
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    console.log(`\n  Total: ${results.length} | ✅ ${passed} | ❌ ${failed}\n`);

    // Summary by category
    const cats = [...new Set(results.map(r => r.cat))];
    for (const cat of cats) {
        const catResults = results.filter(r => r.cat === cat);
        const catPassed = catResults.filter(r => r.ok).length;
        console.log(`  [${cat}] ${catPassed}/${catResults.length}`);
    }

    if (failed > 0) {
        console.log('\n  FAILURES:');
        results.filter(r => !r.ok).forEach(r => console.log(`    ❌ [${r.id}] [${r.cat}] ${r.name}: ${r.detail}`));
    }
    console.log(`\n  VERDICT: ${failed === 0 ? '🟢 SYSTEM STABLE — PRODUCTION READY' : '🔴 ISSUES FOUND'}`);
    console.log('═'.repeat(60));
}
