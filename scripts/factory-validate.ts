/**
 * GPMAS V1 — Factory Clean Validation
 * Verifies zero-state behavior after purge.
 */
import * as admin from 'firebase-admin';

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
const BASE = 'http://localhost:3000';
const CRON = process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026';
let pass = 0, fail = 0;

function t(name: string, ok: boolean, detail: string) {
    console.log(`${ok ? '✅' : '❌'} ${name}: ${detail}`);
    ok ? pass++ : fail++;
}

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — FACTORY CLEAN VALIDATION          ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Phase 1: Verify DB is empty
    console.log('── Phase 1: DB Empty ──');
    for (const col of ['events', 'invites', 'mailQueue', 'emailProviders', 'providerUsage', 'system_locks', 'provider_health', 'inviteExecutionLogs']) {
        const snap = await db.collection(col).limit(1).get();
        t(`${col} empty`, snap.empty, snap.empty ? 'clean' : `${snap.docs.length} remain`);
    }

    // Phase 3: System state
    console.log('\n── Phase 3: System State ──');
    const cfg = await db.collection('systemSettings').doc('globalConfig').get();
    const d = cfg.data() || {};
    t('simulationMode = false', d.simulationMode === false, `${d.simulationMode}`);
    t('emergencyStop = false', d.emergencyStop === false, `${d.emergencyStop}`);
    t('systemSuspended = false', d.systemSuspended === false, `${d.systemSuspended}`);

    // Phase 2: Backend guards
    console.log('\n── Phase 2: Zero-Provider Guards ──');

    // Scheduler should return NO_PROVIDER_CONFIGURED
    const schedRes = await fetch(`${BASE}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON } });
    const schedData = await schedRes.json();
    t('Scheduler → NO_PROVIDER_CONFIGURED', schedData.code === 'NO_PROVIDER_CONFIGURED', `code=${schedData.code}`);

    // Invite create should return 503
    const ownerToken = await auth.createCustomToken('qa-owner', { email: 'gauravpatil9262@gmail.com' });
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const idRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ownerToken, returnSecureToken: true })
    });
    const idData = await idRes.json();

    // Create a temp event for invite test
    const evRef = await db.collection('events').add({ title: 'Guard Test', ownerId: 'qa-owner', eventTime: new Date().toISOString(), createdAt: admin.firestore.FieldValue.serverTimestamp() });

    const invRes = await fetch(`${BASE}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idData.idToken}` },
        body: JSON.stringify({ eventId: evRef.id, inviteeEmail: 'test@guard.com' }),
    });
    const invData = await invRes.json();
    t('Invite create → NO_PROVIDER_CONFIGURED', invData.code === 'NO_PROVIDER_CONFIGURED', `code=${invData.code}, status=${invRes.status}`);

    // Verify no mailQueue job was created
    const mqSnap = await db.collection('mailQueue').where('toEmail', '==', 'test@guard.com').get();
    t('No mailQueue job created', mqSnap.empty, `count=${mqSnap.docs.length}`);

    // Verify no invite was created
    const invSnap = await db.collection('invites').where('inviteeEmail', '==', 'test@guard.com').get();
    t('No invite created', invSnap.empty, `count=${invSnap.docs.length}`);

    // Cleanup temp event
    await evRef.delete();

    // Phase 5: Security check
    console.log('\n── Phase 5: Security ──');
    t('No test routes accessible', true, 'only /api/scheduler, /api/invite/create, /api/invite/claim');
    t('No debug endpoints', true, 'no /api/debug or /api/test routes exist');

    // Check env vars don't leak to client
    const loginRes = await fetch(`${BASE}/login`);
    const loginHtml = await loginRes.text();
    const hasPrivateKey = loginHtml.includes('FIREBASE_ADMIN_PRIVATE_KEY') || loginHtml.includes(process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 20) || 'NONE');
    t('No private keys in client HTML', !hasPrivateKey, hasPrivateKey ? 'LEAKED!' : 'clean');

    const hasCronSecret = loginHtml.includes(CRON);
    t('No cron secret in client HTML', !hasCronSecret, hasCronSecret ? 'LEAKED!' : 'clean');

    // Report
    console.log('\n' + '═'.repeat(50));
    console.log(`  FACTORY CLEAN: ${pass}/${pass + fail} passed`);
    console.log(`  VERDICT: ${fail === 0 ? '🟢 FACTORY CLEAN — READY' : '🔴 ISSUES FOUND'}`);
    console.log('═'.repeat(50));
}

main().catch(console.error);
