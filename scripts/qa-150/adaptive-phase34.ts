import { adminDb, t, runScheduler, wait, createTestEvent, createScheduledReminder } from './framework';
import { ProviderEngine } from '@/lib/server/providerEngine';

export async function runAdaptivePhase3() {
    console.log('\n═══ PHASE 3: LIVE FAILURE INJECTION & ALGORITHMIC DECAY ═══\n');

    const e = await createTestEvent('Phase3_Failure', new Date(Date.now() - 5000));
    const testFractions = [0.3, 0.5, 0.7];

    for (const failRate of testFractions) {
        console.log(`\n[SIM] Activating Global Network Failure Condition: ${failRate * 100}% Failure Rate`);

        await adminDb.collection('systemSettings').doc('globalConfig').set({
            simulationMode: true,
            simulateGlobalFailRate: failRate
        }, { merge: true });

        // Dispatch 20 concurrent jobs under condition
        const jobs = [];
        for (let j = 0; j < 20; j++) {
            jobs.push(await createScheduledReminder(e, `fail_${failRate}_${j}@qa.com`, new Date(Date.now() - 5000)));
        }

        // Processing Loop
        await runScheduler();
        await wait(200);

        let sentOut = 0;
        for (const j of jobs) {
            const d = (await adminDb.collection('mailQueue').doc(j).get()).data();
            if (d?.status === 'sent') sentOut++;
        }

        t('Ph3', `System routed around ${failRate * 100}% Network Apocalpyse securely`, sentOut === 20, `sent=${sentOut}`);
    }

    // Clear Fail Rate
    await adminDb.collection('systemSettings').doc('globalConfig').set({
        simulateGlobalFailRate: 0
    }, { merge: true });

    // Prove Penalty Scores tracked 
    const providers = await ProviderEngine.getViableProviders();
    let anySuspended = false;
    let maxFails = 0;

    const allSnaps = await adminDb.collection('emailProviders').get();
    for (const d of allSnaps.docs) {
        const data = d.data();
        if (data.status === 'suspended') anySuspended = true;
        if (data.failureCount > maxFails) maxFails = data.failureCount;
    }

    t('Ph3', `Engine dynamically suspended degraded network nodes automatically`, anySuspended, `anySuspended=${anySuspended}`);
    t('Ph3', `Engine tracked algorithmic penalty weights definitively (Max Fails: ${maxFails})`, maxFails > 0, `maxFails=${maxFails}`);
}

export async function runAdaptivePhase4() {
    console.log('\n═══ PHASE 4: QUOTA EXHAUSTION LIVE MID-FLIGHT ═══\n');

    const e = await createTestEvent('Phase4_Quota', new Date(Date.now() - 5000));
    const jobs = [];
    for (let j = 0; j < 30; j++) {
        jobs.push(await createScheduledReminder(e, `quota_${j}@qa.com`, new Date(Date.now() - 5000)));
    }

    const p1 = runScheduler();

    // Kill top 5 quotas midway through loop
    const providers = await ProviderEngine.getViableProviders();
    const batch = adminDb.batch();
    for (let i = 0; i < 5; i++) {
        const pid = providers[i].id;
        const pRef = adminDb.collection('providerUsage').doc(pid);
        batch.update(pRef, { usedToday: 10000 }); // Cap it immediately
    }
    await batch.commit();
    console.log(`[SIM] Exhausted Quota deliberately on 5 active nodes mid-flight.`);

    const p2 = runScheduler();
    await Promise.all([p1, p2]);

    let sentOut = 0;
    for (const j of jobs) {
        const d = (await adminDb.collection('mailQueue').doc(j).get()).data();
        if (d?.status === 'sent') sentOut++;
    }

    t('Ph4', `Pipeline accurately diverted remaining jobs to unbound nodes seamlessly`, sentOut === 30, `sent=${sentOut}`);

    // Wait and sweep exhausted providers to assert their status
    let exhaustedMarked = 0;
    const finalSnaps = await adminDb.collection('emailProviders').get();
    finalSnaps.docs.forEach(d => {
        if (d.data().status === 'exhausted') exhaustedMarked++;
    });

    t('Ph4', `Engine formally isolated exhausted constraints statically`, exhaustedMarked >= 5, `exhausted=${exhaustedMarked}`);
}
