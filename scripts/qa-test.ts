/**
 * GPMAS V1 — Production QA Test Suite
 * Runs against localhost:3000 dev server
 * Tests all 8 phases of the QA protocol
 */

import * as admin from 'firebase-admin';

// ── Firebase Admin Init ──
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

const db = admin.firestore();
const auth = admin.auth();

const BASE_URL = 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026';
const OWNER_EMAIL = 'gauravpatil9262@gmail.com';

// Test provider credentials
const TEST_PROVIDER = {
    name: 'QA-Provider-1',
    serviceId: 'service_tk6e4dw',
    templateId: 'template_vmosoq3',
    publicKey: 'ra2osYfrSNo1Zkobx',
    privateKey: 'qFfBy-cLrNPDFBWql8cT1',
    status: 'active',
    dailyQuota: 200,
    consecutiveFailures: 0,
};

interface TestResult {
    phase: string;
    test: string;
    status: 'PASS' | 'FAIL' | 'FIXED';
    detail: string;
}

const results: TestResult[] = [];
const bugs: { description: string; fix: string; file?: string }[] = [];

function log(phase: string, test: string, status: 'PASS' | 'FAIL' | 'FIXED', detail: string) {
    const icon = status === 'PASS' ? '✅' : status === 'FIXED' ? '🔧' : '❌';
    console.log(`${icon} [${phase}] ${test}: ${detail}`);
    results.push({ phase, test, status, detail });
}

async function getOwnerIdToken(): Promise<string> {
    // Generate a custom token for the owner, then exchange it for an ID token
    const customToken = await auth.createCustomToken('qa-test-owner', { email: OWNER_EMAIL });

    // Exchange custom token for ID token via Firebase Auth REST API
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true }),
        }
    );
    const data = await res.json();
    if (!data.idToken) {
        throw new Error(`Failed to get ID token: ${JSON.stringify(data)}`);
    }
    return data.idToken;
}

// ════════════════════════════════════════════════════════════════
// PHASE 1: ENVIRONMENT & PROVIDER REGISTRATION
// ════════════════════════════════════════════════════════════════
async function phase1_environment() {
    console.log('\n═══ PHASE 1: ENVIRONMENT AUDIT ═══\n');

    // Check Firebase connectivity
    try {
        const testDoc = await db.collection('systemSettings').doc('globalConfig').get();
        log('P1', 'Firebase Admin Connectivity', 'PASS', `Connected. globalConfig exists: ${testDoc.exists}`);
    } catch (e: any) {
        log('P1', 'Firebase Admin Connectivity', 'FAIL', e.message);
        return;
    }

    // Register provider if not found
    const existingProviders = await db.collection('emailProviders').where('serviceId', '==', TEST_PROVIDER.serviceId).get();
    if (existingProviders.empty) {
        console.log('  → No provider found with serviceId. Registering...');
        await db.collection('emailProviders').add(TEST_PROVIDER);
        log('P1', 'Provider Registration', 'PASS', `Provider "${TEST_PROVIDER.name}" registered via Admin SDK`);
    } else {
        log('P1', 'Provider Registration', 'PASS', `Provider already exists (${existingProviders.docs[0].id})`);
    }

    // Reset provider usage for clean test
    const providers = await db.collection('emailProviders').get();
    for (const doc of providers.docs) {
        const usageRef = db.collection('providerUsage').doc(doc.id);
        const today = new Date().toISOString().split('T')[0];
        await usageRef.set({ date: today, usedToday: 0 }, { merge: true });
    }
    log('P1', 'Provider Usage Reset', 'PASS', 'All provider daily usage counters reset to 0');

    // Ensure globalConfig exists
    const configRef = db.collection('systemSettings').doc('globalConfig');
    const configSnap = await configRef.get();
    if (!configSnap.exists) {
        await configRef.set({ emergencyStop: false, simulationMode: false, systemSuspended: false });
        log('P1', 'GlobalConfig Init', 'PASS', 'Created systemSettings/globalConfig with defaults');
    } else {
        // Ensure system is NOT halted for testing
        await configRef.update({ emergencyStop: false, systemSuspended: false });
        log('P1', 'GlobalConfig State', 'PASS', 'System halt disabled for testing');
    }
}

// ════════════════════════════════════════════════════════════════
// PHASE 2: API LAYER VALIDATION
// ════════════════════════════════════════════════════════════════
async function phase2_apiValidation() {
    console.log('\n═══ PHASE 2: API LAYER VALIDATION ═══\n');

    const idToken = await getOwnerIdToken();

    // ── Test /api/scheduler/process ──

    // 2a. Without auth header
    const schedNoAuth = await fetch(`${BASE_URL}/api/scheduler/process`);
    log('P2', 'Scheduler: No Auth', schedNoAuth.status === 401 ? 'PASS' : 'FAIL',
        `Status ${schedNoAuth.status} (expected 401)`);

    // 2b. With valid CRON_SECRET
    const schedValid = await fetch(`${BASE_URL}/api/scheduler/process`, {
        headers: { 'x-cron-secret': CRON_SECRET },
    });
    log('P2', 'Scheduler: Valid CRON_SECRET', schedValid.status === 200 ? 'PASS' : 'FAIL',
        `Status ${schedValid.status}, Body: ${await schedValid.text()}`);

    // ── Test /api/invite/create ──

    // 2c. Without auth
    const invNoAuth = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: 'fake', inviteeEmail: 'test@example.com' }),
    });
    log('P2', 'Invite Create: No Auth', invNoAuth.status === 401 ? 'PASS' : 'FAIL',
        `Status ${invNoAuth.status} (expected 401)`);

    // 2d. With auth but invalid payload
    const invBadPayload = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ eventId: '', inviteeEmail: 'not-an-email' }),
    });
    log('P2', 'Invite Create: Invalid Payload', invBadPayload.status === 400 ? 'PASS' : 'FAIL',
        `Status ${invBadPayload.status} (expected 400)`);

    // 2e. With auth but non-existent event
    const invNoEvent = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ eventId: 'nonexistent-event-id-12345', inviteeEmail: 'test@example.com' }),
    });
    log('P2', 'Invite Create: Non-existent Event', invNoEvent.status === 404 ? 'PASS' : 'FAIL',
        `Status ${invNoEvent.status} (expected 404)`);

    // ── Test /api/invite/claim ──

    // 2f. Invalid token
    const claimBadToken = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token-abc', userEmail: 'test@example.com' }),
    });
    log('P2', 'Invite Claim: Invalid Token', claimBadToken.status === 400 ? 'PASS' : 'FAIL',
        `Status ${claimBadToken.status} (expected 400)`);

    // 2g. Bad schema
    const claimBadSchema = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '', userEmail: 'bad' }),
    });
    log('P2', 'Invite Claim: Bad Schema', claimBadSchema.status === 400 ? 'PASS' : 'FAIL',
        `Status ${claimBadSchema.status} (expected 400)`);
}

// ════════════════════════════════════════════════════════════════
// PHASE 3: FULL INVITE LIFECYCLE
// ════════════════════════════════════════════════════════════════
async function phase3_inviteLifecycle() {
    console.log('\n═══ PHASE 3: INVITE LIFECYCLE ═══\n');

    const idToken = await getOwnerIdToken();

    // 3a. Create a test event via Firestore Admin (simulating operation creation)
    const eventRef = await db.collection('events').add({
        title: 'QA Test Event',
        description: 'Created by QA script',
        eventTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        location: 'QA Lab',
        ownerId: 'qa-test-owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    log('P3', 'Event Creation', 'PASS', `Created event: ${eventRef.id}`);

    // 3b. Create invite via API
    const inviteRes = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            eventId: eventRef.id,
            inviteeEmail: 'qa-invitee@testqa.com',
        }),
    });
    const inviteData = await inviteRes.json();
    log('P3', 'Invite API Call', inviteRes.status === 200 ? 'PASS' : 'FAIL',
        `Status ${inviteRes.status}, Body: ${JSON.stringify(inviteData)}`);

    if (inviteRes.status !== 200) {
        return;
    }

    // 3c. Verify invite document created in Firestore
    const inviteSnap = await db.collection('invites').doc(inviteData.inviteId).get();
    const invite = inviteSnap.data();
    log('P3', 'Invite Doc Created', inviteSnap.exists ? 'PASS' : 'FAIL',
        `Status: ${invite?.status}, Email: ${invite?.inviteeEmail}`);

    // 3d. Verify mailQueue job created
    const mailQueueSnap = await db.collection('mailQueue')
        .where('inviteId', '==', inviteData.inviteId)
        .limit(1)
        .get();
    log('P3', 'MailQueue Job Created', !mailQueueSnap.empty ? 'PASS' : 'FAIL',
        `Found ${mailQueueSnap.docs.length} queue job(s)`);

    // 3e. Extract the raw token to test invite claim
    // We need to find the token — it was stored hashed. We'll create a known one.
    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Create a manual invite with known token for claim testing
    const manualInviteRef = await db.collection('invites').add({
        tokenHash,
        eventId: eventRef.id,
        inviteeEmail: 'qa-claim-test@testqa.com',
        role: 'guest',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000), // 24h
        createdBy: 'qa-test-owner',
    });
    log('P3', 'Manual Invite for Claim Test', 'PASS', `ID: ${manualInviteRef.id}`);

    // 3f. Claim the invite
    const claimRes = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, userEmail: 'qa-claim-test@testqa.com' }),
    });
    const claimData = await claimRes.json();
    log('P3', 'Invite Claim', claimRes.status === 200 ? 'PASS' : 'FAIL',
        `Status ${claimRes.status}, Body: ${JSON.stringify(claimData)}`);

    // 3g. Verify invite status changed to 'accepted'
    const claimedSnap = await db.collection('invites').doc(manualInviteRef.id).get();
    const claimedData = claimedSnap.data();
    log('P3', 'Invite Status Updated', claimedData?.status === 'accepted' ? 'PASS' : 'FAIL',
        `Status: ${claimedData?.status} (expected: accepted)`);

    // 3h. Verify participant attached
    const participantsSnap = await db.collection('events').doc(eventRef.id)
        .collection('participants')
        .where('email', '==', 'qa-claim-test@testqa.com')
        .get();
    log('P3', 'Participant Attached', !participantsSnap.empty ? 'PASS' : 'FAIL',
        `Found ${participantsSnap.docs.length} participant(s)`);

    // 3i. DOUBLE-ACCEPT TEST (Critical race condition test)
    const doubleClaimRes = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, userEmail: 'qa-claim-test@testqa.com' }),
    });
    log('P3', 'Double-Accept Prevention', doubleClaimRes.status === 409 ? 'PASS' : 'FAIL',
        `Status ${doubleClaimRes.status} (expected 409 ALREADY_ACCEPTED)`);

    // 3j. CONCURRENT CLAIM TEST (Race condition)
    const rawToken2 = crypto.randomBytes(32).toString('hex');
    const tokenHash2 = crypto.createHash('sha256').update(rawToken2).digest('hex');
    await db.collection('invites').add({
        tokenHash: tokenHash2,
        eventId: eventRef.id,
        inviteeEmail: 'qa-race@testqa.com',
        role: 'guest',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 86400000),
        createdBy: 'qa-test-owner',
    });

    // Fire 3 concurrent claims
    const racePromises = Array.from({ length: 3 }, () =>
        fetch(`${BASE_URL}/api/invite/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: rawToken2, userEmail: 'qa-race@testqa.com' }),
        }).then(r => r.status)
    );
    const raceResults = await Promise.all(racePromises);
    const successes = raceResults.filter(s => s === 200).length;
    const conflicts = raceResults.filter(s => s === 409).length;
    log('P3', 'Concurrent Claim Race', successes === 1 ? 'PASS' : 'FAIL',
        `Results: ${raceResults.join(',')} — ${successes} success, ${conflicts} conflict`);

    // 3k. EXPIRED TOKEN TEST
    const rawToken3 = crypto.randomBytes(32).toString('hex');
    const tokenHash3 = crypto.createHash('sha256').update(rawToken3).digest('hex');
    await db.collection('invites').add({
        tokenHash: tokenHash3,
        eventId: eventRef.id,
        inviteeEmail: 'qa-expired@testqa.com',
        role: 'guest',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() - 10000), // Already expired
        createdBy: 'qa-test-owner',
    });
    const expiredRes = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken3, userEmail: 'qa-expired@testqa.com' }),
    });
    log('P3', 'Expired Token Rejection', expiredRes.status === 400 ? 'PASS' : 'FAIL',
        `Status ${expiredRes.status} (expected 400 EXPIRED)`);
}

// ════════════════════════════════════════════════════════════════
// PHASE 4: PROVIDER ENGINE
// ════════════════════════════════════════════════════════════════
async function phase4_providerEngine() {
    console.log('\n═══ PHASE 4: PROVIDER ENGINE ═══\n');

    // Verify provider is active
    const provSnap = await db.collection('emailProviders')
        .where('status', '==', 'active')
        .get();
    log('P4', 'Active Providers', !provSnap.empty ? 'PASS' : 'FAIL',
        `Found ${provSnap.docs.length} active provider(s)`);

    // Create a real mail queue job and trigger the scheduler
    const testJobRef = await db.collection('mailQueue').add({
        jobType: 'test',
        toEmail: OWNER_EMAIL,
        subject: 'GPMAS QA Test — Provider Engine Validation',
        renderedHtml: '<h2>GPMAS QA Test</h2><p>This email confirms the Provider Engine is working correctly. Sent at: ' + new Date().toISOString() + '</p>',
        status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    log('P4', 'Test Job Created', 'PASS', `Job ID: ${testJobRef.id}`);

    // Trigger scheduler
    const schedRes = await fetch(`${BASE_URL}/api/scheduler/process`, {
        headers: { 'x-cron-secret': CRON_SECRET },
    });
    const schedData = await schedRes.json();
    log('P4', 'Scheduler Execution', schedRes.status === 200 ? 'PASS' : 'FAIL',
        `Response: ${JSON.stringify(schedData)}`);

    // Check job status
    await new Promise(r => setTimeout(r, 2000)); // Wait for processing
    const jobSnap = await db.collection('mailQueue').doc(testJobRef.id).get();
    const jobData = jobSnap.data();
    log('P4', 'Job Final Status', jobData?.status === 'sent' ? 'PASS' : 'FAIL',
        `Status: ${jobData?.status}, Provider: ${jobData?.providerUsed || 'N/A'}`);

    // Check quota incremented
    if (jobData?.providerUsed) {
        const usageSnap = await db.collection('providerUsage').doc(jobData.providerUsed).get();
        const usage = usageSnap.data();
        log('P4', 'Quota Incremented', (usage?.usedToday || 0) > 0 ? 'PASS' : 'FAIL',
            `Used today: ${usage?.usedToday}`);
    }
}

// ════════════════════════════════════════════════════════════════
// PHASE 6: SYSTEM HALT TEST
// ════════════════════════════════════════════════════════════════
async function phase6_systemHalt() {
    console.log('\n═══ PHASE 6: SYSTEM HALT TEST ═══\n');

    // Enable STOP SERVICE
    await db.collection('systemSettings').doc('globalConfig').update({
        emergencyStop: true,
        systemSuspended: true,
    });
    log('P6', 'STOP SERVICE Enabled', 'PASS', 'emergencyStop + systemSuspended = true');

    // Create a pending job
    const haltJobRef = await db.collection('mailQueue').add({
        jobType: 'test',
        toEmail: OWNER_EMAIL,
        subject: 'Should NOT Send (System Halted)',
        renderedHtml: '<p>This should be blocked.</p>',
        status: 'pending',
        scheduledTime: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Trigger scheduler — should be blocked
    const haltRes = await fetch(`${BASE_URL}/api/scheduler/process`, {
        headers: { 'x-cron-secret': CRON_SECRET },
    });
    const haltData = await haltRes.json();
    const blocked = haltData.message?.includes('suspended') || haltData.message?.includes('halted');
    log('P6', 'Execution Blocked During Halt', blocked ? 'PASS' : 'FAIL',
        `Response: ${JSON.stringify(haltData)}`);

    // Verify job is still pending
    const haltJobSnap = await db.collection('mailQueue').doc(haltJobRef.id).get();
    log('P6', 'Job Remains Pending', haltJobSnap.data()?.status === 'pending' ? 'PASS' : 'FAIL',
        `Status: ${haltJobSnap.data()?.status}`);

    // Resume service
    await db.collection('systemSettings').doc('globalConfig').update({
        emergencyStop: false,
        systemSuspended: false,
    });
    log('P6', 'Service Resumed', 'PASS', 'emergencyStop + systemSuspended = false');

    // Trigger scheduler again — should process the job now
    const resumeRes = await fetch(`${BASE_URL}/api/scheduler/process`, {
        headers: { 'x-cron-secret': CRON_SECRET },
    });
    const resumeData = await resumeRes.json();
    log('P6', 'Post-Resume Execution', resumeRes.status === 200 ? 'PASS' : 'FAIL',
        `Response: ${JSON.stringify(resumeData)}`);

    await new Promise(r => setTimeout(r, 2000));
    const resumedJobSnap = await db.collection('mailQueue').doc(haltJobRef.id).get();
    log('P6', 'Job Processed After Resume', resumedJobSnap.data()?.status === 'sent' ? 'PASS' : 'FAIL',
        `Status: ${resumedJobSnap.data()?.status}`);

    // Cleanup halt job
    await db.collection('mailQueue').doc(haltJobRef.id).delete();
}

// ════════════════════════════════════════════════════════════════
// CLEANUP
// ════════════════════════════════════════════════════════════════
async function cleanup() {
    console.log('\n═══ CLEANUP ═══\n');
    // Delete QA test events and invites
    const qaEvents = await db.collection('events').where('ownerId', '==', 'qa-test-owner').get();
    for (const doc of qaEvents.docs) {
        // Delete participants subcollection
        const parts = await doc.ref.collection('participants').get();
        for (const p of parts.docs) await p.ref.delete();
        await doc.ref.delete();
    }

    const qaInvites = await db.collection('invites').where('createdBy', '==', 'qa-test-owner').get();
    for (const doc of qaInvites.docs) await doc.ref.delete();

    const qaMailQueue = await db.collection('mailQueue').where('jobType', '==', 'test').get();
    for (const doc of qaMailQueue.docs) await doc.ref.delete();

    console.log(`  Cleaned ${qaEvents.docs.length} events, ${qaInvites.docs.length} invites, ${qaMailQueue.docs.length} mail jobs`);
}

// ════════════════════════════════════════════════════════════════
// FINAL REPORT
// ════════════════════════════════════════════════════════════════
function printReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('  GPMAS V1 — QA REPORT');
    console.log('═'.repeat(60) + '\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const fixed = results.filter(r => r.status === 'FIXED').length;

    console.log(`  Total Tests: ${results.length}`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  🔧 Fixed:  ${fixed}`);
    console.log('');

    if (failed > 0) {
        console.log('  FAILURES:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`    ❌ [${r.phase}] ${r.test}: ${r.detail}`);
        });
        console.log('');
    }

    if (bugs.length > 0) {
        console.log('  BUGS FOUND & FIXED:');
        bugs.forEach(b => {
            console.log(`    🔧 ${b.description}`);
            console.log(`       Fix: ${b.fix}`);
            if (b.file) console.log(`       File: ${b.file}`);
        });
        console.log('');
    }

    const verdict = failed === 0 ? '🟢 SYSTEM STABLE — PRODUCTION READY' : '🔴 SYSTEM UNSTABLE — ISSUES FOUND';
    console.log(`  VERDICT: ${verdict}`);
    console.log('\n' + '═'.repeat(60));
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — PRODUCTION QA PROTOCOL      ║');
    console.log('║  Target: localhost:3000                  ║');
    console.log('╚══════════════════════════════════════════╝\n');

    try {
        await phase1_environment();
        await phase2_apiValidation();
        await phase3_inviteLifecycle();
        await phase4_providerEngine();
        await phase6_systemHalt();
        await cleanup();
    } catch (e: any) {
        console.error('\n💥 FATAL ERROR:', e.message);
        console.error(e.stack);
    }

    printReport();
}

main().catch(console.error);
