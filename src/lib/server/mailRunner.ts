import { adminDb } from '@/lib/firebase/admin';
import { ProviderEngine } from './providerEngine';
import { FieldValue } from 'firebase-admin/firestore';

export const MailRunner = {
    /**
     * Unified Queue Processor. 
     * Runs via Cron (Serverless function on Vercel or Firebase HTTP trigger).
     * Processes 'pending' and 'retrying' jobs whose scheduledTime <= NOW.
     */
    async processQueue() {
        // [HARD MODE SIMULATION] Fetch specific injection config
        const sysStateSnap = await adminDb.collection("systemSettings").doc("globalConfig").get();
        const injection = sysStateSnap.exists ? sysStateSnap.data() : null;

        // 1. Recover jobs stuck due to server crash (> 5 mins in 'processing')
        const stuckSnap = await adminDb.collection('mailQueue')
            .where('status', '==', 'processing')
            .get();

        if (!stuckSnap.empty) {
            const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
            const batch = adminDb.batch();
            let recovered = 0;
            for (const doc of stuckSnap.docs) {
                const data = doc.data();
                if (data.lastAttemptAt && data.lastAttemptAt.toMillis() <= fiveMinsAgo) {
                    batch.update(doc.ref, { status: 'retrying' });
                    recovered++;
                }
            }
            if (recovered > 0) await batch.commit();
        }

        // 2. Find due jobs
        const now = new Date();
        const MAX_BATCH_SIZE = 40; // Avoid timeout on serverless

        const pendingSnap = await adminDb.collection('mailQueue')
            .where('status', 'in', ['pending', 'retrying'])
            .where('scheduledTime', '<=', now)
            .limit(MAX_BATCH_SIZE)
            .get();

        if (pendingSnap.empty) {
            return { processed: 0, message: 'No jobs in queue.' };
        }

        const results = [];

        for (const doc of pendingSnap.docs) {
            try {
                const job = doc.data();

                // Claim job strictly.
                // If another instance claimed it, skip.
                const claimed = await adminDb.runTransaction(async (t) => {
                    const checkDoc = await t.get(doc.ref);
                    if (checkDoc.data()?.status !== job.status) return false;

                    // [HARD MODE] Inject artificial delay before commit to test race conditions
                    if (injection?.artificialDelayBeforeCommit) {
                        console.log(`[SIM] 🛑 Artificially delaying DB Lock Commit by ${injection.artificialDelayBeforeCommit}ms for Race Test...`);
                        await new Promise(r => setTimeout(r, injection.artificialDelayBeforeCommit));
                    }

                    // [HARD MODE] Crash before Lock update
                    if (injection?.crashBeforeLock) {
                        console.log(`[SIM] 💥 FATAL CRASH INJECTED: Before acquiring DB Lock`);
                        throw new Error('SIM_CRASH_BEFORE_LOCK');
                    }

                    t.update(doc.ref, {
                        status: 'processing',
                        attempts: FieldValue.increment(1),
                        lastAttemptAt: FieldValue.serverTimestamp()
                    });

                    // [HARD MODE] Crash after Lock update, before commit
                    if (injection?.crashAfterLockBeforeStatus) {
                        console.log(`[SIM] 💥 FATAL CRASH INJECTED: After Lock update, before Commit`);
                        throw new Error('SIM_CRASH_AFTER_LOCK_BEFORE_STATUS');
                    }

                    return true;
                });

                if (!claimed) continue;

                // [HARD MODE] Crash after PROCESSING, before Provider call
                if (injection?.crashAfterStatusBeforeProvider) {
                    console.log(`[SIM] 💥 FATAL CRASH INJECTED: After PROCESSING, before Provider call`);
                    throw new Error('SIM_CRASH_AFTER_STATUS_BEFORE_PROVIDER');
                }

                const sendResult = await ProviderEngine.executeSend({
                    toEmail: job.toEmail,
                    subject: job.subject,
                    htmlContent: job.renderedHtml
                });

                if (sendResult.success) {
                    // [HARD MODE] Crash after Quota Increment (handled in ProviderEngine), before SENT
                    if (injection?.crashAfterQuotaBeforeSent) {
                        console.log(`[SIM] 💥 FATAL CRASH INJECTED: After Quota Increment, before SENT`);
                        throw new Error('SIM_CRASH_AFTER_QUOTA_BEFORE_SENT');
                    }

                    // Done
                    await doc.ref.update({
                        status: 'sent',
                        providerUsed: sendResult.providerId,
                        sentAt: FieldValue.serverTimestamp(),
                    });

                    // Log operation completion for integrity tests
                    await adminDb.collection('operations').add({
                        jobId: doc.id,
                        eventId: job.eventId,
                        providerId: sendResult.providerId,
                        type: 'email_sent',
                        timestamp: FieldValue.serverTimestamp()
                    });

                    // [HARD MODE] Crash after log write, before commit is not applicable as they are sequential non-transactional writes here, 
                    // though we will use the crash flag right after writing to log.
                    if (injection?.crashAfterSentBeforeLog) {
                        console.log(`[SIM] 💥 FATAL CRASH INJECTED: After operations log write`);
                        throw new Error('SIM_CRASH_AFTER_SENT_BEFORE_LOG'); // Note: misnomer from prompt as log IS written, but this simulates dying after the entire atomic block.
                    }

                    // If it was an invite job, update the parent invite doc strictly
                    if (job.jobType === 'invite' && job.inviteId) {
                        await adminDb.collection('invites').doc(job.inviteId).update({
                            status: 'email_sent',
                            emailSentAt: FieldValue.serverTimestamp()
                        });
                    }

                    results.push({ jobId: doc.id, success: true });
                } else {
                    // Fail with retry
                    const attempts = job.attempts ? job.attempts + 1 : 1;
                    const maxAttempts = job.maxAttempts || 3;

                    if (attempts >= maxAttempts) {
                        await doc.ref.update({
                            status: 'failed_permanent',
                            failureReason: sendResult.error
                        });

                        if (job.jobType === 'invite' && job.inviteId) {
                            await adminDb.collection('invites').doc(job.inviteId).update({
                                status: 'email_failed'
                            });
                        }

                        results.push({ jobId: doc.id, success: false, final: true });
                    } else {
                        // Exponential backoff
                        const delayMins = Math.pow(2, attempts); // 2m, 4m, 8m...
                        const nextAttempt = new Date(Date.now() + delayMins * 60 * 1000);

                        await doc.ref.update({
                            status: 'retrying',
                            scheduledTime: nextAttempt,
                            failureReason: sendResult.error
                        });

                        results.push({ jobId: doc.id, success: false, retrying: true });
                    }
                }
            } catch (jobError: unknown) {
                const errorMessage = jobError instanceof Error ? jobError.message : String(jobError);
                console.error(`[MailRunner] Job ${doc.id} failed critically:`, errorMessage);

                // Do not revert to retrying if we successfully sent the email already!
                // Read from the DB to be absolutely certain before reverting status.
                try {
                    const latestSnap = await doc.ref.get();
                    if (latestSnap.data()?.status === 'sent' || latestSnap.data()?.status === 'failed_permanent') {
                        console.log(`[MailRunner] Job ${doc.id} already resolved. Skipping rollback.`);
                        continue;
                    }

                    await doc.ref.update({
                        status: 'retrying',
                        failureReason: `Critical error: ${errorMessage}`,
                        scheduledTime: new Date(Date.now() + 2 * 60 * 1000),
                    });
                } catch { /* best effort recovery */ }
                results.push({ jobId: doc.id, success: false, error: errorMessage });
            }
        }

        return { processed: results.length, details: results };
    }
}
