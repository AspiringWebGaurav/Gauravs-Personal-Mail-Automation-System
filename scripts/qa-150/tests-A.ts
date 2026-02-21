import { adminDb, t, createTestEvent, createScheduledReminder, runScheduler, wait, createProvider } from './framework';

export async function runSuiteA() {
    console.log('\n═══ A. NORMAL SCHEDULED FLOWS (12 TESTS) ═══\n');
    const p1 = await createProvider('A_Prov', 500);

    // 1. Exact Time
    const ext = new Date(Date.now() - 500);
    const e1 = await createTestEvent('Event 1 Exact', ext);
    const j1 = await createScheduledReminder(e1, 'ext@qa.com', ext);
    await runScheduler();
    const d1 = (await adminDb.collection('mailQueue').doc(j1).get()).data();
    t('A', 'Exact time schedule processed', d1?.status === 'sent', `status=${d1?.status}`);
    t('A', 'Exactly-once execution holds (ext)', d1?.attempts === 1, `attempts=${d1?.attempts}`);

    // 2. Delay (Past due by 5 mins)
    const del = new Date(Date.now() - 5 * 60 * 1000);
    const e2 = await createTestEvent('Event 2 Delay', del);
    const j2 = await createScheduledReminder(e2, 'del@qa.com', del);
    await runScheduler();
    const d2 = (await adminDb.collection('mailQueue').doc(j2).get()).data();
    t('A', 'Past due schedule processes immediately', d2?.status === 'sent', `status=${d2?.status}`);
    t('A', 'Exactly-once execution holds (del)', d2?.attempts === 1, `attempts=${d2?.attempts}`);

    // 3. Before Time (Future) by 1 min
    const fut = new Date(Date.now() + 60 * 1000);
    const e3 = await createTestEvent('Event 3 Fut', fut);
    const j3 = await createScheduledReminder(e3, 'fut@qa.com', fut);
    await runScheduler();
    const d3 = (await adminDb.collection('mailQueue').doc(j3).get()).data();
    t('A', 'Early schedule MUST REMAIN PENDING', d3?.status === 'pending', `status=${d3?.status}`);
    t('A', 'No attempts made on early job', d3?.attempts === 0, `attempts=${d3?.attempts}`);

    // 4. Before Time (Future) by 1 day
    const tmr = new Date(Date.now() + 86400 * 1000);
    const e4 = await createTestEvent('Event 4 Tmr', tmr);
    const j4 = await createScheduledReminder(e4, 'tmr@qa.com', tmr);
    await runScheduler();
    const d4 = (await adminDb.collection('mailQueue').doc(j4).get()).data();
    t('A', 'Tomorrow schedule MUST REMAIN PENDING', d4?.status === 'pending', `status=${d4?.status}`);

    // 5. Multiple Events at exactly same second
    const simTime = new Date(Date.now() - 1000);
    const j5a = await createScheduledReminder('SimEventA', 'sima@qa.com', simTime);
    const j5b = await createScheduledReminder('SimEventB', 'simb@qa.com', simTime);
    const j5c = await createScheduledReminder('SimEventC', 'simc@qa.com', simTime);
    await runScheduler();
    const d5a = (await adminDb.collection('mailQueue').doc(j5a).get()).data();
    const d5b = (await adminDb.collection('mailQueue').doc(j5b).get()).data();
    const d5c = (await adminDb.collection('mailQueue').doc(j5c).get()).data();

    t('A', 'Simultaneous event A dispatched', d5a?.status === 'sent', `status=${d5a?.status}`);
    t('A', 'Simultaneous event B dispatched', d5b?.status === 'sent', `status=${d5b?.status}`);
    t('A', 'Simultaneous event C dispatched', d5c?.status === 'sent', `status=${d5c?.status}`);

    // 6. Quota check
    const usage = (await adminDb.collection('providerUsage').doc(p1).get()).data();
    t('A', 'Provider quota strictly increments by 5', usage?.usedToday === 5, `used=${usage?.usedToday}`);
    t('A', 'No ghost decrements occurred', usage?.usedToday >= 5, 'safe');
}
