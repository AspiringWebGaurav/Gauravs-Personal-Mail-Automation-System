/**
 * GPMAS V1 — Scheduling & Real Send Verification
 * Tests: immediate, past-due, future (stays pending), and real email delivery
 */
import * as admin from 'firebase-admin';

const sa = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa as admin.ServiceAccount) });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;
const BASE = 'http://localhost:3000';
const CRON = process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026';
let pass = 0, fail = 0;

function t(name: string, ok: boolean, detail: string) {
    console.log(`${ok ? '✅' : '❌'} ${name}: ${detail}`);
    ok ? pass++ : fail++;
}

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║ SCHEDULING + REAL SEND VERIFICATION          ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // ── Step 0: Enable simulation ──
    console.log('── Step 0: Enable Simulation ──');
    await db.collection('systemSettings').doc('globalConfig').set({ simulationMode: true, emergencyStop: false, systemSuspended: false });

    // ── Step 1: Add a provider to Firestore ──
    console.log('── Adding provider ──');
    const provRef = await db.collection('emailProviders').add({
        name: 'Primary', serviceId: 'service_37etxg6', templateId: 'template_lh3q0q9',
        publicKey: 'xwi6F0t3bw9NkVJHp', privateKey: '',
        status: 'active', dailyQuota: 200, consecutiveFailures: 0,
    });
    const today = new Date().toISOString().split('T')[0];
    await db.collection('providerUsage').doc(provRef.id).set({ date: today, usedToday: 0 });
    t('Provider added to Firestore', true, `id=${provRef.id}`);

    // ── Step 2: Guard removed — scheduler should now process ──
    console.log('\n── Scheduler accepts with provider ──');
    const r1 = await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    const d1 = await r1.json();
    t('Scheduler no longer blocked', !d1.code, `msg=${d1.result?.message || d1.message || 'ok'}`);

    // ── Step 3: IMMEDIATE send (scheduledTime = NOW) ──
    console.log('\n── Scenario 1: Immediate send ──');
    const j1 = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'gauravpatil9262@gmail.com',
        subject: `GPMAS Immediate Send — ${new Date().toLocaleTimeString()}`,
        renderedHtml: '<h2>Immediate Send Test</h2><p>This job was scheduled for NOW and processed immediately.</p>',
        status: 'pending', scheduledTime: FV.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: FV.serverTimestamp(),
    });
    await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    await new Promise(r => setTimeout(r, 2000));
    const j1s = (await db.collection('mailQueue').doc(j1.id).get()).data();
    t('Immediate → sent', j1s?.status === 'sent', `status=${j1s?.status}, prov=${j1s?.providerUsed}, err=${j1s?.failureReason}`);
    t('sentAt populated', !!j1s?.sentAt, `${!!j1s?.sentAt}`);

    // ── Step 4: PAST-DUE send (scheduledTime = 2 hours ago) ──
    console.log('\n── Scenario 2: Past-due send (2h ago) ──');
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const j2 = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'gauravpatil9262@gmail.com',
        subject: `GPMAS Past-Due Send — scheduled ${pastTime.toLocaleTimeString()}`,
        renderedHtml: '<h2>Past-Due Send Test</h2><p>This job was scheduled for 2 hours ago. It should be picked up immediately.</p>',
        status: 'pending', scheduledTime: pastTime,
        attempts: 0, maxAttempts: 3, createdAt: FV.serverTimestamp(),
    });
    await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    await new Promise(r => setTimeout(r, 2000));
    const j2s = (await db.collection('mailQueue').doc(j2.id).get()).data();
    t('Past-due → sent', j2s?.status === 'sent', `status=${j2s?.status}`);

    // ── Step 5: FUTURE send (scheduledTime = 10min from now) ──
    console.log('\n── Scenario 3: Future send (10min from now) ──');
    const futureTime = new Date(Date.now() + 10 * 60 * 1000);
    const j3 = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'gauravpatil9262@gmail.com',
        subject: `GPMAS Future Send — ${futureTime.toLocaleTimeString()}`,
        renderedHtml: '<h2>Future Send Test</h2><p>This should NOT send yet. Scheduled for 10 min from now.</p>',
        status: 'pending', scheduledTime: futureTime,
        attempts: 0, maxAttempts: 3, createdAt: FV.serverTimestamp(),
    });
    await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    await new Promise(r => setTimeout(r, 1000));
    const j3s = (await db.collection('mailQueue').doc(j3.id).get()).data();
    t('Future → stays PENDING', j3s?.status === 'pending', `status=${j3s?.status}`);

    // ── Step 6: TOMORROW send ──
    console.log('\n── Scenario 4: Tomorrow send ──');
    const tomorrowTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const j4 = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'gauravpatil9262@gmail.com',
        subject: `GPMAS Tomorrow Send`,
        renderedHtml: '<h2>Tomorrow Test</h2>',
        status: 'pending', scheduledTime: tomorrowTime,
        attempts: 0, maxAttempts: 3, createdAt: FV.serverTimestamp(),
    });
    await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    await new Promise(r => setTimeout(r, 500));
    const j4s = (await db.collection('mailQueue').doc(j4.id).get()).data();
    t('Tomorrow → stays PENDING', j4s?.status === 'pending', `status=${j4s?.status}`);

    // ── Step 7: Quota tracking ──
    console.log('\n── Quota Verification ──');
    const usage = (await db.collection('providerUsage').doc(provRef.id).get()).data();
    t('Quota = 2 (only immediate + past-due sent)', (usage?.usedToday || 0) === 2, `used=${usage?.usedToday}`);

    // ── Step 8: No duplicates from multiple scheduler triggers ──
    console.log('\n── Double-trigger safety ──');
    await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    const j1r = (await db.collection('mailQueue').doc(j1.id).get()).data();
    const usage2 = (await db.collection('providerUsage').doc(provRef.id).get()).data();
    t('No duplicate sends', j1r?.status === 'sent', `status=${j1r?.status}`);
    t('Quota unchanged after double-trigger', (usage2?.usedToday || 0) === 2, `used=${usage2?.usedToday}`);

    // ── Cleanup future jobs and restore factory clean ──
    console.log('\n── Cleanup & Factory Restore ──');
    await db.collection('mailQueue').doc(j1.id).delete();
    await db.collection('mailQueue').doc(j2.id).delete();
    await db.collection('mailQueue').doc(j3.id).delete();
    await db.collection('mailQueue').doc(j4.id).delete();
    await provRef.delete();
    await db.collection('providerUsage').doc(provRef.id).delete();
    await db.collection('systemSettings').doc('globalConfig').set({ simulationMode: false, emergencyStop: false, systemSuspended: false });
    console.log('  ✓ Test jobs cleaned. Dummy provider deleted. Factory state restored.\n');

    // Report
    console.log('═'.repeat(50));
    console.log(`  SCHEDULING TEST: ${pass}/${pass + fail}`);
    console.log(`  VERDICT: ${fail === 0 ? '🟢 ALL SCENARIOS PASSED' : '🔴 ISSUES FOUND'}`);
    console.log('═'.repeat(50));
}

main().catch(console.error);
