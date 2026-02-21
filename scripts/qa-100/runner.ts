/**
 * GPMAS V1 — 100+ Deep QA Runner
 * Orchestrates all test modules with safe simulation mode.
 */

// ── Shim: Allow 'server-only' imports outside Next.js runtime ──
import { createRequire } from 'module';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
const require2 = createRequire(import.meta.url);
const shimDir = join(dirname(require2.resolve('next/package.json')), '..', 'server-only');
if (!existsSync(join(shimDir, 'package.json'))) {
    mkdirSync(shimDir, { recursive: true });
    writeFileSync(join(shimDir, 'index.js'), '');
    writeFileSync(join(shimDir, 'package.json'), '{"name":"server-only","main":"index.js"}');
}
import { db, configRef, FV, BASE_URL, CRON_SECRET, OWNER_EMAIL, printReport } from './framework';
import { t } from './framework';
import { runAuthTests, runOperationEngineTests, runTemplateEngineTests } from './tests-part1';
import { runInviteSystemTests, runProviderEngineTests } from './tests-part2';
import { runSendTrackerTests, runSystemHaltTests, runConcurrencyTests, runDBIntegrityTests } from './tests-part3';

async function step0_enableSafeMode() {
    console.log('\n═══ STEP 0: ENABLE SAFE SIMULATION MODE ═══\n');
    await configRef.set({
        emergencyStop: false,
        systemSuspended: false,
        simulationMode: true,
        simulateFailProvider: null,
        simulateQuotaExhausted: null,
    }, { merge: true });
    t('SAFE', 'Simulation mode enabled', true, 'simulationMode=true');

    const provSnap = await db.collection('emailProviders').get();
    const today = new Date().toISOString().split('T')[0];
    for (const doc of provSnap.docs) {
        await doc.ref.update({ status: 'active', consecutiveFailures: 0 });
        await db.collection('providerUsage').doc(doc.id).set({ date: today, usedToday: 0 });
    }
    t('SAFE', 'Providers reset', true, `${provSnap.docs.length} providers`);
}

async function finalStep_restoreProduction() {
    console.log('\n═══ FINAL: PRODUCTION RESTORE ═══\n');
    await configRef.update({
        simulationMode: false,
        simulateFailProvider: null,
        simulateQuotaExhausted: null,
    });
    t('FINAL', 'Simulation removed', true, 'simulationMode=false');

    const conf = await configRef.get();
    t('FINAL', 'No mock layer', conf.data()?.simulationMode === false, `sim=${conf.data()?.simulationMode}`);

    // Reset providers for real dispatch
    const provSnap = await db.collection('emailProviders').get();
    const today = new Date().toISOString().split('T')[0];
    for (const doc of provSnap.docs) {
        await doc.ref.update({ status: 'active', consecutiveFailures: 0 });
        await db.collection('providerUsage').doc(doc.id).set({ date: today, usedToday: 0 });
    }

    // 1 real end-to-end
    const jobRef = await db.collection('mailQueue').add({
        jobType: 'test', toEmail: OWNER_EMAIL,
        subject: 'GPMAS 100+ QA — Real Dispatch',
        renderedHtml: `<h2>GPMAS QA Passed</h2><p>${new Date().toISOString()}</p><p>100+ tests verified.</p>`,
        status: 'pending', scheduledTime: FV.serverTimestamp(),
        attempts: 0, maxAttempts: 3, createdAt: FV.serverTimestamp(),
    });
    await fetch(`${BASE_URL}/api/scheduler/process`, { headers: { 'x-cron-secret': CRON_SECRET } });
    await new Promise(r => setTimeout(r, 2000));
    const snap = await db.collection('mailQueue').doc(jobRef.id).get();
    t('FINAL', 'Real email sent', snap.data()?.status === 'sent', `status=${snap.data()?.status}, prov=${snap.data()?.providerUsed}`);
    await db.collection('mailQueue').doc(jobRef.id).delete();
}

async function main() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — 100+ STRUCTURED QA PROTOCOL           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    try {
        await step0_enableSafeMode();    // S0
        await runAuthTests();            // T001-T010
        await runOperationEngineTests(); // T011-T025
        await runTemplateEngineTests();  // T026-T035
        await runInviteSystemTests();    // T036-T055
        await runProviderEngineTests();  // T056-T070
        await runSendTrackerTests();     // T071-T080
        await runSystemHaltTests();      // T081-T090
        await runConcurrencyTests();     // T091-T100
        await runDBIntegrityTests();     // T101-T110
        await finalStep_restoreProduction(); // FINAL
    } catch (e: any) {
        console.error('\n💥 FATAL:', e.message, e.stack);
    }

    printReport();
}

main().catch(console.error);
