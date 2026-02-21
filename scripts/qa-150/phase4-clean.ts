import { adminDb } from '../../src/lib/firebase/admin';

async function performFactoryClean() {
    console.log('\n--- PHASE 4: FINAL FACTORY CLEAN ---');

    // 1. Reset Global Config
    await adminDb.collection('systemSettings').doc('globalConfig').set({
        simulationMode: false,
        emergencyStop: false,
        systemSuspended: false,
        simulateFailProvider: null,
        simulateQuotaExhausted: null
    }, { merge: true });

    // 2. Clear all dynamic collections
    const collectionsToPurge = [
        'emailProviders',
        'providerUsage',
        'events',
        'invites',
        'participants',
        'mailQueue',
        'operations',
        'counters'
    ];

    let totalDeleted = 0;

    for (const col of collectionsToPurge) {
        const snap = await adminDb.collection(col).get();
        if (snap.empty) continue;

        const batch = adminDb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log(`🧹 Purged ${snap.docs.length} documents from ${col}`);
        totalDeleted += snap.docs.length;
    }

    console.log(`\n✅ FACTORY CLEAN COMPLETE. ${totalDeleted} documents purged.`);
    console.log('System is now in a pristine Zero-Provider 0-state ready for production deployment.');
    process.exit(0);
}

performFactoryClean().catch(console.error);
