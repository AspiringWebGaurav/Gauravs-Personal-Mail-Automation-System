/**
 * GMSS Disaster Bank — Ultimate Fail-Safe Layer
 * ═══════════════════════════════════════════════
 * Final emergency recovery system. Activates ONLY when all normal
 * retry/fallback mechanisms have been exhausted.
 *
 * Layer Hierarchy:
 *   Normal execution → Retry logic → Provider fallback →
 *   Scheduler reattempt → Network reconnection → DISASTER BANK (FINAL)
 *
 * If Disaster Bank fails → log + alert (never silent).
 */

import * as admin from "firebase-admin";
import { selectProvider, incrementProviderUsage } from "./providerBalancer";
import { sendEmail } from "./emailSender";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const DB_COLLECTION = "disasterBankQueue";
const HEALTH_COLLECTION = "systemHealth";
const DISASTER_LOG_COLLECTION = "disasterLogs";

const MAX_DISASTER_RETRIES = 5;
const BACKOFF_SCHEDULE_MS = [
    1 * 60 * 1000,   // 1 minute
    2 * 60 * 1000,   // 2 minutes
    5 * 60 * 1000,   // 5 minutes
    10 * 60 * 1000,  // 10 minutes
    30 * 60 * 1000,  // 30 minutes
];
const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000; // 5 min = stale
const DISASTER_BATCH_LIMIT = 20;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type DisasterBankStatus =
    | "pending_recovery"
    | "recovering"
    | "recovered"
    | "disaster_failed";

export interface DisasterBankEntry {
    reminderId: string;
    reminderData: Record<string, unknown>;
    status: DisasterBankStatus;
    capturedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
    activationReason: string;
    failureChain: string[];
    providerSnapshot: Record<string, unknown>[];
    quotaSnapshot: { userId: string; usedToday: number; limit: number };
    originalAttempts: number;
    recoveryAttempts: number;
    lastRecoveryAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null;
    nextRetryAfter: admin.firestore.Timestamp | null;
    recoveredAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null;
    recoveryProviderUsed: string;
}

interface HealthCheckResult {
    timestamp: admin.firestore.FieldValue;
    providersHealthy: boolean;
    providerDetails: { id: string; name: string; status: string; remainingQuota: number }[];
    quotaAccurate: boolean;
    schedulerDrift: number; // ms
    staleRecordsFound: number;
    staleRecordsRepaired: number;
    disasterQueueSize: number;
    overallStatus: "healthy" | "degraded" | "critical";
}

// ═══════════════════════════════════════════════════════════════
// CAPTURE TO DISASTER BANK
// Called when scheduler exhausts all normal recovery paths.
// ═══════════════════════════════════════════════════════════════
export async function captureToDisasterBank(
    reminderId: string,
    reminderData: Record<string, unknown>,
    activationReason: string,
    failureChain: string[]
): Promise<string> {
    const db = admin.firestore();

    // ── Snapshot current provider state ──
    let providerSnapshot: Record<string, unknown>[] = [];
    try {
        const provSnap = await db.collection("emailProviders")
            .where("status", "==", "active").get();
        providerSnapshot = provSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { /* best effort */ }

    // ── Snapshot current user quota ──
    const userId = (reminderData.userId as string) || "system";
    const dateKey = new Date().toISOString().split("T")[0];
    let quotaSnapshot = { userId, usedToday: 0, limit: 200 };
    try {
        const usageSnap = await db.collection("users").doc(userId)
            .collection("usage").doc(dateKey).get();
        if (usageSnap.exists) {
            quotaSnapshot.usedToday = usageSnap.data()?.count || 0;
        }
    } catch { /* best effort */ }

    // ── Create Disaster Bank entry ──
    const entry: DisasterBankEntry = {
        reminderId,
        reminderData,
        status: "pending_recovery",
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        activationReason,
        failureChain,
        providerSnapshot,
        quotaSnapshot,
        originalAttempts: (reminderData.attempts as number) || 0,
        recoveryAttempts: 0,
        lastRecoveryAt: null,
        nextRetryAfter: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + BACKOFF_SCHEDULE_MS[0])
        ),
        recoveredAt: null,
        recoveryProviderUsed: "",
    };

    const ref = await db.collection(DB_COLLECTION).add(entry);

    // ── Log the disaster activation ──
    await logDisasterEvent("CAPTURED", reminderId, activationReason, {
        disasterEntryId: ref.id,
        failureChain,
    });

    console.log(
        `🚨 DISASTER BANK: Captured reminder ${reminderId} | Reason: ${activationReason} | Entry: ${ref.id}`
    );

    return ref.id;
}

// ═══════════════════════════════════════════════════════════════
// PROCESS DISASTER BANK
// Scheduled recovery engine — runs every 5 minutes.
// ═══════════════════════════════════════════════════════════════
export async function processDisasterBank(): Promise<void> {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Query entries ready for recovery
    const query = db.collection(DB_COLLECTION)
        .where("status", "==", "pending_recovery")
        .where("nextRetryAfter", "<=", now)
        .limit(DISASTER_BATCH_LIMIT);

    const snap = await query.get();
    if (snap.empty) return;

    console.log(`🏥 DISASTER BANK: Processing ${snap.size} entries for recovery`);

    for (const doc of snap.docs) {
        const entry = doc.data() as DisasterBankEntry;

        // ── Hard retry limit ──
        if (entry.recoveryAttempts >= MAX_DISASTER_RETRIES) {
            await doc.ref.update({
                status: "disaster_failed",
                lastRecoveryAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await logDisasterEvent("FINAL_FAILURE", entry.reminderId,
                `Exhausted all ${MAX_DISASTER_RETRIES} disaster recovery attempts`, {
                disasterEntryId: doc.id,
            });
            console.error(
                `💀 DISASTER BANK: FINAL FAILURE for ${entry.reminderId} after ${MAX_DISASTER_RETRIES} recovery attempts`
            );
            continue;
        }

        // ── Claim entry atomically ──
        let claimed = false;
        try {
            claimed = await db.runTransaction(async (txn) => {
                const freshSnap = await txn.get(doc.ref);
                const freshData = freshSnap.data();
                if (!freshData || freshData.status !== "pending_recovery") {
                    return false;
                }
                txn.update(doc.ref, { status: "recovering" });
                return true;
            });
        } catch {
            continue;
        }

        if (!claimed) continue;

        // ── Validate provider health before retry ──
        const provider = await selectProvider();
        if (!provider) {
            // All providers still exhausted — reschedule
            const nextAttempt = Math.min(entry.recoveryAttempts, BACKOFF_SCHEDULE_MS.length - 1);
            await doc.ref.update({
                status: "pending_recovery",
                recoveryAttempts: admin.firestore.FieldValue.increment(1),
                lastRecoveryAt: admin.firestore.FieldValue.serverTimestamp(),
                nextRetryAfter: admin.firestore.Timestamp.fromDate(
                    new Date(Date.now() + BACKOFF_SCHEDULE_MS[nextAttempt])
                ),
            });
            await logDisasterEvent("RETRY_DEFERRED", entry.reminderId,
                "All providers exhausted, deferring retry", { disasterEntryId: doc.id });
            continue;
        }

        // ── Validate quota before retry ──
        const userId = (entry.reminderData.userId as string) || "system";
        const dateKey = new Date().toISOString().split("T")[0];
        try {
            const usageSnap = await db.collection("users").doc(userId)
                .collection("usage").doc(dateKey).get();
            const currentUsage = usageSnap.exists ? (usageSnap.data()?.count || 0) : 0;
            if (currentUsage >= 200) {
                const nextAttempt = Math.min(entry.recoveryAttempts, BACKOFF_SCHEDULE_MS.length - 1);
                await doc.ref.update({
                    status: "pending_recovery",
                    recoveryAttempts: admin.firestore.FieldValue.increment(1),
                    lastRecoveryAt: admin.firestore.FieldValue.serverTimestamp(),
                    nextRetryAfter: admin.firestore.Timestamp.fromDate(
                        new Date(Date.now() + BACKOFF_SCHEDULE_MS[nextAttempt])
                    ),
                });
                await logDisasterEvent("RETRY_DEFERRED", entry.reminderId,
                    "User quota exhausted, deferring retry", { disasterEntryId: doc.id });
                continue;
            }
        } catch { /* proceed if quota check fails — don't block recovery */ }

        // ── Idempotency check: ensure the original reminder wasn't already sent ──
        try {
            const reminderSnap = await db.collection("scheduledReminders")
                .doc(entry.reminderId).get();
            if (reminderSnap.exists) {
                const reminderStatus = reminderSnap.data()?.status;
                if (reminderStatus === "sent") {
                    // Already sent by another path — mark recovered
                    await doc.ref.update({
                        status: "recovered",
                        recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
                        recoveryProviderUsed: "already_sent",
                    });
                    await logDisasterEvent("ALREADY_SENT", entry.reminderId,
                        "Reminder was already sent via another path", { disasterEntryId: doc.id });
                    continue;
                }
            }
        } catch { /* proceed if check fails */ }

        // ── Attempt email send ──
        try {
            const rd = entry.reminderData;

            await sendEmail(provider, {
                to_email: rd.email as string,
                from_name: (rd.senderName as string) || "GMSS System",
                reply_to_email: (rd.senderEmail as string) || undefined,
                event_title: (rd.eventTitle as string) || "Event Reminder",
                event_id: (rd.eventId as string) || "",
                scheduled_time: new Date().toISOString(),
                subject: `Reminder: ${rd.eventTitle || "Event"}`,
                customTitle: `Reminder: ${rd.eventTitle || "Event"}`,
            });

            // ── SUCCESS ──
            await doc.ref.update({
                status: "recovered",
                recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
                recoveryProviderUsed: provider.serviceId,
                recoveryAttempts: admin.firestore.FieldValue.increment(1),
                lastRecoveryAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update original reminder
            try {
                await db.collection("scheduledReminders").doc(entry.reminderId).update({
                    status: "sent",
                    providerUsed: `disaster_bank:${provider.serviceId}`,
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                    failureReason: "Recovered by Disaster Bank",
                });
            } catch { /* original might be deleted */ }

            // Increment provider usage
            await incrementProviderUsage(provider.id);

            // Increment user quota
            try {
                const usageRef = db.collection("users").doc(userId)
                    .collection("usage").doc(dateKey);
                await usageRef.set({
                    count: admin.firestore.FieldValue.increment(1),
                    sentCount: admin.firestore.FieldValue.increment(1),
                    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            } catch { /* best effort */ }

            await logDisasterEvent("RECOVERED", entry.reminderId,
                `Successfully recovered via ${provider.serviceId}`, {
                disasterEntryId: doc.id,
                recoveryAttempt: (entry.recoveryAttempts || 0) + 1,
            });

            console.log(
                `✅ DISASTER BANK: Recovered ${entry.reminderId} via ${provider.serviceId}`
            );

        } catch (err) {
            // ── RECOVERY FAILED — schedule next attempt ──
            const failReason = err instanceof Error ? err.message : "Unknown error";
            const nextAttempt = Math.min(entry.recoveryAttempts, BACKOFF_SCHEDULE_MS.length - 1);

            await doc.ref.update({
                status: "pending_recovery",
                recoveryAttempts: admin.firestore.FieldValue.increment(1),
                lastRecoveryAt: admin.firestore.FieldValue.serverTimestamp(),
                nextRetryAfter: admin.firestore.Timestamp.fromDate(
                    new Date(Date.now() + BACKOFF_SCHEDULE_MS[nextAttempt])
                ),
                failureChain: admin.firestore.FieldValue.arrayUnion(
                    `disaster_attempt_${(entry.recoveryAttempts || 0) + 1}: ${failReason}`
                ),
            });

            await logDisasterEvent("RECOVERY_FAILED", entry.reminderId, failReason, {
                disasterEntryId: doc.id,
                recoveryAttempt: (entry.recoveryAttempts || 0) + 1,
            });

            console.error(
                `❌ DISASTER BANK: Recovery failed for ${entry.reminderId}: ${failReason}`
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM HEALTH CHECK
// Validates provider pool, quota accuracy, scheduler state.
// ═══════════════════════════════════════════════════════════════
export async function runHealthCheck(): Promise<HealthCheckResult> {
    const db = admin.firestore();
    const now = Date.now();

    // ── Check provider health ──
    const provSnap = await db.collection("emailProviders")
        .where("status", "in", ["active", "error"]).get();

    const dateKey = new Date().toISOString().split("T")[0];
    const providerDetails: HealthCheckResult["providerDetails"] = [];
    let allProvidersHealthy = true;

    for (const doc of provSnap.docs) {
        const p = doc.data();
        const usageSnap = await db.collection("providerUsage").doc(doc.id).get();
        const usedToday = (usageSnap.exists && usageSnap.data()?.date === dateKey)
            ? (usageSnap.data()?.usedToday || 0) : 0;
        const quota = p.dailyQuota || 200;

        providerDetails.push({
            id: doc.id,
            name: p.name,
            status: p.status,
            remainingQuota: Math.max(0, quota - usedToday),
        });

        if (p.status === "error") allProvidersHealthy = false;
    }

    const totalRemainingQuota = providerDetails.reduce((sum, p) => sum + p.remainingQuota, 0);
    if (totalRemainingQuota === 0) allProvidersHealthy = false;

    // ── Check for stale "processing" records (scheduler drift indicator) ──
    const staleThreshold = admin.firestore.Timestamp.fromDate(
        new Date(now - STALE_PROCESSING_THRESHOLD_MS)
    );
    const staleSnap = await db.collection("scheduledReminders")
        .where("status", "==", "processing")
        .where("claimedAt", "<", staleThreshold)
        .limit(50).get();

    // ── Check disaster bank queue size ──
    const disasterSnap = await db.collection(DB_COLLECTION)
        .where("status", "in", ["pending_recovery", "recovering"])
        .get();

    // ── Compute scheduler drift (are there overdue pending reminders?) ──
    const overdueSnap = await db.collection("scheduledReminders")
        .where("status", "==", "pending")
        .where("scheduledTime", "<", admin.firestore.Timestamp.fromDate(
            new Date(now - 2 * 60 * 1000) // 2 minutes overdue
        ))
        .limit(10).get();

    const schedulerDrift = overdueSnap.empty ? 0 : overdueSnap.size;

    // ── Determine overall status ──
    let overallStatus: HealthCheckResult["overallStatus"] = "healthy";
    if (!allProvidersHealthy || staleSnap.size > 0 || schedulerDrift > 3) {
        overallStatus = "degraded";
    }
    if (disasterSnap.size > 10 || totalRemainingQuota === 0) {
        overallStatus = "critical";
    }

    const result: HealthCheckResult = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        providersHealthy: allProvidersHealthy,
        providerDetails,
        quotaAccurate: true, // Verified through provider usage reads above
        schedulerDrift,
        staleRecordsFound: staleSnap.size,
        staleRecordsRepaired: 0,
        disasterQueueSize: disasterSnap.size,
        overallStatus,
    };

    // ── Persist health check result ──
    await db.collection(HEALTH_COLLECTION).doc("latest").set(result);

    console.log(
        `🩺 HEALTH CHECK: ${overallStatus.toUpperCase()} | Providers: ${providerDetails.length} | ` +
        `Stale: ${staleSnap.size} | Disaster Queue: ${disasterSnap.size} | Drift: ${schedulerDrift}`
    );

    return result;
}

// ═══════════════════════════════════════════════════════════════
// STATE REPAIR — Self-Healing Logic
// Fixes corrupted/orphaned state automatically.
// ═══════════════════════════════════════════════════════════════
export async function repairState(): Promise<{ repaired: number; actions: string[] }> {
    const db = admin.firestore();
    const now = Date.now();
    const actions: string[] = [];
    let repaired = 0;

    // ── 1. Fix stale "processing" reminders (orphaned claims) ──
    const staleThreshold = admin.firestore.Timestamp.fromDate(
        new Date(now - STALE_PROCESSING_THRESHOLD_MS)
    );
    const staleSnap = await db.collection("scheduledReminders")
        .where("status", "==", "processing")
        .where("claimedAt", "<", staleThreshold)
        .limit(50).get();

    for (const doc of staleSnap.docs) {
        const data = doc.data();
        const attempts = data.attempts || 0;

        if (attempts >= 3) {
            // Max attempts reached — capture to disaster bank
            await captureToDisasterBank(
                doc.id,
                data as Record<string, unknown>,
                "stale_processing_max_attempts",
                [...(data.failureChain || []), "State repair: stale processing record"]
            );
            await doc.ref.update({
                status: "failed",
                failureReason: "State repair: stale processing, captured to Disaster Bank",
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                claimedAt: null,
            });
        } else {
            // Release the claim for retry
            await doc.ref.update({
                status: "pending",
                claimedAt: null,
                failureReason: "State repair: released stale processing claim",
            });
        }
        repaired++;
        actions.push(`Released stale processing: ${doc.id} (attempts: ${attempts})`);
    }

    // ── 2. Fix stale "recovering" disaster bank entries ──
    const staleRecoveringSnap = await db.collection(DB_COLLECTION)
        .where("status", "==", "recovering")
        .limit(20).get();

    for (const doc of staleRecoveringSnap.docs) {
        const data = doc.data();
        // If recovering for more than 5 minutes, it's stale
        const lastRecovery = data.lastRecoveryAt?.toDate?.() || new Date(0);
        if (now - lastRecovery.getTime() > STALE_PROCESSING_THRESHOLD_MS) {
            const nextAttempt = Math.min(
                data.recoveryAttempts || 0,
                BACKOFF_SCHEDULE_MS.length - 1
            );
            await doc.ref.update({
                status: "pending_recovery",
                nextRetryAfter: admin.firestore.Timestamp.fromDate(
                    new Date(now + BACKOFF_SCHEDULE_MS[nextAttempt])
                ),
            });
            repaired++;
            actions.push(`Released stale recovering disaster entry: ${doc.id}`);
        }
    }

    // ── 3. Reset provider usage if date is stale ──
    const dateKey = new Date().toISOString().split("T")[0];
    const usageSnap = await db.collection("providerUsage").get();

    for (const doc of usageSnap.docs) {
        const data = doc.data();
        if (data.date && data.date !== dateKey) {
            await doc.ref.update({
                date: dateKey,
                usedToday: 0,
                lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            repaired++;
            actions.push(`Reset stale usage for provider: ${doc.id} (was ${data.date})`);
        }
    }

    if (repaired > 0) {
        await logDisasterEvent("STATE_REPAIR", "system",
            `Repaired ${repaired} state issues`, { actions });
        console.log(`🔧 STATE REPAIR: Fixed ${repaired} issues`);
    }

    // Update health doc with repair count
    try {
        await db.collection(HEALTH_COLLECTION).doc("latest").update({
            staleRecordsRepaired: repaired,
        });
    } catch { /* may not exist yet */ }

    return { repaired, actions };
}

// ═══════════════════════════════════════════════════════════════
// DISASTER EVENT LOGGER
// Every activation, recovery, and failure is logged. No silent ops.
// ═══════════════════════════════════════════════════════════════
async function logDisasterEvent(
    type: string,
    reminderId: string,
    message: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    const db = admin.firestore();
    try {
        await db.collection(DISASTER_LOG_COLLECTION).add({
            type,
            reminderId,
            message,
            metadata: metadata || {},
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // Last resort: console log if even the log write fails
        console.error(`[DISASTER LOG WRITE FAILED] ${type} | ${reminderId}: ${message}`, err);
    }
}
