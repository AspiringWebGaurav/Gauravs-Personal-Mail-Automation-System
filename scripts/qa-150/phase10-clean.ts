import { adminDb } from './framework';

async function performHardFactoryClean() {
    console.log('\n--- PHASE 10: FINAL FACTORY CLEAN ---');

    // 1. Reset Global Config to False (No simulation)
    await adminDb.collection('systemSettings').doc('globalConfig').set({
        simulationMode: false,
        emergencyStop: false,
        systemSuspended: false,
        crashBeforeLock: false,
        crashAfterLockBeforeStatus: false,
        crashAfterStatusBeforeProvider: false,
        crashAfterProviderBeforeQuota: false,
        crashAfterQuotaBeforeSent: false,
        crashAfterSentBeforeLog: false,
        artificialDelayBeforeCommit: 0
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

    console.log(`\n✅ FACTORY FINAL HARD CLEAN COMPLETE. ${totalDeleted} documents purged.`);
    console.log('System is now in a pristine Zero-Provider 0-state ready for production deployment.');
    console.log('Simulation Mode is structurally and globally OFF.');
    process.exit(0);
}

performHardFactoryClean().catch(console.error);
