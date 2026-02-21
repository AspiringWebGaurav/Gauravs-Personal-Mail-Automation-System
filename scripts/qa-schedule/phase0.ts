import { adminDb } from '@/lib/firebase/admin';

export async function step0_enableSafeMode() {
    console.log('\n═══ STEP 0: ENABLE SAFE SIMULATION MODE ═══\n');

    // 1. Enable simulationMode
    await adminDb.collection('systemSettings').doc('globalConfig').set({
        simulationMode: true,
        emergencyStop: false,
        systemSuspended: false
    });
    console.log('✅ Simulation mode enabled: simulationMode=true');

    // 2. Clear existing providers
    const existing = await adminDb.collection('emailProviders').get();
    const batch = adminDb.batch();
    for (const doc of existing.docs) batch.delete(doc.ref);
    await batch.commit();

    // 3. Create fresh mock providers (Primary + Fallback)
    const p1 = await adminDb.collection('emailProviders').add({
        name: 'QA-Primary', serviceId: 's1', templateId: 't1',
        publicKey: 'pk', privateKey: 'sk', status: 'active', dailyQuota: 200, consecutiveFailures: 0
    });
    const p2 = await adminDb.collection('emailProviders').add({
        name: 'QA-Fallback', serviceId: 's2', templateId: 't2',
        publicKey: 'pk', privateKey: 'sk', status: 'active', dailyQuota: 200, consecutiveFailures: 0
    });

    const today = new Date().toISOString().split('T')[0];
    await adminDb.collection('providerUsage').doc(p1.id).set({ date: today, usedToday: 0 });
    await adminDb.collection('providerUsage').doc(p2.id).set({ date: today, usedToday: 0 });

    console.log(`✅ Providers initialized: 2 providers for failover testing`);
    return { primaryId: p1.id, fallbackId: p2.id };
}
