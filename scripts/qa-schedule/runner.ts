// Shim for server-only package
import { createRequire } from 'module';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const require2 = createRequire(import.meta.url);
const shimDir = join(dirname(require2.resolve('next/package.json')), '..', 'server-only');

if (!existsSync(join(shimDir, 'package.json'))) {
    mkdirSync(shimDir, { recursive: true });
    writeFileSync(join(shimDir, 'index.js'), '');
    writeFileSync(join(shimDir, 'package.json'), '{"name":"server-only","main":"index.js"}');
    console.log('[Shim] Created mock for server-only package.');
}

import { step0_enableSafeMode } from './phase0';
import { runCategoryA, runCategoryB } from './tests-part1';
import { runCategoryC, runCategoryD } from './tests-part2';
import { runCategoryE, runCategoryF } from './tests-part3';
import { runCategoryG, runCategoryH } from './tests-part4';
import { getTestStats, adminDb } from './framework';

async function main() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  GPMAS V1 — DEDICATED SCHEDULE LIFECYCLE QA SUITE  ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    try {
        // Phase 0: Safe Mode
        await step0_enableSafeMode();

        // Phase 1: Test Suites (A-H)
        await runCategoryA();
        await runCategoryB();
        await runCategoryC();
        await runCategoryD();
        await runCategoryE();
        await runCategoryF();
        await runCategoryG();
        await runCategoryH();

    } catch (e: any) {
        console.error('\n💥 FATAL EXPLOSION IN SUITE:', e.message, e.stack);
    }

    const { passCount, failCount, failures } = getTestStats();
    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('  QA SCHEDULE LIFECYCLE REPORT');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(`  Total Execute: ${passCount + failCount} | ✅ ${passCount} | ❌ ${failCount}\n`);

    if (failCount > 0) {
        console.log('  FAILURES:');
        failures.forEach(f => console.log(`    ❌ ${f}`));
        console.log('\n  VERDICT: 🔴 ARCHITECTURE BUGS FOUND');
        process.exit(1);
    } else {
        console.log('  VERDICT: 🟢 SCHEDULE LIFECYCLE STABLE');
        process.exit(0);
    }
}

main();
