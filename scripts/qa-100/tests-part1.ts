/**
 * GPMAS QA — Tests 1-35: Auth + Operation Engine + Template Engine
 */
import {
    t, db, FV, BASE_URL, CRON_SECRET, OWNER_EMAIL, configRef,
    getOwnerIdToken, getIntruderIdToken, makeToken, createTestEvent,
    createMailJob, deleteEvent
} from './framework';

export async function runAuthTests() {
    console.log('\n═══ AUTH LAYER (10 tests) ═══\n');
    const token = await getOwnerIdToken();
    const eventId = await createTestEvent('Auth Event');

    // T001: Valid owner auth
    const r1 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ eventId, inviteeEmail: 'auth1@qa.com' }),
    });
    t('AUTH', 'Owner bearer token accepted', r1.status === 200, `${r1.status}`);

    // T002: No authorization header
    const r2 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, inviteeEmail: 'x@y.com' }),
    });
    t('AUTH', 'Missing auth header → 401', r2.status === 401, `${r2.status}`);

    // T003: Empty bearer
    const r3 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' },
        body: JSON.stringify({ eventId, inviteeEmail: 'x@y.com' }),
    });
    t('AUTH', 'Empty bearer → reject', r3.status !== 200, `${r3.status}`);

    // T004: Fake JWT
    const r4 = await fetch(`${BASE_URL}/api/invite/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake.jwt.token' },
        body: JSON.stringify({ eventId, inviteeEmail: 'x@y.com' }),
    });
    t('AUTH', 'Fake JWT → reject', r4.status !== 200, `${r4.status}`);

    // T005: Non-owner email → 403
    const intruderToken = await getIntruderIdToken();
    if (intruderToken) {
        const r5 = await fetch(`${BASE_URL}/api/invite/create`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${intruderToken}` },
            body: JSON.stringify({ eventId, inviteeEmail: 'x@y.com' }),
        });
        t('AUTH', 'Non-owner email → 403', r5.status === 403, `${r5.status}`);
    }

    // T006: Scheduler no auth → 401
    const r6 = await fetch(`${BASE_URL}/api/scheduler/process`);
    t('AUTH', 'Scheduler no secret → 401', r6.status === 401, `${r6.status}`);

    // T007: Scheduler wrong secret
    const r7 = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': 'wrong-secret' } });
    t('AUTH', 'Scheduler wrong secret → 401', r7.status === 401, `${r7.status}`);

    // T008: Scheduler valid secret
    const r8 = await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    t('AUTH', 'Scheduler valid secret → 200', r8.status === 200, `${r8.status}`);

    // T009: Invite claim has no auth requirement (public endpoint)
    const r9 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test', userEmail: 'x@y.com' }),
    });
    t('AUTH', 'Claim endpoint is public (no auth needed)', r9.status !== 401, `${r9.status}`);

    // T010: SQL-injection-style token
    const r10 = await fetch(`${BASE_URL}/api/invite/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: "'; DROP TABLE invites;--", userEmail: 'x@y.com' }),
    });
    t('AUTH', 'Malicious token string → no crash', r10.status === 400, `${r10.status}`);

    // Cleanup
    const invSnap = await db.collection('invites').where('eventId', '==', eventId).get();
    for (const d of invSnap.docs) await d.ref.delete();
    const mailSnap = await db.collection('mailQueue').where('eventId', '==', eventId).get();
    for (const d of mailSnap.docs) await d.ref.delete();
    await db.collection('events').doc(eventId).delete();
}

export async function runOperationEngineTests() {
    console.log('\n═══ OPERATION ENGINE (15 tests) ═══\n');
    const { DBTransactions } = await import('../../src/lib/server/db-transactions');

    // T011: Create event
    const eid1 = await DBTransactions.createEvent({ title: 'Op1', eventTime: new Date().toISOString(), ownerId: 'qa-owner' });
    t('OPS', 'Create event returns ID', !!eid1, `${eid1}`);

    // T012: Event doc exists in Firestore
    const snap1 = await db.collection('events').doc(eid1).get();
    t('OPS', 'Event doc persisted', snap1.exists, `exists=${snap1.exists}`);

    // T013: Owner auto-added as participant
    const part = await db.collection('events').doc(eid1).collection('participants').doc('qa-owner').get();
    t('OPS', 'Owner participant auto-added', part.exists && part.data()?.role === 'owner', `role=${part.data()?.role}`);

    // T014: Title matches
    t('OPS', 'Event title correct', snap1.data()?.title === 'Op1', `title=${snap1.data()?.title}`);

    // T015: createdAt timestamp exists
    t('OPS', 'createdAt populated', !!snap1.data()?.createdAt, `${!!snap1.data()?.createdAt}`);

    // T016: Concurrent creates yield unique IDs
    const [a, b, c] = await Promise.all([
        DBTransactions.createEvent({ title: 'CC-A', eventTime: new Date().toISOString(), ownerId: 'qa-owner' }),
        DBTransactions.createEvent({ title: 'CC-B', eventTime: new Date().toISOString(), ownerId: 'qa-owner' }),
        DBTransactions.createEvent({ title: 'CC-C', eventTime: new Date().toISOString(), ownerId: 'qa-owner' }),
    ]);
    t('OPS', '3 concurrent creates → unique IDs', new Set([a, b, c]).size === 3, `${a}, ${b}, ${c}`);

    // T017: deleteEvent removes event
    await DBTransactions.deleteEvent(eid1);
    const del1 = await db.collection('events').doc(eid1).get();
    t('OPS', 'deleteEvent removes event doc', !del1.exists, `exists=${del1.exists}`);

    // T018: deleteEvent removes participants
    const delParts = await db.collection('events').doc(eid1).collection('participants').get();
    t('OPS', 'deleteEvent cascades participants', delParts.empty, `count=${delParts.docs.length}`);

    // T019: Delete cascades invites
    const eid2 = await DBTransactions.createEvent({ title: 'Cascade', eventTime: new Date().toISOString(), ownerId: 'qa-owner' });
    await db.collection('invites').add({ eventId: eid2, status: 'pending', tokenHash: 'x', inviteeEmail: 'c@q.com', createdAt: FV.serverTimestamp(), expiresAt: new Date(), createdBy: 'qa-owner' });
    await DBTransactions.deleteEvent(eid2);
    const cascInv = await db.collection('invites').where('eventId', '==', eid2).get();
    t('OPS', 'deleteEvent cascades invites', cascInv.empty, `remaining=${cascInv.docs.length}`);

    // T020: Delete cascades mailQueue
    const eid3 = await DBTransactions.createEvent({ title: 'CascMail', eventTime: new Date().toISOString(), ownerId: 'qa-owner' });
    await db.collection('mailQueue').add({ eventId: eid3, status: 'pending', jobType: 'test', toEmail: 't@q.com', subject: 't', renderedHtml: '<p>t</p>', scheduledTime: FV.serverTimestamp(), attempts: 0, maxAttempts: 3, createdAt: FV.serverTimestamp() });
    await DBTransactions.deleteEvent(eid3);
    const cascMail = await db.collection('mailQueue').where('eventId', '==', eid3).get();
    t('OPS', 'deleteEvent cascades mailQueue', cascMail.empty, `remaining=${cascMail.docs.length}`);

    // T021: Delete non-existent event throws
    let threw = false;
    try { await DBTransactions.deleteEvent('non-existent-id-xyz'); } catch { threw = true; }
    t('OPS', 'deleteEvent non-existent → throws', threw, `threw=${threw}`);

    // T022: Mail job PENDING → PROCESSING → SENT transition
    const jobId = await createMailJob({ toEmail: 'trans@qa.com', subject: 'Transition' });
    const { data: sched } = await (await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } })).json().then(d => ({ data: d }));
    await new Promise(r => setTimeout(r, 500));
    const jobSnap = await db.collection('mailQueue').doc(jobId).get();
    t('OPS', 'Job processed to sent', jobSnap.data()?.status === 'sent', `status=${jobSnap.data()?.status}`);

    // T023: sentAt timestamp populated
    t('OPS', 'sentAt timestamp populated', !!jobSnap.data()?.sentAt, `${!!jobSnap.data()?.sentAt}`);

    // T024: providerUsed populated
    t('OPS', 'providerUsed populated', !!jobSnap.data()?.providerUsed, `${jobSnap.data()?.providerUsed}`);

    // T025: Job not re-processed (already sent)
    const before = jobSnap.data()?.sentAt;
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    const jobSnap2 = await db.collection('mailQueue').doc(jobId).get();
    t('OPS', 'Sent job not re-processed', jobSnap2.data()?.status === 'sent', `status=${jobSnap2.data()?.status}`);

    // Cleanup
    await db.collection('mailQueue').doc(jobId).delete();
    for (const id of [a, b, c]) await DBTransactions.deleteEvent(id);
}

export async function runTemplateEngineTests() {
    console.log('\n═══ TEMPLATE ENGINE (10 tests) ═══\n');

    // Import directly for unit testing
    const { TemplateEngine } = await import('../../src/lib/server/templateEngine');

    // T026: Basic placeholder replacement
    const r1 = TemplateEngine.render('Hello {{recipientName}}', { recipientName: 'Gaurav' });
    t('TPL', 'Basic placeholder replace', r1 === 'Hello Gaurav', `"${r1}"`);

    // T027: Multiple placeholders
    const r2 = TemplateEngine.render('{{eventName}} at {{location}}', { eventName: 'Party', location: 'Mumbai' });
    t('TPL', 'Multiple placeholders', r2 === 'Party at Mumbai', `"${r2}"`);

    // T028: Missing placeholder → default
    const r3 = TemplateEngine.render('Hi {{recipientName}}', {});
    t('TPL', 'Missing recipientName → default "there"', r3 === 'Hi there', `"${r3}"`);

    // T029: Missing inviterName → default
    const r4 = TemplateEngine.render('From {{inviterName}}', {});
    t('TPL', 'Missing inviterName → default "Gaurav"', r4 === 'From Gaurav', `"${r4}"`);

    // T030: Empty string for missing optional
    const r5 = TemplateEngine.render('Msg: {{customMessage}}', {});
    t('TPL', 'Missing customMessage → empty', r5 === 'Msg: ', `"${r5}"`);

    // T031: HTML in data not escaped (raw insert)
    const r6 = TemplateEngine.render('{{customMessage}}', { customMessage: '<b>Bold</b>' });
    t('TPL', 'HTML preserved in output', r6.includes('<b>Bold</b>'), `"${r6}"`);

    // T032: Multiple occurrences of same placeholder
    const r7 = TemplateEngine.render('{{eventName}} - {{eventName}}', { eventName: 'Test' });
    t('TPL', 'Duplicate placeholders both replaced', r7 === 'Test - Test', `"${r7}"`);

    // T033: No placeholders → passthrough
    const r8 = TemplateEngine.render('Plain text no placeholders', { eventName: 'X' });
    t('TPL', 'No placeholders = passthrough', r8 === 'Plain text no placeholders', `"${r8}"`);

    // T034: wrapEnterpriseGlass contains GPMAS branding
    const r9 = TemplateEngine.wrapEnterpriseGlass('<p>Body</p>');
    t('TPL', 'Enterprise wrapper has GPMAS brand', r9.includes('GPMAS'), `contains GPMAS`);

    // T035: wrapEnterpriseGlass contains the body content
    t('TPL', 'Enterprise wrapper includes body', r9.includes('<p>Body</p>'), `contains body`);
}
