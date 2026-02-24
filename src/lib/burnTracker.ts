/**
 * Firebase Burn Tracker — Client-side instrumentation for monitoring Firestore usage.
 *
 * Architecture:
 * - All counters are in-memory (zero Firestore reads for tracking)
 * - localStorage cache flushed every 60s for persistence
 * - Firestore batch write once per hour (~24 writes/day total)
 * - Anomaly detection on hourly boundaries
 */

// ── Free Tier Limits ──
export const FREE_TIER = {
    READS_PER_DAY: 50_000,
    WRITES_PER_DAY: 20_000,
    DELETES_PER_DAY: 20_000,
} as const;

const READS_PER_HOUR = Math.floor(FREE_TIER.READS_PER_DAY / 24);
const WRITES_PER_HOUR = Math.floor(FREE_TIER.WRITES_PER_DAY / 24);
const DELETES_PER_HOUR = Math.floor(FREE_TIER.DELETES_PER_DAY / 24);

// ── Types ──
export interface HourlySlot {
    reads: number;
    writes: number;
    deletes: number;
}

export interface BurnAnomaly {
    type: 'spike_reads' | 'spike_writes' | 'spike_deletes' | 'loop_detected';
    message: string;
    timestamp: number;
    value: number;
    threshold: number;
}

export interface DailySummary {
    date: string;
    reads: number;
    writes: number;
    deletes: number;
}

export type WarningLevel = 'safe' | 'caution' | 'warning' | 'critical';

// ── Storage Keys ──
const LS_KEY_HOURLY = 'gpmas_burn_hourly';
const LS_KEY_DAILY = 'gpmas_burn_daily';
const LS_KEY_ANOMALIES = 'gpmas_burn_anomalies';
const LS_KEY_CURRENT = 'gpmas_burn_current';

// ── In-Memory State ──
let currentHour = new Date().getHours();
let currentDate = new Date().toISOString().split('T')[0];

const current: HourlySlot = { reads: 0, writes: 0, deletes: 0 };
const todayTotals: HourlySlot = { reads: 0, writes: 0, deletes: 0 };

let hourlyHistory: Record<string, HourlySlot> = {};
let dailyHistory: DailySummary[] = [];
let anomalies: BurnAnomaly[] = [];

let lastLocalFlush = 0;
let lastFirestoreFlush = -1;
let initialized = false;

// Rate tracking for loop detection
let readBurstCounter = 0;
let readBurstResetTimer: ReturnType<typeof setTimeout> | null = null;

// ── Initialize from localStorage ──
function init() {
    if (initialized) return;
    initialized = true;

    try {
        const savedCurrent = localStorage.getItem(LS_KEY_CURRENT);
        if (savedCurrent) {
            const parsed = JSON.parse(savedCurrent);
            if (parsed.date === currentDate) {
                Object.assign(todayTotals, parsed.totals || {});
                if (parsed.hour === currentHour) {
                    Object.assign(current, parsed.current || {});
                }
            }
        }

        const savedHourly = localStorage.getItem(LS_KEY_HOURLY);
        if (savedHourly) {
            const parsed = JSON.parse(savedHourly);
            if (parsed.date === currentDate) {
                hourlyHistory = parsed.slots || {};
            }
        }

        const savedDaily = localStorage.getItem(LS_KEY_DAILY);
        if (savedDaily) {
            dailyHistory = JSON.parse(savedDaily) || [];
            // Keep only last 30 days
            dailyHistory = dailyHistory.slice(-30);
        }

        const savedAnomalies = localStorage.getItem(LS_KEY_ANOMALIES);
        if (savedAnomalies) {
            anomalies = JSON.parse(savedAnomalies) || [];
            // Keep only last 50
            anomalies = anomalies.slice(-50);
        }
    } catch {
        // Corrupted localStorage — start fresh
    }
}

// ── Hour/Day Boundary Check ──
function checkBoundary() {
    const now = new Date();
    const hour = now.getHours();
    const date = now.toISOString().split('T')[0];

    if (hour !== currentHour) {
        // Save current hour to history
        hourlyHistory[String(currentHour)] = { ...current };

        // Check for anomalies on the completed hour
        detectAnomalies(current, currentHour);

        // Flush to Firestore if enough time passed
        if (lastFirestoreFlush !== currentHour) {
            flushToFirestore();
            lastFirestoreFlush = currentHour;
        }

        // Reset current hour
        current.reads = 0;
        current.writes = 0;
        current.deletes = 0;
        currentHour = hour;
    }

    if (date !== currentDate) {
        // Day rolled over — archive today's data
        dailyHistory.push({
            date: currentDate,
            reads: todayTotals.reads,
            writes: todayTotals.writes,
            deletes: todayTotals.deletes,
        });
        dailyHistory = dailyHistory.slice(-30);

        // Reset daily
        todayTotals.reads = 0;
        todayTotals.writes = 0;
        todayTotals.deletes = 0;
        hourlyHistory = {};
        currentDate = date;
    }
}

// ── Core Tracking Functions ──
export function trackRead(count: number = 1) {
    init();
    checkBoundary();
    current.reads += count;
    todayTotals.reads += count;

    // Loop detection: if >500 reads in 2 seconds, flag anomaly
    readBurstCounter += count;
    if (readBurstResetTimer) clearTimeout(readBurstResetTimer);
    readBurstResetTimer = setTimeout(() => { readBurstCounter = 0; }, 2000);

    if (readBurstCounter > 500) {
        addAnomaly({
            type: 'loop_detected',
            message: `Read burst detected: ${readBurstCounter} reads in <2s. Possible listener loop.`,
            timestamp: Date.now(),
            value: readBurstCounter,
            threshold: 500,
        });
        readBurstCounter = 0;
    }

    maybeFlushLocal();
}

export function trackWrite(count: number = 1) {
    init();
    checkBoundary();
    current.writes += count;
    todayTotals.writes += count;
    maybeFlushLocal();
}

export function trackDelete(count: number = 1) {
    init();
    checkBoundary();
    current.deletes += count;
    todayTotals.deletes += count;
    maybeFlushLocal();
}

// ── Anomaly Detection ──
function detectAnomalies(slot: HourlySlot, hour: number) {
    if (slot.reads > READS_PER_HOUR * 0.9) {
        addAnomaly({
            type: 'spike_reads',
            message: `Hour ${hour}: ${slot.reads} reads (>${Math.round(READS_PER_HOUR * 0.9)} threshold)`,
            timestamp: Date.now(),
            value: slot.reads,
            threshold: READS_PER_HOUR,
        });
    }
    if (slot.writes > WRITES_PER_HOUR * 0.9) {
        addAnomaly({
            type: 'spike_writes',
            message: `Hour ${hour}: ${slot.writes} writes (>${Math.round(WRITES_PER_HOUR * 0.9)} threshold)`,
            timestamp: Date.now(),
            value: slot.writes,
            threshold: WRITES_PER_HOUR,
        });
    }
    if (slot.deletes > DELETES_PER_HOUR * 0.9) {
        addAnomaly({
            type: 'spike_deletes',
            message: `Hour ${hour}: ${slot.deletes} deletes (>${Math.round(DELETES_PER_HOUR * 0.9)} threshold)`,
            timestamp: Date.now(),
            value: slot.deletes,
            threshold: DELETES_PER_HOUR,
        });
    }
}

function addAnomaly(anomaly: BurnAnomaly) {
    anomalies.push(anomaly);
    anomalies = anomalies.slice(-50);
    try {
        localStorage.setItem(LS_KEY_ANOMALIES, JSON.stringify(anomalies));
    } catch { /* quota */ }
}

// ── Warning Level Calculation ──
export function getWarningLevel(metric: 'reads' | 'writes' | 'deletes'): WarningLevel {
    const limits = {
        reads: FREE_TIER.READS_PER_DAY,
        writes: FREE_TIER.WRITES_PER_DAY,
        deletes: FREE_TIER.DELETES_PER_DAY,
    };
    const value = todayTotals[metric];
    const limit = limits[metric];
    const pct = (value / limit) * 100;

    if (pct >= 100) return 'critical';
    if (pct >= 90) return 'warning';
    if (pct >= 70) return 'caution';
    return 'safe';
}

// ── Burn Efficiency Score ──
export function getBurnScore(): number {
    const totalOps = todayTotals.reads + todayTotals.writes + todayTotals.deletes;
    const maxSafe = FREE_TIER.READS_PER_DAY + FREE_TIER.WRITES_PER_DAY + FREE_TIER.DELETES_PER_DAY;
    if (totalOps === 0) return 100;
    const usage = (totalOps / maxSafe) * 100;
    return Math.max(0, Math.round(100 - usage));
}

// ── Projected End-of-Day ──
export function getProjection(): HourlySlot {
    const now = new Date();
    const hoursLeft = 24 - now.getHours() - (now.getMinutes() / 60);
    const hoursElapsed = 24 - hoursLeft;
    if (hoursElapsed < 0.5) return { ...todayTotals };

    const rate = {
        reads: todayTotals.reads / hoursElapsed,
        writes: todayTotals.writes / hoursElapsed,
        deletes: todayTotals.deletes / hoursElapsed,
    };

    return {
        reads: Math.round(todayTotals.reads + rate.reads * hoursLeft),
        writes: Math.round(todayTotals.writes + rate.writes * hoursLeft),
        deletes: Math.round(todayTotals.deletes + rate.deletes * hoursLeft),
    };
}

// ── Snapshot for UI ──
export function getSnapshot() {
    init();
    checkBoundary();
    return {
        current: { ...current },
        todayTotals: { ...todayTotals },
        hourlyHistory: { ...hourlyHistory, [String(currentHour)]: { ...current } },
        dailyHistory: [...dailyHistory],
        anomalies: [...anomalies],
        warnings: {
            reads: getWarningLevel('reads'),
            writes: getWarningLevel('writes'),
            deletes: getWarningLevel('deletes'),
        },
        burnScore: getBurnScore(),
        projection: getProjection(),
    };
}

// ── localStorage Flush (every 60s) ──
function maybeFlushLocal() {
    const now = Date.now();
    if (now - lastLocalFlush < 60_000) return;
    lastLocalFlush = now;
    flushToLocal();
}

function flushToLocal() {
    try {
        localStorage.setItem(LS_KEY_CURRENT, JSON.stringify({
            date: currentDate,
            hour: currentHour,
            current,
            totals: todayTotals,
        }));
        localStorage.setItem(LS_KEY_HOURLY, JSON.stringify({
            date: currentDate,
            slots: { ...hourlyHistory, [String(currentHour)]: { ...current } },
        }));
        localStorage.setItem(LS_KEY_DAILY, JSON.stringify(dailyHistory));
    } catch { /* localStorage quota */ }
}

// ── Firestore Flush (Legacy: Disabled in favor of BurnEngine) ──
async function flushToFirestore() {
    // Disabled to prevent double-counting and extra writes.
    // BurnEngine (Server-Side) is now the source of truth.
    return;
}

// ── Public: Set user for Firestore flush ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setBurnUser(_userId: string) {
    // Disabled (Server-Side BurnEngine used)
}

// ── Public: Force flush (call on unmount / visibility change) ──
export function forceBurnFlush() {
    flushToLocal();
}

// ── Auto-flush on page hide ──
if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushToLocal();
        }
    });

    window.addEventListener('beforeunload', () => {
        flushToLocal();
    });
}
