import { clearAllTestState, InjectionEngine, getTestStats } from './framework';
import { runSuiteA } from './tests-A';
import { runSuiteB } from './tests-B';
import { runSuiteC } from './tests-C';
import { runSuiteD } from './tests-D';
import { runSuiteE } from './tests-E';
import { runSuiteF, runSuiteG, runSuiteH } from './tests-FGH';

async function main() {
    console.log('🌟 INITIATING 150+ DEDICATED SCHEDULER + PROVIDER TESTS 🌟\n');

    await InjectionEngine.enableSimulation();

    await clearAllTestState();
    await runSuiteA();

    await clearAllTestState();
    await runSuiteB();

    await clearAllTestState();
    await runSuiteC();

    await clearAllTestState();
    await runSuiteD();

    await clearAllTestState();
    await runSuiteE();

    await clearAllTestState();
    await runSuiteF();

    await clearAllTestState();
    await runSuiteG();

    await clearAllTestState();
    await runSuiteH();

    await clearAllTestState();

    await InjectionEngine.disableSimulation();

    const stats = getTestStats();
    console.log(`\n\n🎯 150+ TEST RUN COMPLETE 🎯`);
    console.log(`Passed: ${stats.passed}`);
    console.log(`Failed: ${stats.failed}`);

    if (stats.failed > 0) {
        console.error('\nFailures:');
        stats.failures.forEach(f => console.error('  ', f));
        process.exit(1);
    } else {
        console.log('\n✅ 100% STABLE EXACTLY-ONCE EXECUTION CONFIRMED.');
        process.exit(0);
    }
}

main().catch(console.error);
