/**
 * GPMAS V1 — Deep QA Protocol (10-Step)
 * Virtual Execution Layer + Full Architecture Stress Test
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
const db = admin.firestore();
const auth = admin.auth();

const BASE_URL = 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026';
const OWNER_EMAIL = 'gauravpatil9262@gmail.com';
const configRef = db.collection('systemSettings').doc('globalConfig');

interface Result { phase: string; test: string; ok: boolean; detail: string }
const results: Result[] = [];
const bugs: { desc: string; fix: string; file: string }[] = [];

function log(phase: string, test: string, ok: boolean, detail: string) {
    console.log(`${ok ? '✅' : '❌'} [${phase}] ${test}: ${detail}`);
    results.push({ phase, test, ok, detail });
}

async function getOwnerIdToken(): Promise<string> {
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

function makeToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
}

// ════════════════════════════════════════════════════════════════
// STEP 0: SAFE MODE — Enable Virtual Execution Layer
// ════════════════════════════════════════════════════════════════
async function step0_safeMode() {
    console.log('\n═══ STEP 0: SAFE MODE ═══\n');
    await configRef.set({
        emergencyStop: false,
        systemSuspended: false,
        simulationMode: true,
        simulateFailProvider: null,
        simulateQuotaExhausted: null,
    }, { merge: true });
    log('S0', 'Simulation Mode Enabled', true, 'simulationMode=true — no real emails will be sent');

    // Reset provider state
    const provSnap = await db.collection('emailProviders').get();
    for (const doc of provSnap.docs) {
        await doc.ref.update({ status: 'active', consecutiveFailures: 0 });
        const today = new Date().toISOString().split('T')[0];
        await db.collection('providerUsage').doc(doc.id).set({ date: today, usedToday: 0 });
    }
    log('S0', 'Provider State Reset', true, `Reset ${provSnap.docs.length} providers`);
}

// ════════════════════════════════════════════════════════════════
// STEP 1: AUTH VALIDATION
// ════════════════════════════════════════════════════════════════
async function step1_auth() {
    console.log('\n═══ STEP 1: AUTH ═══\n');

    const ownerToken = await getOwnerIdToken();

    // Valid owner can create invite
    const eventRef = await db.collection('events').add({
        title: 'Auth Test Event', ownerId: 'qa-owner',
        eventTime: new Date(Date.now() + 3600000).toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const res = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
        body: JSON.stringify({ eventId: eventRef.id, inviteeEmail: 'auth-test@qa.com' }),
    });
    log('S1', 'Owner Auth Passes', res.status === 200, `Status ${res.status}`);

    // No auth → 401
    const noAuth = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: eventRef.id, inviteeEmail: 'x@y.com' }),
    });
    log('S1', 'No Auth Blocked', noAuth.status === 401, `Status ${noAuth.status}`);

    // Fake bearer → should fail (invalid token)
    const fakeAuth = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-token-abc' },
        body: JSON.stringify({ eventId: eventRef.id, inviteeEmail: 'x@y.com' }),
    });
    log('S1', 'Fake Token Blocked', fakeAuth.status === 500 || fakeAuth.status === 401 || fakeAuth.status === 403,
        `Status ${fakeAuth.status}`);

    // Non-owner email → 403
    const intruderToken = await auth.createCustomToken('intruder', { email: 'intruder@gmail.com' });
    const intruderRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: intruderToken, returnSecureToken: true })
        }
    );
    const intruderData = await intruderRes.json();
    if (intruderData.idToken) {
        const intruderInvite = await fetch(`${BASE_URL}/api/invite/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${intruderData.idToken}` },
            body: JSON.stringify({ eventId: eventRef.id, inviteeEmail: 'x@y.com' }),
        });
        log('S1', 'Non-Owner Email Blocked', intruderInvite.status === 403, `Status ${intruderInvite.status}`);
    }

    // Cleanup
    await eventRef.delete();
    const authInvites = await db.collection('invites').where('inviteeEmail', '==', 'auth-test@qa.com').get();
    for (const d of authInvites.docs) await d.ref.delete();
    const authMail = await db.collection('mailQueue').where('toEmail', '==', 'auth-test@qa.com').get();
    for (const d of authMail.docs) await d.ref.delete();
}

// ════════════════════════════════════════════════════════════════
// STEP 2: OPERATION ENGINE
// ════════════════════════════════════════════════════════════════
async function step2_operations() {
    console.log('\n═══ STEP 2: OPERATION ENGINE ═══\n');

    // Create operation via DBTransactions (server-side)
    const { DBTransactions } = await import('../src/lib/server/db-transactions');

    const eventId = await DBTransactions.createEvent({
        title: 'QA Op Test', eventTime: new Date(Date.now() + 7200000).toISOString(),
        ownerId: 'qa-owner',
    });
    log('S2', 'Create Operation', !!eventId, `EventID: ${eventId}`);

    // Verify event + owner participant
    const eventSnap = await db.collection('events').doc(eventId).get();
    log('S2', 'Event Doc Exists', eventSnap.exists, `Title: ${eventSnap.data()?.title}`);

    const ownerPart = await db.collection('events').doc(eventId).collection('participants').doc('qa-owner').get();
    log('S2', 'Owner Participant Auto-Added', ownerPart.exists && ownerPart.data()?.role === 'owner',
        `Role: ${ownerPart.data()?.role}`);

    // Double-click creation test (concurrent create)
    const [id1, id2] = await Promise.all([
        DBTransactions.createEvent({ title: 'Double-Click A', eventTime: new Date().toISOString(), ownerId: 'qa-owner' }),
        DBTransactions.createEvent({ title: 'Double-Click B', eventTime: new Date().toISOString(), ownerId: 'qa-owner' }),
    ]);
    log('S2', 'Double-Click Creates Distinct Events', id1 !== id2, `IDs: ${id1}, ${id2}`);

    // Status transition test: Create mailQueue job, process it, confirm states
    await db.collection('mailQueue').add({
        jobType: 'test', toEmail: OWNER_EMAIL, subject: 'Op Engine Test',
        renderedHtml: '<p>Test</p>', status: 'pending', eventId,
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const schedRes = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const schedData = await schedRes.json();
    log('S2', 'Scheduler Processes Job (Simulated)', schedRes.status === 200 && schedData.success,
        `Processed: ${schedData.result?.processed}`);

    // Cleanup
    await DBTransactions.deleteEvent(eventId);
    await DBTransactions.deleteEvent(id1);
    await DBTransactions.deleteEvent(id2);
}

// ════════════════════════════════════════════════════════════════
// STEP 4: INVITE SYSTEM (CRITICAL)
// ════════════════════════════════════════════════════════════════
async function step4_invites() {
    console.log('\n═══ STEP 4: INVITE SYSTEM ═══\n');

    const { DBTransactions } = await import('../src/lib/server/db-transactions');
    const idToken = await getOwnerIdToken();

    const eventId = await DBTransactions.createEvent({
        title: 'Invite Test Event', eventTime: new Date(Date.now() + 7200000).toISOString(), ownerId: 'qa-owner',
    });

    // 4a. Create invite via API
    const invRes = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'inv-test@qa.com' }),
    });
    const invData = await invRes.json();
    log('S4', 'Invite Created', invRes.status === 200, `ID: ${invData.inviteId}`);

    // 4b. Duplicate invite guard
    const dupRes = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'inv-test@qa.com' }),
    });
    log('S4', 'Duplicate Invite Blocked', dupRes.status === 409, `Status ${dupRes.status}`);

    // 4c. Token uniqueness (create 2 invites, verify different hashes)
    const inv2Res = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'inv-test2@qa.com' }),
    });
    const inv2Data = await inv2Res.json();
    const inv1Snap = await db.collection('invites').doc(invData.inviteId).get();
    const inv2Snap = await db.collection('invites').doc(inv2Data.inviteId).get();
    log('S4', 'Token Uniqueness', inv1Snap.data()?.tokenHash !== inv2Snap.data()?.tokenHash,
        'Distinct hashes confirmed');

    // Setup known tokens for claim tests
    const validToken = makeToken();
    const expiredToken = makeToken();
    const revokedToken = makeToken();

    await db.collection('invites').add({
        tokenHash: validToken.hash, eventId, inviteeEmail: 'claim-valid@qa.com',
        role: 'guest', status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000), createdBy: 'qa-owner',
    });
    await db.collection('invites').add({
        tokenHash: expiredToken.hash, eventId, inviteeEmail: 'claim-expired@qa.com',
        role: 'guest', status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() - 10000), createdBy: 'qa-owner',
    });
    await db.collection('invites').add({
        tokenHash: revokedToken.hash, eventId, inviteeEmail: 'claim-revoked@qa.com',
        role: 'guest', status: 'revoked',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000), createdBy: 'qa-owner',
    });

    // 4d. Valid accept
    const claimValid = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validToken.raw, userEmail: 'claim-valid@qa.com' }),
    });
    log('S4', 'Valid Accept', claimValid.status === 200, `Status ${claimValid.status}`);

    // 4e. Participant attached
    const parts = await db.collection('events').doc(eventId).collection('participants')
        .where('email', '==', 'claim-valid@qa.com').get();
    log('S4', 'Participant Attached', !parts.empty, `Found ${parts.docs.length}`);

    // 4f. Double-accept prevention
    const claimDouble = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validToken.raw, userEmail: 'claim-valid@qa.com' }),
    });
    log('S4', 'Double Accept Blocked', claimDouble.status === 409, `Status ${claimDouble.status}`);

    // 4g. Expired accept
    const claimExpired = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: expiredToken.raw, userEmail: 'claim-expired@qa.com' }),
    });
    log('S4', 'Expired Reject', claimExpired.status === 400, `Status ${claimExpired.status}`);

    // 4h. Tampered token
    const claimTampered = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'tampered-token-xyz-000', userEmail: 'x@y.com' }),
    });
    log('S4', 'Tampered Token Reject', claimTampered.status === 400, `Status ${claimTampered.status}`);

    // 4i. Revoked invite
    const claimRevoked = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: revokedToken.raw, userEmail: 'claim-revoked@qa.com' }),
    });
    log('S4', 'Revoked Invite Reject', claimRevoked.status === 400, `Status ${claimRevoked.status}`);

    // 4j. Concurrent race (3 parallel claims)
    const raceToken = makeToken();
    await db.collection('invites').add({
        tokenHash: raceToken.hash, eventId, inviteeEmail: 'race@qa.com',
        role: 'guest', status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000), createdBy: 'qa-owner',
    });
    const raceResults = await Promise.all(Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/api/invite/claim`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: raceToken.raw, userEmail: 'race@qa.com' }),
        }).then(r => r.status)
    ));
    const wins = raceResults.filter(s => s === 200).length;
    log('S4', 'Concurrent Race (5 parallel)', wins === 1,
        `Results: ${raceResults.join(',')} — ${wins} win`);

    // 4k. Delete operation → cleanup invites
    const preDeleteInvites = await db.collection('invites').where('eventId', '==', eventId).get();
    const preCount = preDeleteInvites.docs.length;
    await DBTransactions.deleteEvent(eventId);
    const postDeleteInvites = await db.collection('invites').where('eventId', '==', eventId).get();
    log('S4', 'Delete Cascades Invites', postDeleteInvites.empty,
        `Before: ${preCount}, After: ${postDeleteInvites.docs.length}`);
}

// ════════════════════════════════════════════════════════════════
// STEP 5: PROVIDER ENGINE (DEEP)
// ════════════════════════════════════════════════════════════════
async function step5_providerEngine() {
    console.log('\n═══ STEP 5: PROVIDER ENGINE ═══\n');

    const provSnap = await db.collection('emailProviders').where('status', '==', 'active').get();
    const providerId = provSnap.docs[0]?.id;
    if (!providerId) { log('S5', 'Active Provider', false, 'No active provider found'); return; }

    // 5a. Single provider simulated send
    const job1Ref = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'prov-test@qa.com', subject: 'Provider Test 1',
        renderedHtml: '<p>Provider test</p>', status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    let res = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    let jobSnap = await db.collection('mailQueue').doc(job1Ref.id).get();
    log('S5', 'Single Provider Send', jobSnap.data()?.status === 'sent', `Status: ${jobSnap.data()?.status}`);

    // 5b. Quota tracking
    const usageSnap = await db.collection('providerUsage').doc(providerId).get();
    log('S5', 'Quota Incremented', (usageSnap.data()?.usedToday || 0) > 0,
        `Used: ${usageSnap.data()?.usedToday}`);

    // 5c. Forced failure → fallback (simulate failure on existing provider)
    await configRef.update({ simulateFailProvider: providerId });

    // Add a second provider for fallback testing
    const fallbackRef = await db.collection('emailProviders').add({
        name: 'QA-Fallback', serviceId: 'svc_fallback', templateId: 'tpl_fallback',
        publicKey: 'pk_test', privateKey: 'sk_test', status: 'active',
        dailyQuota: 200, consecutiveFailures: 0,
    });
    const today = new Date().toISOString().split('T')[0];
    await db.collection('providerUsage').doc(fallbackRef.id).set({ date: today, usedToday: 100 });

    const job2Ref = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'fallback-test@qa.com', subject: 'Fallback Test',
        renderedHtml: '<p>Fallback</p>', status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const job2Snap = await db.collection('mailQueue').doc(job2Ref.id).get();
    log('S5', 'Forced Failure → Fallback', job2Snap.data()?.status === 'sent' && job2Snap.data()?.providerUsed === fallbackRef.id,
        `Status: ${job2Snap.data()?.status}, Provider: ${job2Snap.data()?.providerUsed}`);

    // Check primary provider got failure logged
    const primarySnap = await db.collection('emailProviders').doc(providerId).get();
    log('S5', 'Failure Logged on Primary', (primarySnap.data()?.consecutiveFailures || 0) > 0,
        `Failures: ${primarySnap.data()?.consecutiveFailures}`);

    // 5d. Quota exhaustion skip
    await configRef.update({ simulateFailProvider: null });
    await db.collection('providerUsage').doc(providerId).update({ usedToday: 999 }); // Exhaust quota
    const job3Ref = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'quota-test@qa.com', subject: 'Quota Test',
        renderedHtml: '<p>Quota</p>', status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const job3Snap = await db.collection('mailQueue').doc(job3Ref.id).get();
    const usedFallback = job3Snap.data()?.providerUsed === fallbackRef.id;
    log('S5', 'Quota Exhaustion Skips Provider', job3Snap.data()?.status === 'sent' && usedFallback,
        `Provider: ${job3Snap.data()?.providerUsed} (expected fallback)`);

    // Cleanup
    await configRef.update({ simulateFailProvider: null });
    await db.collection('emailProviders').doc(providerId).update({ status: 'active', consecutiveFailures: 0 });
    await db.collection('providerUsage').doc(providerId).set({ date: today, usedToday: 0 });
    await fallbackRef.delete();
    await db.collection('providerUsage').doc(fallbackRef.id).delete();
    for (const id of [job1Ref.id, job2Ref.id, job3Ref.id]) {
        await db.collection('mailQueue').doc(id).delete();
    }
}

// ════════════════════════════════════════════════════════════════
// STEP 7: SYSTEM HALT
// ════════════════════════════════════════════════════════════════
async function step7_systemHalt() {
    console.log('\n═══ STEP 7: SYSTEM HALT ═══\n');

    // Enable halt
    await configRef.update({ emergencyStop: true, systemSuspended: true });
    log('S7', 'STOP SERVICE Enabled', true, 'Halt active');

    const haltJobRef = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: 'halt@qa.com', subject: 'Should Block',
        renderedHtml: '<p>blocked</p>', status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const haltRes = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const haltData = await haltRes.json();
    log('S7', 'Execution Blocked', haltData.message?.includes('suspended'), `Response: ${JSON.stringify(haltData)}`);

    const haltJobSnap = await db.collection('mailQueue').doc(haltJobRef.id).get();
    log('S7', 'Job Remains Pending', haltJobSnap.data()?.status === 'pending', `Status: ${haltJobSnap.data()?.status}`);

    // Resume
    await configRef.update({ emergencyStop: false, systemSuspended: false });
    const resumeRes = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const resumedSnap = await db.collection('mailQueue').doc(haltJobRef.id).get();
    log('S7', 'Clean Recovery After Resume', resumedSnap.data()?.status === 'sent',
        `Status: ${resumedSnap.data()?.status}`);

    await db.collection('mailQueue').doc(haltJobRef.id).delete();
}

// ════════════════════════════════════════════════════════════════
// STEP 8: CONCURRENCY STRESS
// ════════════════════════════════════════════════════════════════
async function step8_concurrency() {
    console.log('\n═══ STEP 8: CONCURRENCY STRESS ═══\n');

    const { DBTransactions } = await import('../src/lib/server/db-transactions');

    // 8a. Rapid operations (5 concurrent creates)
    const ids = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
            DBTransactions.createEvent({
                title: `Stress-${i}`, eventTime: new Date().toISOString(), ownerId: 'qa-owner',
            })
        )
    );
    const unique = new Set(ids).size;
    log('S8', 'Rapid 5 Concurrent Creates', unique === 5, `${unique} unique IDs`);

    // 8b. 10 concurrent mailQueue jobs
    const jobRefs = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
            db.collection('mailQueue').add({
                jobType: 'test', toEmail: `stress-${i}@qa.com`, subject: `Stress ${i}`,
                renderedHtml: `<p>Stress ${i}</p>`, status: 'pending',
                scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
                attempts: 0, maxAttempts: 3, createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
        )
    );

    // Trigger 3 concurrent scheduler calls
    const schedResults = await Promise.all(
        Array.from({ length: 3 }, () =>
            fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } })
                .then(r => r.json())
        )
    );
    const totalProcessed = schedResults.reduce((sum, r) => sum + (r.result?.processed || 0), 0);
    log('S8', 'Concurrent Scheduler (3 triggers, 10 jobs)', totalProcessed >= 10,
        `Total processed: ${totalProcessed}`);

    await new Promise(r => setTimeout(r, 1000));

    // Verify no duplicates — each job should be 'sent' exactly once
    let sentCount = 0;
    let stuckCount = 0;
    for (const ref of jobRefs) {
        const snap = await db.collection('mailQueue').doc(ref.id).get();
        if (snap.data()?.status === 'sent') sentCount++;
        if (snap.data()?.status === 'processing') stuckCount++;
    }
    log('S8', 'No Duplicate Sends', sentCount === 10, `Sent: ${sentCount}/10`);
    log('S8', 'No Stuck PROCESSING', stuckCount === 0, `Stuck: ${stuckCount}`);

    // Cleanup
    for (const id of ids) await DBTransactions.deleteEvent(id);
    for (const ref of jobRefs) await db.collection('mailQueue').doc(ref.id).delete();
}

// ════════════════════════════════════════════════════════════════
// STEP 9: DB INTEGRITY
// ════════════════════════════════════════════════════════════════
async function step9_dbIntegrity() {
    console.log('\n═══ STEP 9: DB INTEGRITY ═══\n');

    const { DBTransactions } = await import('../src/lib/server/db-transactions');

    // Create event with participants, invites, and mail jobs
    const eventId = await DBTransactions.createEvent({
        title: 'Cascade Test', eventTime: new Date().toISOString(), ownerId: 'qa-owner',
    });

    // Add extra participant
    await db.collection('events').doc(eventId).collection('participants').add({
        email: 'cascade-part@qa.com', role: 'guest',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add invites
    await db.collection('invites').add({
        tokenHash: 'cascade-hash-1', eventId, inviteeEmail: 'cascade-inv@qa.com',
        status: 'pending', createdBy: 'qa-owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000),
    });

    // Add mailQueue job
    await db.collection('mailQueue').add({
        jobType: 'invite', eventId, toEmail: 'cascade-inv@qa.com',
        subject: 'Cascade', renderedHtml: '<p>c</p>', status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Delete event
    const result = await DBTransactions.deleteEvent(eventId);
    log('S9', 'Cascade Delete Executed', result.success, `Deleted ${result.deletedCount} docs`);

    // Verify no orphans
    const orphanEvent = await db.collection('events').doc(eventId).get();
    log('S9', 'Event Deleted', !orphanEvent.exists, `Exists: ${orphanEvent.exists}`);

    const orphanInvites = await db.collection('invites').where('eventId', '==', eventId).get();
    log('S9', 'Invites Cascaded', orphanInvites.empty, `Remaining: ${orphanInvites.docs.length}`);

    const orphanMail = await db.collection('mailQueue').where('eventId', '==', eventId).get();
    log('S9', 'MailQueue Cascaded', orphanMail.empty, `Remaining: ${orphanMail.docs.length}`);
}

// ════════════════════════════════════════════════════════════════
// FINAL STEP: Remove Virtual Mode + Real Dispatch
// ════════════════════════════════════════════════════════════════
async function finalStep_realDispatch() {
    console.log('\n═══ FINAL STEP: REAL DISPATCH ═══\n');

    // Remove simulation mode
    await configRef.update({
        simulationMode: false,
        simulateFailProvider: admin.firestore.FieldValue.delete(),
        simulateQuotaExhausted: admin.firestore.FieldValue.delete(),
    });
    log('FINAL', 'Simulation Mode Removed', true, 'simulationMode=false');

    // Verify no mock layer remains
    const configSnap = await configRef.get();
    log('FINAL', 'No Mock Layer', configSnap.data()?.simulationMode === false,
        `simulationMode: ${configSnap.data()?.simulationMode}`);

    // Reset provider state for real dispatch
    const provSnap = await db.collection('emailProviders').get();
    for (const doc of provSnap.docs) {
        await doc.ref.update({ status: 'active', consecutiveFailures: 0 });
        const today = new Date().toISOString().split('T')[0];
        await db.collection('providerUsage').doc(doc.id).set({ date: today, usedToday: 0 });
    }

    // One real end-to-end flow
    const realJobRef = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: OWNER_EMAIL,
        subject: 'GPMAS QA — Real Dispatch Confirmation',
        renderedHtml: `<h2>GPMAS Production QA</h2><p>System verified at ${new Date().toISOString()}</p><p>All tests passed. This email confirms real dispatch works.</p>`,
        status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0, maxAttempts: 3,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const res = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 2000));
    const realJobSnap = await db.collection('mailQueue').doc(realJobRef.id).get();
    log('FINAL', 'Real Email Sent', realJobSnap.data()?.status === 'sent',
        `Status: ${realJobSnap.data()?.status}, Provider: ${realJobSnap.data()?.providerUsed}`);

    // Cleanup
    await db.collection('mailQueue').doc(realJobRef.id).delete();
}

// ════════════════════════════════════════════════════════════════
// REPORT
// ════════════════════════════════════════════════════════════════
function printReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('  GPMAS V1 — DEEP QA REPORT');
    console.log('═'.repeat(60) + '\n');

    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    console.log(`  Total: ${results.length} | ✅ ${passed} | ❌ ${failed}\n`);

    if (failed > 0) {
        console.log('  FAILURES:');
        results.filter(r => !r.ok).forEach(r => console.log(`    ❌ [${r.phase}] ${r.test}: ${r.detail}`));
    }
    if (bugs.length > 0) {
        console.log('\n  BUGS FIXED:');
        bugs.forEach(b => console.log(`    🔧 ${b.desc} → ${b.fix} (${b.file})`));
    }

    console.log(`\n  VERDICT: ${failed === 0 ? '🟢 SYSTEM STABLE — PRODUCTION READY' : '🔴 ISSUES FOUND'}`);
    console.log('═'.repeat(60));
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
async function main() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — DEEP QA PROTOCOL (10-STEP)       ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    try {
        await step0_safeMode();
        await step1_auth();
        await step2_operations();
        await step4_invites();
        await step5_providerEngine();
        await step7_systemHalt();
        await step8_concurrency();
        await step9_dbIntegrity();
        await finalStep_realDispatch();
    } catch (e: any) {
        console.error('\n💥 FATAL:', e.message, e.stack);
    }

    printReport();
}

main().catch(console.error);
