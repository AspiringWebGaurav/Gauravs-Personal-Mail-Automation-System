import * as admin from "firebase-admin";
import { logger } from "./logger";

const DEFAULT_DAILY_QUOTA = 200;
const CIRCUIT_BREAKER_THRESHOLD = 5; // Auto-disable after N consecutive failures

interface ProviderDoc {
    id: string;
    name: string;
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    status: "active" | "disabled" | "error";
    dailyQuota: number;
    priority: number;
    isDefault: boolean;
    updatedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
}

interface ProviderWithUsage extends ProviderDoc {
    usedToday: number;
    remainingQuota: number;
}

function getTodayString(): string {
    return new Date().toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════════
// SEED DEFAULT PROVIDERS
// On first invocation, seed 2 default providers from env vars
// if no providers exist in Firestore yet.
// ═══════════════════════════════════════════════════════════════
async function ensureDefaultProviders(): Promise<void> {
    const db = admin.firestore();
    const snap = await db.collection("emailProviders").limit(1).get();

    if (!snap.empty) return; // Already seeded

    const defaults = [
        {
            name: "Primary Provider",
            serviceId: process.env.EMAILJS_PROVIDER_1_SERVICE_ID || "",
            templateId: process.env.EMAILJS_PROVIDER_1_TEMPLATE_ID || "",
            publicKey: process.env.EMAILJS_PROVIDER_1_PUBLIC_KEY || "",
            privateKey: process.env.EMAILJS_PROVIDER_1_PRIVATE_KEY || "",
            priority: 1,
        },
        {
            name: "Secondary Provider",
            serviceId: process.env.EMAILJS_PROVIDER_2_SERVICE_ID || "",
            templateId: process.env.EMAILJS_PROVIDER_2_TEMPLATE_ID || "",
            publicKey: process.env.EMAILJS_PROVIDER_2_PUBLIC_KEY || "",
            privateKey: process.env.EMAILJS_PROVIDER_2_PRIVATE_KEY || "",
            priority: 2,
        },
    ];

    const batch = db.batch();
    for (const p of defaults) {
        // Only seed if credentials exist
        if (!p.serviceId || !p.publicKey) continue;

        const ref = db.collection("emailProviders").doc();
        batch.set(ref, {
            ...p,
            status: "active",
            dailyQuota: DEFAULT_DAILY_QUOTA,
            isDefault: true,
            createdBy: "system",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    logger.info("Seeded default email providers from env vars");
}

// ═══════════════════════════════════════════════════════════════
// GET PROVIDER USAGE (Atomic with transaction)
// ═══════════════════════════════════════════════════════════════
async function getProviderUsage(providerId: string): Promise<number> {
    const db = admin.firestore();
    const ref = db.collection("providerUsage").doc(providerId);
    const today = getTodayString();

    return db.runTransaction(async (txn) => {
        const snap = await txn.get(ref);

        if (!snap.exists) {
            txn.set(ref, {
                date: today,
                usedToday: 0,
                lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return 0;
        }

        const data = snap.data()!;
        if (data.date !== today) {
            txn.update(ref, {
                date: today,
                usedToday: 0,
                lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return 0;
        }

        return data.usedToday || 0;
    });
}

// ═══════════════════════════════════════════════════════════════
// SELECT PROVIDER — Dynamic, Randomized, Balanced
//
// 1. Fetch ALL active providers from Firestore
// 2. Get daily usage for each
// 3. Filter out exhausted providers
// 4. Randomized-weighted selection (lower usage = higher chance)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// CACHING LAYER (In-Memory)
// Reduces Firestore reads by caching provider state for short durations.
// ═══════════════════════════════════════════════════════════════
let providerCache: {
    data: ProviderWithUsage[];
    timestamp: number;
} | null = null;

const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

// ═══════════════════════════════════════════════════════════════
// SELECT PROVIDER — Dynamic, Randomized, Balanced, Cached
// ═══════════════════════════════════════════════════════════════
export async function selectProvider(): Promise<ProviderWithUsage | null> {
    const now = Date.now();

    // 1. Return cached data if valid
    if (providerCache && (now - providerCache.timestamp < CACHE_TTL_MS)) {
        const cachedAvailable = providerCache.data.filter(p => p.remainingQuota > 0);
        if (cachedAvailable.length > 0) {
            return weightedRandomSelect(cachedAvailable);
        }
        // If all cached are exhausted, force refresh immediately
        logger.info('Cache indicates exhaustion, forcing refresh...');
    }

    const db = admin.firestore();

    // Ensure defaults exist on first run
    await ensureDefaultProviders();

    // 2. Fetch all active OR error providers dynamically from Firestore
    // We fetch 'error' status too, to check for Half-Open recovery opportunities
    const snap = await db
        .collection("emailProviders")
        .where("status", "in", ["active", "error"])
        .get();

    if (snap.empty) {
        logger.error("No active email providers found in Firestore");
        return null;
    }

    const providers: ProviderDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    })) as ProviderDoc[];

    // 3. Get usage for each provider in parallel
    const usagePromises = providers.map(async (p): Promise<ProviderWithUsage> => {
        try {
            const usedToday = await getProviderUsage(p.id);
            const quota = p.dailyQuota || DEFAULT_DAILY_QUOTA;
            return {
                ...p,
                usedToday,
                remainingQuota: Math.max(0, quota - usedToday),
            };
        } catch (err) {
            logger.warn(`Usage fetch failed for ${p.name}`, { error: err });
            return {
                ...p,
                usedToday: 0,
                remainingQuota: p.dailyQuota || DEFAULT_DAILY_QUOTA,
            };
        }
    });

    const providersWithUsage = await Promise.all(usagePromises);

    // 4. Update Cache
    providerCache = {
        data: providersWithUsage,
        timestamp: now
    };

    // Filter: only providers with remaining quota AND (Active OR Half-Open)
    const HALF_OPEN_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const available = providersWithUsage.filter((p) => {
        if (p.remainingQuota <= 0) return false;

        if (p.status === 'active') return true;

        if (p.status === 'error') {
            // Check if ready for Half-Open probe
            // We need lastFailureAt from providerUsage, but getProviderUsage only returns usedToday.
            // We need to update getProviderUsage to return more data or fetch it here.
            // For now, let's assume we can't easily check lastFailureAt without a read.
            // Actually, getProviderUsage reads 'providerUsage' doc.
            // Let's modify getProviderUsage to return lastFailureAt if possible, 
            // OR just skip this check if we want to be simple, but that would flood.
            // Let's rely on 'updatedAt' of the provider doc? 
            // When we set to error, we set updatedAt.
            const lastUpdated = p.updatedAt ? (p.updatedAt as admin.firestore.Timestamp).toDate() : new Date();
            const timeSinceError = now - lastUpdated.getTime();

            if (timeSinceError > HALF_OPEN_TIMEOUT_MS) {
                // HALF-OPEN: Allow 1 probe.
                // We don't have distributed lock here, but randomized selection means
                // multiple concurrent requests might pick it. That's acceptable for "Half-open".
                console.log(`[CircuitBreaker] Probing Error Provider ${p.id} (Half-Open)`);
                return true;
            }
        }
        return false;
    });

    if (available.length === 0) {
        logger.warn("All providers exhausted quota for today");
        return null;
    }

    return weightedRandomSelect(available);
}

function weightedRandomSelect(available: ProviderWithUsage[]): ProviderWithUsage {
    // ═══ RANDOMIZED-WEIGHTED SELECTION ═══
    // Weight = remainingQuota (more remaining = higher selection chance)
    const totalWeight = available.reduce((sum, p) => sum + p.remainingQuota, 0);
    let random = Math.random() * totalWeight;

    for (const provider of available) {
        random -= provider.remainingQuota;
        if (random <= 0) {
            return provider;
        }
    }
    return available[0];
}

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER — Track consecutive failures per provider
// Auto-disables after CIRCUIT_BREAKER_THRESHOLD consecutive failures.
// ═══════════════════════════════════════════════════════════════
export async function recordProviderFailure(providerId: string): Promise<void> {
    const db = admin.firestore();
    const ref = db.collection("providerUsage").doc(providerId);

    await db.runTransaction(async (txn) => {
        const snap = await txn.get(ref);
        const currentFailures = snap.exists ? (snap.data()?.consecutiveFailures || 0) : 0;
        const newFailures = currentFailures + 1;

        txn.set(ref, {
            consecutiveFailures: newFailures,
            lastFailureAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Auto-disable provider after threshold
        if (newFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            const provRef = db.collection("emailProviders").doc(providerId);
            txn.update(provRef, {
                status: "error",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            logger.error(`🔴 CIRCUIT BREAKER: Provider ${providerId} disabled after ${newFailures} consecutive failures`);
        }
    });
}

export async function recordProviderSuccess(providerId: string): Promise<void> {
    const db = admin.firestore();

    // 1. Reset failure count
    await db.collection("providerUsage").doc(providerId).set({
        consecutiveFailures: 0,
        lastSuccessAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2. If provider was in 'error' state, set it back to 'active' (Close Circuit)
    // We do this blindly or check first. Blind write to 'active' is safe and self-healing.
    // Optimization: Only write if needed? No, blind write is O(1) write consistent.
    // But we want to avoid writing every success if it's already active.
    // Let's assume it's fine for now, or we can check 'status' in providerCache if we had it.
    // To be safe and avoid aggressive writes on every email, we should probably check.
    // BUT we are in a cloud function.
    // Let's only update if we suspect it was error.
    // Actually, recordProviderSuccess is called after EVERY success.
    // Writing to 'emailProviders' every time is bad.
    // We should only do it if we know it was recovering.
    // But we don't pass that context easily.
    // Let's check `providerUsage`? No.
    // Let's use `update` with a precondition? Firestore doesn't support "update if status=error".
    // We can run a transaction? Expensive.
    // Compromise: We only re-enable if logic elsewhere flags it, OR we accept that "Probing"
    // will eventually get a manual reset or we add a "check" here.

    // BETTER APPROACH: In `selectProvider`, if we pick a "Half-Open" provider, we are taking a risk.
    // If that succeeds, we MUST re-enable.
    // We can't easily know here. 
    // Let's just do a conditional update using a Query?
    // "Update provider set status=active where id=X and status=error"
    // Firestore doesn't do "Update Where" natively without read.

    // FASTEST FIX: Just read the provider doc. It's 1 read.
    // "Optimize aggressively". 
    // Logic: If we are in "Normal" flow, 99.9% are active.
    // We don't want 1 extra read per email.

    // Solution: We won't auto-close the circuit here on EVERY success.
    // We will rely on `systemHealthCheck` (every 15m) to re-enable them? No, too slow.
    // We will rely on `selectProvider`? No.

    // Okay, we will use `runTransaction` in `recordProviderSuccess` ONLY if we think it might be needed?
    // How about we just don't fix it automatically in `recordProviderSuccess` for now?
    // The user requirement: "Close on recovery".

    // Let's add a "recovery mode" flag to `recordProviderSuccess`?
    // We can change the signature or just read it.
    // Let's Read. 1 read per email sent is "Okay" if it ensures reliability? 
    // No, "Eliminate duplicate reads". 10K users sending emails = 10K reads.

    // Let's use the CACHE. 
    // `selectProvider` has a cache. But `recordProviderSuccess` is in a different scope?
    // `emailSender` calls it.

    // Let's just use a fire-and-forget update that checks status field?
    // `db.collection('emailProviders').doc(providerId).update({ status: 'active' })`
    // If it's already active, it's a "No-op" write? No, it's a write.

    // PROPOSAL: Only reset if `consecutiveFailures > 0` (which we reset above).
    // We don't know the previous value.

    // Let's leave it as: logic in `systemHealthCheck` or valid Half-Open flow.
    // Wait, if it succeeds, it stays in `error` status with my current code!
    // So it will be probed every 5 minutes forever.
    // We MUST set it to active.

    // I will read the doc. Safety first.
    const provRef = db.collection("emailProviders").doc(providerId);
    const provSnap = await provRef.get();
    if (provSnap.exists && provSnap.data()?.status === 'error') {
        await provRef.update({
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info(`🟢 CIRCUIT BREAKER: Provider ${providerId} RECOVERED (Closed Circuit)`);
    }
}

// ═══════════════════════════════════════════════════════════════
// INCREMENT PROVIDER USAGE
// ═══════════════════════════════════════════════════════════════
export async function incrementProviderUsage(providerId: string): Promise<void> {
    const db = admin.firestore();
    const ref = db.collection("providerUsage").doc(providerId);
    const today = getTodayString();

    await ref.set(
        {
            date: today,
            usedToday: admin.firestore.FieldValue.increment(1),
            lastIncrementAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );
}
