/**
 * GPMAS V1 — Factory Purge Script
 * Deletes ALL documents from ALL collections.
 * Then sets clean system state.
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

const COLLECTIONS = [
    'events', 'invites', 'mailQueue', 'emailProviders', 'providerUsage',
    'systemSettings', 'system_locks', 'provider_health', 'inviteExecutionLogs',
    'tokenInvites', 'invitations', 'auditLogs', 'mail_logs',
];

async function purgeCollection(name: string) {
    const snap = await db.collection(name).limit(500).get();
    if (snap.empty) { console.log(`  ✓ ${name}: already empty`); return 0; }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  🗑 ${name}: deleted ${snap.docs.length} docs`);

    // Also delete subcollections for events (participants)
    if (name === 'events') {
        for (const doc of snap.docs) {
            const subs = await doc.ref.collection('participants').get();
            if (!subs.empty) {
                const subBatch = db.batch();
                subs.docs.forEach(d => subBatch.delete(d.ref));
                await subBatch.commit();
                console.log(`    └─ participants: deleted ${subs.docs.length}`);
            }
        }
    }
    return snap.docs.length;
}

async function main() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — FACTORY PURGE                 ║');
    console.log('╚════════════════════════════════════════════╝\n');

    let total = 0;
    for (const col of COLLECTIONS) {
        total += await purgeCollection(col);
    }

    // Set clean system state
    console.log('\n── Setting clean system state ──');
    await db.collection('systemSettings').doc('globalConfig').set({
        simulationMode: false,
        emergencyStop: false,
        systemSuspended: false,
    });
    console.log('  ✓ globalConfig: clean production state');

    // Verify
    console.log('\n── Verification ──');
    for (const col of COLLECTIONS.filter(c => c !== 'systemSettings')) {
        const check = await db.collection(col).limit(1).get();
        const status = check.empty ? '✅' : '❌';
        console.log(`  ${status} ${col}: ${check.empty ? 'empty' : `${check.docs.length} remaining!`}`);
    }
    const config = await db.collection('systemSettings').doc('globalConfig').get();
    const d = config.data();
    console.log(`  ✅ globalConfig: sim=${d?.simulationMode}, halt=${d?.emergencyStop}, suspended=${d?.systemSuspended}`);

    console.log(`\n  Total purged: ${total} documents`);
    console.log('  🏭 Factory state achieved.\n');
}

main().catch(console.error);
