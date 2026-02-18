import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { processReminders } from "./scheduler";
import { processDisasterBank, runHealthCheck, repairState } from "./disasterBank";

admin.initializeApp();

// ═══════════════════════════════════════════════════════════════
// LAYER 1: Normal Scheduler — Every minute
// Processes pending reminders with retry, provider rotation, quota checks.
// ═══════════════════════════════════════════════════════════════
export const reminderScheduler = onSchedule(
    {
        schedule: "* * * * *", // Every minute
        timeZone: "UTC",
        retryCount: 0,
        memory: "256MiB",
        timeoutSeconds: 60,
        region: "asia-south1",
    },
    async () => {
        await processReminders();
    }
);

// ═══════════════════════════════════════════════════════════════
// LAYER 2: Disaster Bank Processor — Every 5 minutes
// Attempts recovery of captured failed jobs with exponential backoff.
// ═══════════════════════════════════════════════════════════════
export const disasterBankProcessor = onSchedule(
    {
        schedule: "*/5 * * * *", // Every 5 minutes
        timeZone: "UTC",
        retryCount: 0,
        memory: "256MiB",
        timeoutSeconds: 120,
        region: "asia-south1",
    },
    async () => {
        try {
            await processDisasterBank();
        } catch (err) {
            console.error("🚨 DISASTER BANK PROCESSOR CRASHED:", err);
        }
    }
);

// ═══════════════════════════════════════════════════════════════
// LAYER 3: System Health Check — Every 15 minutes
// Validates system integrity and auto-repairs corrupted state.
// ═══════════════════════════════════════════════════════════════
export const systemHealthCheck = onSchedule(
    {
        schedule: "*/15 * * * *", // Every 15 minutes
        timeZone: "UTC",
        retryCount: 0,
        memory: "256MiB",
        timeoutSeconds: 60,
        region: "asia-south1",
    },
    async () => {
        try {
            await runHealthCheck();
            await repairState();
        } catch (err) {
            console.error("🚨 HEALTH CHECK CRASHED:", err);
        }
    }
);

export * from "./triggers";
