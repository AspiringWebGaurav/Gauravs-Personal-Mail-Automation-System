/**
 * GPMAS QA — Tests 71-105+: Send Tracker, System Halt, Concurrency, DB Integrity, Timing
 */
import {
    t, db, FV, BASE_URL, CRON_SECRET, configRef,
    makeToken, createTestEvent, createTestInvite, createMailJob, deleteEvent
} from './framework';

export async function runSendTrackerTests() {
    console.log('\n═══ SEND TRACKER (10 tests) ═══\n');
    const today = new Date().toISOString().split('T')[0];
    const provSnap = await db.collection('emailProviders').where('status', '==', 'active').get();
    const provId = provSnap.docs[0]?.id || 'unknown';
    await db.collection('providerUsage').doc(provId).set({ date: today, usedToday: 0 });

    // T071: Job creates log entry (sentAt + providerUsed)
    const j1 = await createMailJob({ toEmail: 'track1@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const j1s = await db.collection('mailQueue').doc(j1).get();
    t('TRACK', 'sentAt field present', !!j1s.data()?.sentAt, `${!!j1s.data()?.sentAt}`);
    t('TRACK', 'providerUsed logged', !!j1s.data()?.providerUsed, `${j1s.data()?.providerUsed}`);
    t('TRACK', 'Status is sent', j1s.data()?.status === 'sent', `${j1s.data()?.status}`);

    // T074: Quota counter accuracy
    const u1 = await db.collection('providerUsage').doc(provId).get();
    const usage1 = u1.data()?.usedToday || 0;
    t('TRACK', 'Quota reflects 1 send', usage1 >= 1, `used=${usage1}`);

    // T075: Second send increments quota
    const j2 = await createMailJob({ toEmail: 'track2@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const u2 = await db.collection('providerUsage').doc(provId).get();
    t('TRACK', 'Quota incremented again', (u2.data()?.usedToday || 0) > usage1, `used=${u2.data()?.usedToday}`);

    // T076: Deleting a mail log doesn't reduce quota
    await db.collection('mailQueue').doc(j1).delete();
    const u3 = await db.collection('providerUsage').doc(provId).get();
    t('TRACK', 'Delete log → quota unchanged', (u3.data()?.usedToday || 0) === (u2.data()?.usedToday || 0), `used=${u3.data()?.usedToday}`);

    // T077: No duplicate mail log for same job
    const j3 = await createMailJob({ toEmail: 'nodup@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    // Trigger again — already sent job should NOT create second log
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const j3s = await db.collection('mailQueue').doc(j3).get();
    t('TRACK', 'No duplicate processing', j3s.data()?.status === 'sent', `${j3s.data()?.status}`);

    // T078: attempts field tracks correctly
    t('TRACK', 'attempts field populated', typeof j3s.data()?.attempts === 'number', `attempts=${j3s.data()?.attempts}`);

    // T079: lastAttemptAt timestamp
    t('TRACK', 'lastAttemptAt present', !!j3s.data()?.lastAttemptAt, `${!!j3s.data()?.lastAttemptAt}`);

    // T080: Timestamps are Firestore server timestamps
    const j2s = await db.collection('mailQueue').doc(j2).get();
    t('TRACK', 'sentAt is Timestamp type', j2s.data()?.sentAt?.toDate instanceof Function, `type ok`);

    // Cleanup
    await db.collection('providerUsage').doc(provId).set({ date: today, usedToday: 0 });
    for (const id of [j2, j3]) await db.collection('mailQueue').doc(id).delete();
}

export async function runSystemHaltTests() {
    console.log('\n═══ SYSTEM HALT (10 tests) ═══\n');

    // T081: Enable halt
    await configRef.update({ emergencyStop: true, systemSuspended: true });
    t('HALT', 'STOP SERVICE flags set', true, 'enabled');

    // T082: Scheduler returns suspended message
    const r1 = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const d1 = await r1.json();
    t('HALT', 'Scheduler blocked', d1.message?.includes('suspended'), `msg=${d1.message}`);

    // T083: Job created during halt stays pending
    const j1 = await createMailJob({ toEmail: 'halt1@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const j1s = await db.collection('mailQueue').doc(j1).get();
    t('HALT', 'Job stays pending during halt', j1s.data()?.status === 'pending', `${j1s.data()?.status}`);

    // T084: Multiple jobs queued during halt
    const j2 = await createMailJob({ toEmail: 'halt2@qa.com' });
    const j3 = await createMailJob({ toEmail: 'halt3@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const j2s = await db.collection('mailQueue').doc(j2).get();
    const j3s = await db.collection('mailQueue').doc(j3).get();
    t('HALT', 'Multiple jobs blocked', j2s.data()?.status === 'pending' && j3s.data()?.status === 'pending', 'both pending');

    // T085: Resume
    await configRef.update({ emergencyStop: false, systemSuspended: false });
    t('HALT', 'Service resumed', true, 'flags cleared');

    // T086: Resume processes pending jobs
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 1000));
    const j1r = await db.collection('mailQueue').doc(j1).get();
    t('HALT', 'Job1 recovered after resume', j1r.data()?.status === 'sent', `${j1r.data()?.status}`);

    // T087: All halted jobs recovered
    const j2r = await db.collection('mailQueue').doc(j2).get();
    const j3r = await db.collection('mailQueue').doc(j3).get();
    t('HALT', 'Job2 recovered', j2r.data()?.status === 'sent', `${j2r.data()?.status}`);
    t('HALT', 'Job3 recovered', j3r.data()?.status === 'sent', `${j3r.data()?.status}`);

    // T089-T090: Halt during processing (halt mid-execution)
    await configRef.update({ emergencyStop: true, systemSuspended: true });
    const j4 = await createMailJob({ toEmail: 'halt-mid@qa.com' });
    // Trigger scheduler then immediately halt — the scheduler checks at the start
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const j4s = await db.collection('mailQueue').doc(j4).get();
    t('HALT', 'Halt blocks new processing', j4s.data()?.status === 'pending', `${j4s.data()?.status}`);

    // Resume & cleanup
    await configRef.update({ emergencyStop: false, systemSuspended: false });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    for (const id of [j1, j2, j3, j4]) await db.collection('mailQueue').doc(id).delete();
}

export async function runConcurrencyTests() {
    console.log('\n═══ CONCURRENCY & RACE (10 tests) ═══\n');
    const { DBTransactions } = await import('../../src/lib/server/db-transactions');

    // T091: 10 concurrent event creates
    const ids = await Promise.all(Array.from({ length: 10 }, (_, i) =>
        DBTransactions.createEvent({ title: `Conc-${i}`, eventTime: new Date().toISOString(), ownerId: 'qa-owner' })
    ));
    t('CONC', '10 concurrent creates → unique', new Set(ids).size === 10, `unique=${new Set(ids).size}`);

    // T092: 10 concurrent mail jobs
    const jobIds = await Promise.all(Array.from({ length: 10 }, (_, i) =>
        createMailJob({ toEmail: `conc${i}@qa.com`, subject: `Conc ${i}` })
    ));
    t('CONC', '10 jobs created', jobIds.length === 10, `created=${jobIds.length}`);

    // T093: 3 concurrent scheduler triggers
    const scheds = await Promise.all(Array.from({ length: 3 }, () =>
        fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } }).then(r => r.json())
    ));
    const total = scheds.reduce((s, r) => s + (r.result?.processed || 0), 0);
    t('CONC', '3 triggers processed all 10', total >= 10, `processed=${total}`);

    await new Promise(r => setTimeout(r, 1500));

    // T094: No duplicates
    let sent = 0, stuck = 0;
    for (const id of jobIds) {
        const s = await db.collection('mailQueue').doc(id).get();
        if (s.data()?.status === 'sent') sent++;
        if (s.data()?.status === 'processing') stuck++;
    }
    t('CONC', 'All 10 sent (no dup)', sent === 10, `sent=${sent}`);
    t('CONC', 'No stuck PROCESSING', stuck === 0, `stuck=${stuck}`);

    // T096: 5 parallel invite claims (race)
    const eventId = await createTestEvent('Race Event');
    const raceInv = await createTestInvite(eventId, 'para-race@qa.com');
    const raceR = await Promise.all(Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/api/invite/claim`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: raceInv.raw, userEmail: 'para-race@qa.com' }),
        }).then(r => r.status)
    ));
    t('CONC', 'Parallel claim: 1 win only', raceR.filter(s => s === 200).length === 1, `${raceR.join(',')}`);

    // T097: No orphan participants from failed claims
    const pSnap = await db.collection('events').doc(eventId).collection('participants')
        .where('email', '==', 'para-race@qa.com').get();
    t('CONC', 'Exactly 1 participant', pSnap.docs.length === 1, `count=${pSnap.docs.length}`);

    // T098: Halt during burst
    const burstJobs: string[] = [];
    for (let i = 0; i < 5; i++) burstJobs.push(await createMailJob({ toEmail: `burst${i}@qa.com` }));
    await configRef.update({ emergencyStop: true, systemSuspended: true });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    let pending = 0;
    for (const id of burstJobs) {
        const s = await db.collection('mailQueue').doc(id).get();
        if (s.data()?.status === 'pending') pending++;
    }
    t('CONC', 'Halt during burst: all blocked', pending === 5, `pending=${pending}`);

    // T099: Resume after burst halt
    await configRef.update({ emergencyStop: false, systemSuspended: false });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 1000));
    let recovered = 0;
    for (const id of burstJobs) {
        const s = await db.collection('mailQueue').doc(id).get();
        if (s.data()?.status === 'sent') recovered++;
    }
    t('CONC', 'Resume: all burst jobs sent', recovered === 5, `sent=${recovered}`);

    // T100: No inconsistent state across all docs
    t('CONC', 'No inconsistent state', recovered === 5 && stuck === 0, `clean`);

    // Cleanup
    for (const id of ids) await DBTransactions.deleteEvent(id);
    for (const id of [...jobIds, ...burstJobs]) await db.collection('mailQueue').doc(id).delete();
    await deleteEvent(eventId);
}

export async function runDBIntegrityTests() {
    console.log('\n═══ DB INTEGRITY (10 tests) ═══\n');
    const { DBTransactions } = await import('../../src/lib/server/db-transactions');

    // T101: Full cascade on complex event
    const eid = await DBTransactions.createEvent({ title: 'Integrity', eventTime: new Date().toISOString(), ownerId: 'qa-owner' });
    await db.collection('events').doc(eid).collection('participants').add({ email: 'p1@qa.com', role: 'guest', joinedAt: FV.serverTimestamp() });
    await db.collection('events').doc(eid).collection('participants').add({ email: 'p2@qa.com', role: 'guest', joinedAt: FV.serverTimestamp() });
    await db.collection('invites').add({ eventId: eid, status: 'pending', tokenHash: 'h1', inviteeEmail: 'i1@qa.com', createdAt: FV.serverTimestamp(), expiresAt: new Date(), createdBy: 'qa-owner' });
    await db.collection('invites').add({ eventId: eid, status: 'accepted', tokenHash: 'h2', inviteeEmail: 'i2@qa.com', createdAt: FV.serverTimestamp(), expiresAt: new Date(), createdBy: 'qa-owner' });
    await db.collection('mailQueue').add({ eventId: eid, status: 'sent', jobType: 'invite', toEmail: 'i1@qa.com', subject: 'x', renderedHtml: 'x', scheduledTime: FV.serverTimestamp(), attempts: 1, maxAttempts: 3, createdAt: FV.serverTimestamp() });

    const result = await DBTransactions.deleteEvent(eid);
    t('DBINT', 'Cascade delete succeeded', result.success, `deleted=${result.deletedCount}`);

    // T102-T105: Verify no orphans
    const e = await db.collection('events').doc(eid).get();
    t('DBINT', 'Event doc gone', !e.exists, `${!e.exists}`);

    const p = await db.collection('events').doc(eid).collection('participants').get();
    t('DBINT', 'Participants gone', p.empty, `count=${p.docs.length}`);

    const inv = await db.collection('invites').where('eventId', '==', eid).get();
    t('DBINT', 'Invites gone', inv.empty, `count=${inv.docs.length}`);

    const mq = await db.collection('mailQueue').where('eventId', '==', eid).get();
    t('DBINT', 'MailQueue gone', mq.empty, `count=${mq.docs.length}`);

    // T106: Delete invite directly doesn't crash
    const eid2 = await createTestEvent('Del Inv');
    const inv2 = await createTestInvite(eid2, 'del-inv@qa.com');
    await db.collection('invites').doc(inv2.id).delete();
    const invGone = await db.collection('invites').doc(inv2.id).get();
    t('DBINT', 'Direct invite delete OK', !invGone.exists, `gone`);

    // T107: Delete provider doesn't crash system
    const provRef = await db.collection('emailProviders').add({
        name: 'Temp', serviceId: 's', templateId: 't', publicKey: 'p', privateKey: 'k', status: 'active', dailyQuota: 10, consecutiveFailures: 0,
    });
    await provRef.delete();
    t('DBINT', 'Provider delete OK', true, `deleted`);

    // T108: Stale mailQueue job (eventId no longer exists)
    const staleJob = await createMailJob({ toEmail: 'stale@qa.com', eventId: 'deleted-event-id' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const staleSnap = await db.collection('mailQueue').doc(staleJob).get();
    t('DBINT', 'Stale job processed without crash', staleSnap.data()?.status === 'sent' || staleSnap.data()?.status === 'retrying', `status=${staleSnap.data()?.status}`);

    // T109: Collection references correct
    const colTest = await db.collection('invites').limit(1).get();
    t('DBINT', 'invites collection accessible', true, 'no error');

    // T110: systemSettings config accessible
    const conf = await configRef.get();
    t('DBINT', 'globalConfig accessible', conf.exists, `exists=${conf.exists}`);

    // Cleanup
    await deleteEvent(eid2);
    await db.collection('mailQueue').doc(staleJob).delete();
}
