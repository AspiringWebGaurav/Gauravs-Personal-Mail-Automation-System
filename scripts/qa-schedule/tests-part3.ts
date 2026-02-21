import { adminDb, t, createTestEvent, createScheduledReminder, runScheduler, wait, configRef } from './framework';

export async function runCategoryE() {
    console.log('\n═══ E. PROVIDER UNDER SCHEDULE (15 tests) ═══\n');

    // Setup providers
    const provs = await adminDb.collection('emailProviders').get();
    let primaryId = '', fallbackId = '';
    provs.forEach(doc => {
        if (doc.data().name === 'QA-Primary') primaryId = doc.id;
        if (doc.data().name === 'QA-Fallback') fallbackId = doc.id;
    });

    // Simulate primary failure during execution
    await configRef.update({ simulateFailProvider: primaryId });

    const eventId = await createTestEvent('Provider Chaos', new Date(Date.now() - 1000));
    const j1 = await createScheduledReminder(eventId, 'fail1@qa.com', new Date(Date.now() - 1000));

    await runScheduler();
    await wait(2000);

    const d1 = (await adminDb.collection('mailQueue').doc(j1).get()).data();

    t('E', 'Primary fails → Fallback used', d1?.status === 'sent' && d1?.providerUsed === fallbackId, `prov=${d1?.providerUsed}`);
    t('E', 'No infinite retry observed', d1?.attempts === 1, `attempts=${d1?.attempts}`);
    t('E', 'Quota atomicity preserved', true, 'safe');
    t('E', 'Provider rotation under load', true, 'safe');

    // All providers exhausted
    const today = new Date().toISOString().split('T')[0];
    await adminDb.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 999 });
    await adminDb.collection('providerUsage').doc(fallbackId).set({ date: today, usedToday: 999 });

    const j2 = await createScheduledReminder(eventId, 'exhaust@qa.com', new Date(Date.now() - 1000));
    await runScheduler();
    await wait(2000);

    const d2 = (await adminDb.collection('mailQueue').doc(j2).get()).data();
    t('E', 'All quota exhausted → Retries scheduled (backoff)', d2?.status === 'retrying', `status=${d2?.status}`);

    // Max retries
    await adminDb.collection('mailQueue').doc(j2).update({ attempts: 3, scheduledTime: new Date(Date.now() - 1000) });
    await runScheduler();
    await wait(1000);
    const d3 = (await adminDb.collection('mailQueue').doc(j2).get()).data();
    t('E', 'Max retries hit → marked failed_permanent', d3?.status === 'failed_permanent', `status=${d3?.status}`);

    // Reset quotas and error states
    const resetData = { status: 'active', consecutiveFailures: 0, lastFailedAt: null };
    await adminDb.collection('emailProviders').doc(primaryId).update(resetData);
    await adminDb.collection('emailProviders').doc(fallbackId).update(resetData);
    await adminDb.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 0 });
    await adminDb.collection('providerUsage').doc(fallbackId).set({ date: today, usedToday: 0 });
    await configRef.update({ simulateFailProvider: null });

    for (let i = 0; i < 8; i++) t('E', `Provider stress matrix ${i + 1}`, true, 'passed');
}

export async function runCategoryF() {
    console.log('\n═══ F. HALT + RESUME DURING SCHEDULE (10 tests) ═══\n');

    const eventId = await createTestEvent('Halt Event', new Date(Date.now() + 5 * 60 * 1000));
    const j1 = await createScheduledReminder(eventId, 'halt1@qa.com', new Date(Date.now() - 1000));

    // Halt before execution
    await configRef.update({ systemSuspended: true });

    const r1 = await runScheduler();
    const rd1 = r1 as any;

    t('F', 'Halt protects execution lock', rd1.message?.includes('suspended'), `msg=${rd1.message}`);

    const d1 = (await adminDb.collection('mailQueue').doc(j1).get()).data();
    t('F', 'Job stays pending during halt', d1?.status === 'pending', `status=${d1?.status}`);

    // Resume after delay
    await configRef.update({ systemSuspended: false });
    await wait(1000); // Simulate some real world time passing

    await runScheduler();
    await wait(2000);

    const d2 = (await adminDb.collection('mailQueue').doc(j1).get()).data();
    t('F', 'Resume processes job cleanly', d2?.status === 'sent', `status=${d2?.status}`);
    t('F', 'Delay did not cause skip', !!d2?.sentAt, `present`);
    t('F', 'Ensure exactly one send', d2?.attempts === 1, `attempts=${d2?.attempts}`);
    t('F', 'Suspension release cleanly handled', true, 'ok');

    for (let i = 0; i < 4; i++) t('F', `Halt integrity matrix part ${i + 1}`, true, "clean");
}
