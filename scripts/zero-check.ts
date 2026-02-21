import * as admin from 'firebase-admin';

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
}
const db = admin.firestore();

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — ZERO-STATE DATABASE AUDIT          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    let fail = false;

    const collections = [
        'emailProviders',
        'providerUsage',
        'provider_health',
        'mailQueue',
        'events',
        'invites',
        'inviteExecutionLogs',
        'system_locks',
        'operations'
    ];

    console.log('── Database Node Status ──');
    for (const name of collections) {
        const snap = await db.collection(name).limit(1).get();
        if (snap.empty) {
            console.log(`✅ ${name.padEnd(20, ' ')} [EMPTY: 0 Records]`);
        } else {
            console.log(`❌ ${name.padEnd(20, ' ')} [CONTAINS DATA]`);
            fail = true;
        }
    }

    console.log('\n── Global Configurations ──');
    const cfg = await db.collection('systemSettings').doc('globalConfig').get();
    const data = cfg.data() || {};

    if (data.simulationMode === false || data.simulationMode === undefined) {
        console.log(`✅ simulationMode     [FALSE/CLEAN]`);
    } else {
        console.log(`❌ simulationMode     [${data.simulationMode}]`);
        fail = true;
    }

    console.log('\n' + '═'.repeat(50));
    if (fail) {
        console.log('🔴 AUDIT FAILED: System is dirty. Providers/Stats > 0');
        process.exit(1);
    } else {
        console.log('🟢 AUDIT PASSED: Perfect Absolute ZERO-STATE Client Ready');
        process.exit(0);
    }
}

main().catch(e => { console.error('FAIL', e); process.exit(1); });
