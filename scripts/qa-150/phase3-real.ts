import { adminDb } from '../../src/lib/firebase/admin';
import { ProviderEngine } from '../../src/lib/server/providerEngine';
import { MailRunner } from '../../src/lib/server/mailRunner';

async function runRealNetworkValidation() {
    console.log('\n--- PHASE 3: REAL NETWORK VALIDATION ---');

    // 1. Ensure Simulation is OFF
    await adminDb.collection('systemSettings').doc('globalConfig').set({
        simulationMode: false,
        emergencyStop: false,
        systemSuspended: false,
        simulateFailProvider: null,
        simulateQuotaExhausted: null
    }, { merge: true });

    // 2. Clear previous providers
    const pSnap = await adminDb.collection('emailProviders').get();
    const pBatch = adminDb.batch();
    pSnap.docs.forEach(d => pBatch.delete(d.ref));
    await pBatch.commit();

    // 3. Add one dummy provider
    await adminDb.collection('emailProviders').add({
        name: 'Real_Network_Ping_Test',
        serviceId: 'service_dummy',
        templateId: 'template_dummy',
        publicKey: 'pub_dummy',
        privateKey: 'priv_dummy',
        status: 'active',
        dailyQuota: 200,
        consecutiveFailures: 0
    });

    // 4. Create an event in the past (due right now)
    const eventRef = await adminDb.collection('events').add({
        title: 'Network Ping Event',
        status: 'scheduled',
        date: new Date(Date.now() - 5000),
        organizerId: 'qa_real'
    });

    // 5. Add a pending reminder
    const jobRef = await adminDb.collection('mailQueue').add({
        eventId: eventRef.id,
        toEmail: 'test@example.com',
        subject: 'Real Ping Test',
        scheduledTime: new Date(Date.now() - 5000),
        status: 'pending',
        attempts: 0,
        jobType: 'reminder'
    });

    // 6. Execute Scheduler
    console.log('Running MailRunner with SIMULATION OFF...');
    const result = await MailRunner.processQueue();
    console.log('Scheduler Result:', result);

    // 7. Verify result - it MUST have hit EmailJS and returned a network error
    const jobSnap = await jobRef.get();
    const jobData = jobSnap.data();

    if (jobData?.status === 'retrying' || jobData?.status === 'failed_permanent') {
        console.log('✅ Real network boundary reached successfully! EmailJS rejected the dummy credentials:', jobData.failureReason);
        process.exit(0);
    } else {
        console.error('❌ Failed! Status is', jobData?.status, 'expected an API failure.');
        process.exit(1);
    }
}

runRealNetworkValidation().catch(console.error);
