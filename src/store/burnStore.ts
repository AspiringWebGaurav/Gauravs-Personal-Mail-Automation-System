import { create } from 'zustand';
import {
    getSnapshot,
    type HourlySlot,
    type DailySummary,
    type BurnAnomaly,
    type WarningLevel,
} from '@/lib/burnTracker';

interface BurnState {
    // Live counters
    current: HourlySlot;
    todayTotals: HourlySlot;

    // History
    hourlyHistory: Record<string, HourlySlot>;
    dailyHistory: DailySummary[];

    // Alerts
    anomalies: BurnAnomaly[];
    warnings: { reads: WarningLevel; writes: WarningLevel; deletes: WarningLevel };

    // Metrics
    burnScore: number;
    projection: HourlySlot;

    // Safe Mode
    safeMode: boolean;
    toggleSafeMode: () => void;

    // Refresh from tracker
    refresh: () => void;
}

export const useBurnStore = create<BurnState>((set, get) => ({
    current: { reads: 0, writes: 0, deletes: 0 },
    todayTotals: { reads: 0, writes: 0, deletes: 0 },
    hourlyHistory: {},
    dailyHistory: [],
    anomalies: [],
    warnings: { reads: 'safe', writes: 'safe', deletes: 'safe' },
    burnScore: 100,
    projection: { reads: 0, writes: 0, deletes: 0 },

    safeMode: typeof window !== 'undefined'
        ? localStorage.getItem('gmss_safe_mode') === 'true'
        : false,

    toggleSafeMode: () => {
        const next = !get().safeMode;
        set({ safeMode: next });
        if (typeof window !== 'undefined') {
            localStorage.setItem('gmss_safe_mode', String(next));
        }
    },

    refresh: () => {
        const snap = getSnapshot();
        set({
            current: snap.current,
            todayTotals: snap.todayTotals,
            hourlyHistory: snap.hourlyHistory,
            dailyHistory: snap.dailyHistory,
            anomalies: snap.anomalies,
            warnings: snap.warnings,
            burnScore: snap.burnScore,
            projection: snap.projection,
        });
    },
}));
