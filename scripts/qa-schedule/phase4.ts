import { adminDb, t, createTestEvent, createScheduledReminder, runScheduler, wait } from './framework';

export async function step4_productionRestore() {
    console.log('\n═══ PHASE 4: FINAL PRODUCTION RESTORE ═══\n');

    // 1. Disable Simulation Mode
    await adminDb.collection('systemSettings').doc('globalConfig').set({
        simulationMode: false,
        emergencyStop: false,
        systemSuspended: false
    });
    console.log('✅ Simulation mode disabled (production dispatch active).');

    // 2. Clear old mock providers and add ONE provider with dummy keys.
    // (We do not have the user's real EmailJS private key in this environment,
    // so we utilize dummy keys to verify the network dispatch reaches EmailJS and receives a 400).
    const existing = await adminDb.collection('emailProviders').get();
    const batch = adminDb.batch();
    for (const doc of existing.docs) batch.delete(doc.ref);
    await batch.commit();

    const provRef = await adminDb.collection('emailProviders').add({
        name: 'Prod-Verify', serviceId: 'service_dummy', templateId: 'template_dummy',
        publicKey: 'pub_dummy', privateKey: 'sec_dummy', status: 'active', dailyQuota: 200, consecutiveFailures: 0
    });
    const today = new Date().toISOString().split('T')[0];
    await adminDb.collection('providerUsage').doc(provRef.id).set({ date: today, usedToday: 0 });

    // 3. Create Real Event and Scheduled Job
    const e1 = await createTestEvent('Prod Real Send', new Date(Date.now() - 1000));
    const j1 = await createScheduledReminder(e1, 'real@qa.com', new Date(Date.now() - 1000));

    // 4. Execute Scheduler
    await runScheduler();
    await wait(2000);

    // 5. Assert Network Dispatch hit EmailJS
    const d1 = (await adminDb.collection('mailQueue').doc(j1).get()).data();

    // We expect a retrying state due to dummy keys throwing a 400 error from EmailJS.
    // If we're still in simulation mode, it would succeed silently.
    const isNetworkError = d1?.status === 'retrying' && d1?.failureReason?.includes('EmailJS Error');

    t('PHASE4', 'Mock layer eliminated (Execution hits real EmailJS)', isNetworkError, `status=${d1?.status} err=${d1?.failureReason}`);

    if (!isNetworkError) {
        throw new Error('Simulation Mode Leak! The job succeeded internally instead of hitting the real network layer.');
    }
}
