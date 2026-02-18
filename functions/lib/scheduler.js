"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReminders = processReminders;
const admin = __importStar(require("firebase-admin"));
const providerBalancer_1 = require("./providerBalancer");
const emailSender_1 = require("./emailSender");
const emailTemplateRenderer_1 = require("./emailTemplateRenderer");
const emailSystem_1 = require("./lib/emailSystem");
const MAX_LATE_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const THROTTLE_MS = 1000; // Anti-abuse throttle between sends
const BATCH_LIMIT = 50; // Max reminders per invocation
async function processReminders() {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    // Query pending reminders that are due
    const query = db
        .collection("scheduledReminders")
        .where("status", "==", "pending")
        .where("scheduledTime", "<=", now)
        .limit(BATCH_LIMIT);
    const snap = await query.get();
    if (snap.empty)
        return;
    console.log(`Scheduler: Processing ${snap.size} due reminders`);
    for (const doc of snap.docs) {
        const reminder = doc.data();
        // ═══ IDEMPOTENCY: Skip already-processed (prevents double-send on concurrent invocations) ═══
        if (reminder.processedAt)
            continue;
        // ═══ TRANSACTION LOCK: Atomically claim this reminder to prevent race conditions ═══
        let claimed = false;
        try {
            claimed = await db.runTransaction(async (txn) => {
                const freshSnap = await txn.get(doc.ref);
                const freshData = freshSnap.data();
                if (!freshData || freshData.status !== "pending" || freshData.processedAt) {
                    return false; // Already claimed by another invocation
                }
                txn.update(doc.ref, {
                    status: "processing",
                    claimedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return true;
            });
        }
        catch (txnErr) {
            console.warn(`Reminder ${doc.id}: Transaction claim failed (likely concurrent):`, txnErr);
            continue; // Skip — another invocation is handling it
        }
        if (!claimed) {
            continue; // Already taken by another function instance
        }
        // ═══ LATE CHECK: Expire if too old ═══
        const scheduledTime = reminder.scheduledTime.toDate();
        const minutesLate = (Date.now() - scheduledTime.getTime()) / (1000 * 60);
        if (minutesLate > MAX_LATE_MINUTES) {
            await doc.ref.update({
                status: "expired_late",
                failureReason: `Expired: ${Math.round(minutesLate)} minutes late (limit: ${MAX_LATE_MINUTES})`,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Reminder ${doc.id} expired (${Math.round(minutesLate)} min late)`);
            continue;
        }
        // ═══ RETRY LIMIT CHECK ═══
        if (reminder.attempts >= MAX_ATTEMPTS) {
            await doc.ref.update({
                status: "failed",
                failureReason: `Max attempts (${MAX_ATTEMPTS}) exceeded`,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            continue;
        }
        // ═══ PROVIDER SELECTION (balanced, lowest-usage first) ═══
        const provider = await (0, providerBalancer_1.selectProvider)();
        if (!provider) {
            await doc.ref.update({
                status: "failed",
                failureReason: "quota_exceeded",
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Reminder ${doc.id} failed: all providers exhausted`);
            continue;
        }
        // ═══ USER DAILY QUOTA CHECK (200/user) ═══
        const dateKey = new Date().toISOString().split('T')[0];
        const userId = reminder.userId || 'system';
        const usageRef = db.collection('users').doc(userId).collection('usage').doc(dateKey);
        try {
            const usageSnap = await usageRef.get();
            const currentUsage = usageSnap.exists ? (usageSnap.data()?.count || 0) : 0;
            if (currentUsage >= 200) {
                await doc.ref.update({
                    status: "failed",
                    failureReason: "daily_quota_exceeded",
                    processedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await usageRef.set({
                    failedCount: admin.firestore.FieldValue.increment(1),
                    lastFailedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                console.log(`Reminder ${doc.id} failed: Daily quota exceeded for ${userId}`);
                continue;
            }
        }
        catch (e) {
            console.warn('Quota check warning:', e);
            // Proceed — don't block sends on quota read errors
        }
        // ═══ EMAIL RENDERING & SENDING ═══
        try {
            // Template Resolution (System → DB → Default)
            let layoutType = "card";
            let subjectFormat = "Reminder: {{eventTitle}}";
            if (reminder.templateId) {
                if (reminder.templateId.startsWith('sys_')) {
                    const sysT = emailSystem_1.systemTemplates.find((t) => t.id === reminder.templateId);
                    if (sysT) {
                        layoutType = sysT.layoutType;
                        subjectFormat = sysT.subjectFormat;
                    }
                }
                else {
                    try {
                        const tDoc = await db.collection("emailTemplates").doc(reminder.templateId).get();
                        if (tDoc.exists) {
                            const tData = tDoc.data();
                            layoutType = tData?.layoutType || "card";
                            subjectFormat = tData?.subjectFormat || subjectFormat;
                        }
                    }
                    catch { /* fallback to defaults */ }
                }
            }
            // Theme Resolution (System → DB → Default)
            let themeColors = undefined;
            if (reminder.themeId) {
                if (reminder.themeId.startsWith('sys_')) {
                    const sysTh = emailSystem_1.systemThemes.find((t) => t.id === reminder.themeId);
                    if (sysTh) {
                        themeColors = {
                            primaryColor: sysTh.primaryColor,
                            secondaryColor: sysTh.secondaryColor,
                            backgroundColor: sysTh.backgroundColor,
                            textColor: sysTh.textColor,
                            borderRadius: sysTh.borderRadius,
                        };
                    }
                }
                else {
                    try {
                        const thDoc = await db.collection("emailThemes").doc(reminder.themeId).get();
                        if (thDoc.exists) {
                            const th = thDoc.data();
                            themeColors = {
                                primaryColor: th?.primaryColor,
                                secondaryColor: th?.secondaryColor,
                                backgroundColor: th?.backgroundColor,
                                textColor: th?.textColor,
                                borderRadius: th?.borderRadius,
                            };
                        }
                    }
                    catch { /* fallback to defaults */ }
                }
            }
            // Subject line resolution
            const emailSubject = subjectFormat
                .replace(/\{\{eventTitle\}\}/g, reminder.eventTitle || 'Event')
                .replace(/\{\{eventTime\}\}/g, scheduledTime.toLocaleString());
            // Message resolution: user custom > template default > system default
            const rawMessage = reminder.customMessage || `Your event "${reminder.eventTitle}" is starting soon!`;
            const resolvedMessage = rawMessage
                .replace(/\{\{eventTitle\}\}/g, reminder.eventTitle || 'Event')
                .replace(/\{\{eventTime\}\}/g, scheduledTime.toLocaleString())
                .replace(/\{\{recipientName\}\}/g, "there")
                .replace(/\{\{location\}\}/g, reminder.location || "TBD");
            // Render full HTML email
            const htmlContent = (0, emailTemplateRenderer_1.renderEmailTemplate)(layoutType, {
                eventTitle: reminder.eventTitle,
                eventTime: scheduledTime.toLocaleString(),
                eventLocation: reminder.location,
                message: resolvedMessage,
            }, themeColors);
            // ═══ SEND EMAIL ═══
            await (0, emailSender_1.sendEmail)(provider, {
                to_email: reminder.email,
                from_name: reminder.senderName || "GMSS System",
                reply_to_email: reminder.senderEmail || undefined,
                event_title: reminder.eventTitle,
                event_id: reminder.eventId,
                scheduled_time: scheduledTime.toISOString(),
                htmlContent,
                subject: emailSubject,
                customTitle: emailSubject,
            });
            // ═══ SUCCESS: Mark sent (atomic update) ═══
            await doc.ref.update({
                status: "sent",
                providerUsed: provider.serviceId,
                attempts: admin.firestore.FieldValue.increment(1),
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Increment provider daily usage
            await (0, providerBalancer_1.incrementProviderUsage)(provider.id);
            // Increment user daily quota + track sent
            try {
                await usageRef.set({
                    count: admin.firestore.FieldValue.increment(1),
                    sentCount: admin.firestore.FieldValue.increment(1),
                    lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            catch (e) {
                console.warn('Failed to update quota count:', e);
            }
            console.log(`Reminder ${doc.id} sent via ${provider.serviceId}`);
            // ═══ ANTI-ABUSE THROTTLE ═══
            await new Promise((r) => setTimeout(r, THROTTLE_MS));
        }
        catch (err) {
            // ═══ FAILURE: Track attempt, keep pending for retry ═══
            const failReason = err instanceof Error ? err.message : "Unknown error";
            await doc.ref.update({
                status: "pending", // Revert to pending for retry
                attempts: admin.firestore.FieldValue.increment(1),
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                failureReason: failReason,
                processedAt: null, // Clear so retry logic works
                claimedAt: null, // Release the claim
            });
            // Track failed in user usage
            try {
                await usageRef.set({
                    failedCount: admin.firestore.FieldValue.increment(1),
                    lastFailedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            catch { /* best effort */ }
            console.error(`Reminder ${doc.id} failed attempt (${failReason})`);
        }
    }
}
//# sourceMappingURL=scheduler.js.map