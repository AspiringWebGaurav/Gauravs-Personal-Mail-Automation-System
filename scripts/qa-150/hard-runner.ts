import { clearAllTestState, InjectionEngine, getTestStats } from './framework';
import { runHardModePhase1 } from './phase1-atomic';
import { runHardModePhase2 } from './phase2-race';
import { runHardModePhase3, runHardModePhase4 } from './phase34';
import { runHardModePhase5, runHardModePhase6, runHardModePhase7, runHardModePhase8 } from './phase58';

async function main() {
    console.log('🌟 INITIATING 150+ HARD MODE ATOMIC BOUNDARY TESTS 🌟\n');

    await InjectionEngine.enableSimulation();

    await clearAllTestState();
    await runHardModePhase1();

    await clearAllTestState();
    await runHardModePhase2();

    await clearAllTestState();
    await runHardModePhase3();

    await clearAllTestState();
    await runHardModePhase4();

    await clearAllTestState();
    await runHardModePhase5();

    await clearAllTestState();
    await runHardModePhase6();

    await clearAllTestState();
    await runHardModePhase7();

    await clearAllTestState();
    await runHardModePhase8();

    await clearAllTestState();

    await InjectionEngine.disableSimulation();

    const stats = getTestStats();
    console.log(`\n\n🎯 HARD MODE RUN COMPLETE 🎯`);
    console.log(`Passed: ${stats.passed}`);
    console.log(`Failed: ${stats.failed}`);

    if (stats.failed > 0) {
        console.error('\nFailures:');
        stats.failures.forEach(f => console.error('  ', f));
        process.exit(1);
    } else {
        console.log('\n✅ 100% FINANCIAL-GRADE EXACTLY-ONCE EXECUTION CONFIRMED.');
        process.exit(0);
    }
}

main().catch(console.error);
