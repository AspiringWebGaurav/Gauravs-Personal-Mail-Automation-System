/**
 * GPMAS QA — Tests 36-70: Invite System (20) + Provider Engine (15)
 */
import {
    t, db, FV, BASE_URL, CRON_SECRET, configRef,
    getOwnerIdToken, makeToken, createTestEvent, createTestInvite,
    createMailJob, deleteEvent
} from './framework';

export async function runInviteSystemTests() {
    console.log('\n═══ INVITE SYSTEM (20 tests) ═══\n');
    const token = await getOwnerIdToken();
    const eventId = await createTestEvent('Invite Event');

    // T036: Create invite via API
    const r1 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'inv1@qa.com' }),
    });
    const d1 = await r1.json();
    t('INV', 'Create invite → 200', r1.status === 200, `id=${d1.inviteId}`);

    // T037: Invite doc created in Firestore
    const invSnap = await db.collection('invites').doc(d1.inviteId).get();
    t('INV', 'Invite doc persisted', invSnap.exists, `exists=${invSnap.exists}`);

    // T038: Status is pending
    t('INV', 'Initial status = pending', invSnap.data()?.status === 'pending', `${invSnap.data()?.status}`);

    // T039: tokenHash is populated
    t('INV', 'tokenHash populated', !!invSnap.data()?.tokenHash, `${!!invSnap.data()?.tokenHash}`);

    // T040: expiresAt set
    t('INV', 'expiresAt set', !!invSnap.data()?.expiresAt, `${!!invSnap.data()?.expiresAt}`);

    // T041: MailQueue job created for invite
    const mqSnap = await db.collection('mailQueue').where('inviteId', '==', d1.inviteId).get();
    t('INV', 'MailQueue job auto-created', !mqSnap.empty, `count=${mqSnap.docs.length}`);

    // T042: Duplicate invite → 409
    const r2 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'inv1@qa.com' }),
    });
    t('INV', 'Duplicate invite → 409', r2.status === 409, `${r2.status}`);

    // T043: Different email → new invite OK
    const r3 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'inv2@qa.com' }),
    });
    t('INV', 'Different email → 200', r3.status === 200, `${r3.status}`);

    // T044: Token uniqueness
    const d3 = await r3.json();
    const inv1H = (await db.collection('invites').doc(d1.inviteId).get()).data()?.tokenHash;
    const inv2H = (await db.collection('invites').doc(d3.inviteId).get()).data()?.tokenHash;
    t('INV', 'Token hashes unique', inv1H !== inv2H, `distinct`);

    // T045: Invalid email format → 400
    const r4 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'not-an-email' }),
    });
    t('INV', 'Invalid email → 400', r4.status === 400, `${r4.status}`);

    // T046: Missing eventId → 400
    const r5 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ inviteeEmail: 'x@y.com' }),
    });
    t('INV', 'Missing eventId → 400', r5.status === 400, `${r5.status}`);

    // T047: Non-existent event → 404
    const r6 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId: 'fake-event-id', inviteeEmail: 'x@y.com' }),
    });
    t('INV', 'Non-existent event → 404', r6.status === 404, `${r6.status}`);

    // Claim tests with known tokens
    const validInv = await createTestInvite(eventId, 'claim-v@qa.com');
    const expiredInv = await createTestInvite(eventId, 'claim-e@qa.com', { expiresAt: new Date(Date.now() - 10000) });
    const revokedInv = await createTestInvite(eventId, 'claim-r@qa.com', { status: 'revoked' });

    // T048: Valid claim → 200
    const c1 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validInv.raw, userEmail: 'claim-v@qa.com' }),
    });
    t('INV', 'Valid claim → 200', c1.status === 200, `${c1.status}`);

    // T049: Invite status → accepted
    const accSnap = await db.collection('invites').doc(validInv.id).get();
    t('INV', 'Status updated to accepted', accSnap.data()?.status === 'accepted', `${accSnap.data()?.status}`);

    // T050: Participant attached
    const parts = await db.collection('events').doc(eventId).collection('participants')
        .where('email', '==', 'claim-v@qa.com').get();
    t('INV', 'Participant attached to event', !parts.empty, `count=${parts.docs.length}`);

    // T051: Double accept → 409
    const c2 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: validInv.raw, userEmail: 'claim-v@qa.com' }),
    });
    t('INV', 'Double accept → 409', c2.status === 409, `${c2.status}`);

    // T052: Expired → 400
    const c3 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: expiredInv.raw, userEmail: 'claim-e@qa.com' }),
    });
    t('INV', 'Expired token → 400', c3.status === 400, `${c3.status}`);

    // T053: Revoked → 400
    const c4 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: revokedInv.raw, userEmail: 'claim-r@qa.com' }),
    });
    t('INV', 'Revoked invite → 400', c4.status === 400, `${c4.status}`);

    // T054: Tampered token → 400
    const c5 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'totally-fake-token-123', userEmail: 'x@y.com' }),
    });
    t('INV', 'Tampered token → 400', c5.status === 400, `${c5.status}`);

    // T055: 5-way concurrent race condition
    const raceInv = await createTestInvite(eventId, 'race@qa.com');
    const raceR = await Promise.all(Array.from({ length: 5 }, () =>
        fetch(`${BASE_URL}/api/invite/claim`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: raceInv.raw, userEmail: 'race@qa.com' }),
        }).then(r => r.status)
    ));
    const wins = raceR.filter(s => s === 200).length;
    t('INV', '5-way race → exactly 1 win', wins === 1, `results=${raceR.join(',')}`);

    // Cleanup
    await deleteEvent(eventId);
}

export async function runProviderEngineTests() {
    console.log('\n═══ PROVIDER ENGINE (15 tests) ═══\n');
    const provSnap = await db.collection('emailProviders').where('status', '==', 'active').get();
    const primaryId = provSnap.docs[0]?.id;
    if (!primaryId) { t('PROV', 'Active provider exists', false, 'none found'); return; }
    const today = new Date().toISOString().split('T')[0];

    // Reset state
    await db.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 0 });
    await db.collection('emailProviders').doc(primaryId).update({ status: 'active', consecutiveFailures: 0 });

    // T056: Single simulated send
    const j1 = await createMailJob({ toEmail: 'prov1@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const j1s = await db.collection('mailQueue').doc(j1).get();
    t('PROV', 'Single send → status=sent', j1s.data()?.status === 'sent', `${j1s.data()?.status}`);

    // T057: Provider ID logged on job
    t('PROV', 'Provider ID logged on job', !!j1s.data()?.providerUsed, `${j1s.data()?.providerUsed}`);

    // T058: Quota incremented
    const u1 = await db.collection('providerUsage').doc(primaryId).get();
    t('PROV', 'Quota incremented', (u1.data()?.usedToday || 0) > 0, `used=${u1.data()?.usedToday}`);

    // T059: Add fallback, force primary failure
    // Primary has usedToday=1 from the earlier send. Fallback must be higher so primary is tried first.
    const fbRef = await db.collection('emailProviders').add({
        name: 'QA-Fallback', serviceId: 's_fb', templateId: 't_fb',
        publicKey: 'pk', privateKey: 'sk', status: 'active', dailyQuota: 200, consecutiveFailures: 0,
    });
    await db.collection('providerUsage').doc(fbRef.id).set({ date: today, usedToday: 50 });
    await configRef.update({ simulateFailProvider: primaryId });

    const j2 = await createMailJob({ toEmail: 'fallback@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const j2s = await db.collection('mailQueue').doc(j2).get();
    t('PROV', 'Primary fails → fallback used', j2s.data()?.status === 'sent' && j2s.data()?.providerUsed === fbRef.id, `prov=${j2s.data()?.providerUsed}`);

    // T060: Failure counter incremented on primary
    const priSnap = await db.collection('emailProviders').doc(primaryId).get();
    t('PROV', 'Failure counter incremented', (priSnap.data()?.consecutiveFailures || 0) > 0, `failures=${priSnap.data()?.consecutiveFailures}`);

    // T061: Reset failure, exhaust primary quota → fallback
    await configRef.update({ simulateFailProvider: null });
    await db.collection('emailProviders').doc(primaryId).update({ consecutiveFailures: 0, status: 'active' });
    await db.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 999 });
    await db.collection('providerUsage').doc(fbRef.id).set({ date: today, usedToday: 0 });

    const j3 = await createMailJob({ toEmail: 'quota@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const j3s = await db.collection('mailQueue').doc(j3).get();
    t('PROV', 'Quota exhausted → fallback', j3s.data()?.providerUsed === fbRef.id, `prov=${j3s.data()?.providerUsed}`);

    // T062: All providers exhausted → job retries
    await db.collection('providerUsage').doc(fbRef.id).set({ date: today, usedToday: 999 });
    const j4 = await createMailJob({ toEmail: 'allexhaust@qa.com' });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const j4s = await db.collection('mailQueue').doc(j4).get();
    t('PROV', 'All exhausted → retrying', j4s.data()?.status === 'retrying', `${j4s.data()?.status}`);

    // T063: failureReason logged
    t('PROV', 'Failure reason logged', !!j4s.data()?.failureReason, `${j4s.data()?.failureReason?.substring(0, 50)}`);

    // T064: Max retries → failed_permanent
    await db.collection('mailQueue').doc(j4.toString()).update({ status: 'retrying', attempts: 2, scheduledTime: new Date() });
    await db.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 999 });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 500));
    const j4f = await db.collection('mailQueue').doc(j4).get();
    t('PROV', 'Max retries → failed_permanent', j4f.data()?.status === 'failed_permanent', `${j4f.data()?.status}`);

    // T065-T070: Reset + batch send to check quotas
    await db.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 0 });
    await db.collection('providerUsage').doc(fbRef.id).set({ date: today, usedToday: 0 });
    await db.collection('emailProviders').doc(primaryId).update({ status: 'active', consecutiveFailures: 0 });
    await configRef.update({ simulateFailProvider: null });

    const batchIds: string[] = [];
    for (let i = 0; i < 5; i++) batchIds.push(await createMailJob({ toEmail: `batch${i}@qa.com` }));
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 1000));
    let allSent = 0;
    for (const id of batchIds) {
        const s = await db.collection('mailQueue').doc(id).get();
        if (s.data()?.status === 'sent') allSent++;
    }
    t('PROV', '5 batch jobs all sent', allSent === 5, `sent=${allSent}/5`);

    const u2 = await db.collection('providerUsage').doc(primaryId).get();
    t('PROV', 'Quota reflects batch count', (u2.data()?.usedToday || 0) >= 5, `used=${u2.data()?.usedToday}`);

    // Cleanup
    await fbRef.delete();
    await db.collection('providerUsage').doc(fbRef.id).delete();
    await db.collection('providerUsage').doc(primaryId).set({ date: today, usedToday: 0 });
    await db.collection('emailProviders').doc(primaryId).update({ status: 'active', consecutiveFailures: 0 });
    for (const id of [j1, j2, j3, j4, ...batchIds]) await db.collection('mailQueue').doc(id).delete();
}
