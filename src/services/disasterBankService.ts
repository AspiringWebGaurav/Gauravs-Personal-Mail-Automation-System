import {
    collection, doc, getDocs, onSnapshot, query, orderBy, limit,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

import type { DisasterBankEntry, SystemHealthStatus, DisasterLogEntry } from '@/types';

// ── Real-time subscription to Disaster Bank queue ──
export function subscribeDisasterBank(
    cb: (entries: DisasterBankEntry[]) => void
): Unsubscribe {
    // console.log('[DisasterBank] Subscribing to queue');
    const q = query(
        collection(db, 'disasterBankQueue'),
        orderBy('capturedAt', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snap) => {
        // trackRead(snap.docs.length || 1);
        cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as DisasterBankEntry)));
    }, (error) => {
        console.warn('[DisasterBank] Snapshot error (queue may not exist yet):', error.code);
        cb([]);
    });
}

// ── Get Disaster Bank aggregate stats ──
export async function getDisasterStats(): Promise<{
    total: number;
    pendingRecovery: number;
    recovered: number;
    failed: number;
    successRate: number;
}> {
    try {
        const snap = await getDocs(collection(db, 'disasterBankQueue'));
        // trackRead(snap.docs.length || 1);
        const entries = snap.docs.map(d => d.data());

        const total = entries.length;
        const pendingRecovery = entries.filter(e => e.status === 'pending_recovery' || e.status === 'recovering').length;
        const recovered = entries.filter(e => e.status === 'recovered').length;
        const failed = entries.filter(e => e.status === 'disaster_failed').length;
        const successRate = total > 0 ? Math.round((recovered / total) * 100) : 100;

        return { total, pendingRecovery, recovered, failed, successRate };
    } catch {
        return { total: 0, pendingRecovery: 0, recovered: 0, failed: 0, successRate: 100 };
    }
}

// ── Get latest system health check ──
export async function getSystemHealth(): Promise<SystemHealthStatus | null> {
    try {
        const q = query(collection(db, 'systemHealth'), limit(1));
        const snap = await getDocs(q);
        // trackRead(snap.docs.length || 1);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as SystemHealthStatus;
    } catch {
        return null;
    }
}

// ── Subscribe to system health (real-time) ──
export function subscribeSystemHealth(
    cb: (health: SystemHealthStatus | null) => void
): Unsubscribe {
    return onSnapshot(doc(db, 'systemHealth', 'latest'), (snap) => {
        // trackRead();
        if (snap.exists()) {
            cb(snap.data() as SystemHealthStatus);
        } else {
            cb(null);
        }
    }, (error) => {
        console.warn('[SystemHealth] Snapshot error (doc may not exist yet):', error.code);
        cb(null);
    });
}

// ── Get recent disaster logs ──
export async function getDisasterLogs(limitCount = 20): Promise<DisasterLogEntry[]> {
    try {
        const q = query(
            collection(db, 'disasterLogs'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        // trackRead(snap.docs.length || 1);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as DisasterLogEntry));
    } catch {
        return [];
    }
}

// ── Subscribe to Disaster Bank stats (real-time) ──
export function subscribeDisasterStats(
    cb: (stats: { pending: number; recovered: number; failed: number }) => void
): Unsubscribe {
    const q = query(collection(db, 'disasterBankQueue'));
    return onSnapshot(q, (snap) => {
        // trackRead(snap.docs.length || 1);
        const entries = snap.docs.map(d => d.data());
        cb({
            pending: entries.filter(e => e.status === 'pending_recovery' || e.status === 'recovering').length,
            recovered: entries.filter(e => e.status === 'recovered').length,
            failed: entries.filter(e => e.status === 'disaster_failed').length,
        });
    }, (error) => {
        console.warn('[DisasterStats] Snapshot error:', error.code);
        cb({ pending: 0, recovered: 0, failed: 0 });
    });
}
