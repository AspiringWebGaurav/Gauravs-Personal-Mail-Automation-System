'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowLeft, Search, Filter, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ── Types ── */
interface ScheduledReminder {
    id: string;
    eventId: string;
    eventTitle?: string;
    email: string;
    participantName?: string;
    userId?: string;
    status: string;
    scheduledTime: Timestamp | null;
    createdAt: Timestamp | null;
    sentAt?: Timestamp | null;
    failedAt?: Timestamp | null;
    processedAt?: Timestamp | null;
    lastError?: string;
    attempts?: number;
    templateId?: string;
    providerUsed?: string;
    idempotencyKey?: string;
    customMessage?: string;
    senderName?: string;
    senderEmail?: string;
}

interface AuditEntry {
    id: string;
    timestamp: Timestamp | null;
    action: string;
    status: string;
    reminderId?: string;
    eventId?: string;
    eventTitle?: string;
    recipientEmail?: string;
    errorMessage?: string;
    errorDetails?: string;
    durationMs?: number;
    provider?: string;
    userId?: string;
}

/* ── Status Helpers ── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    sent: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={14} />, label: 'SENT' },
    failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <XCircle size={14} />, label: 'FAILED' },
    pending: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <Clock size={14} />, label: 'PENDING' },
    processing: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: <Loader2 size={14} />, label: 'PROCESSING' },
    halted: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <AlertTriangle size={14} />, label: 'HALTED' },
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status.toLowerCase()] || STATUS_CONFIG.pending;
}

function formatTime(ts: Timestamp | null | undefined): string {
    if (!ts) return '—';
    try {
        const d = ts.toDate();
        return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
        return '—';
    }
}

function timeAgo(ts: Timestamp | null | undefined): string {
    if (!ts) return '';
    try {
        const diff = Date.now() - ts.toDate().getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    } catch {
        return '';
    }
}

/* ── Filter type ── */
type StatusFilter = 'all' | 'sent' | 'failed' | 'pending' | 'processing';

export default function AuditLogPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Data
    const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    // Subscribe to scheduledReminders — the REAL source of truth
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'scheduledReminders'),
            orderBy('createdAt', 'desc'),
            limit(200)
        );
        const unsub = onSnapshot(q, (snap) => {
            setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() }) as unknown as ScheduledReminder));
        });
        return () => unsub();
    }, [user]);

    // Subscribe to mailAuditLogs — for detailed timeline per reminder
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'mailAuditLogs'),
            orderBy('timestamp', 'desc'),
            limit(500)
        );
        const unsub = onSnapshot(q, (snap) => {
            setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as unknown as AuditEntry));
        });
        return () => unsub();
    }, [user]);

    // Group audit logs by reminderId for fast lookup
    const auditByReminder = useMemo(() => {
        const map = new Map<string, AuditEntry[]>();
        for (const log of auditLogs) {
            if (!log.reminderId) continue;
            const existing = map.get(log.reminderId) || [];
            existing.push(log);
            map.set(log.reminderId, existing);
        }
        return map;
    }, [auditLogs]);

    // Stats
    const stats = useMemo(() => {
        const s = { total: reminders.length, sent: 0, failed: 0, pending: 0, processing: 0 };
        for (const r of reminders) {
            const st = r.status.toLowerCase();
            if (st === 'sent') s.sent++;
            else if (st === 'failed') s.failed++;
            else if (st === 'processing') s.processing++;
            else s.pending++;
        }
        return s;
    }, [reminders]);

    // Filtered reminders
    const filtered = useMemo(() => {
        return reminders.filter(r => {
            if (statusFilter !== 'all' && r.status.toLowerCase() !== statusFilter) return false;
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                return (
                    r.email?.toLowerCase().includes(s) ||
                    r.eventTitle?.toLowerCase().includes(s) ||
                    r.id?.toLowerCase().includes(s) ||
                    r.senderName?.toLowerCase().includes(s)
                );
            }
            return true;
        });
    }, [reminders, statusFilter, searchTerm]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', paddingBottom: '90px' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Link href="/settings" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'var(--card-bg)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', transition: 'all 0.2s',
                    }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            <Activity size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                            Audit Trail
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Real-time email delivery status
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem',
                    marginBottom: '1rem'
                }}
            >
                {[
                    { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
                    { label: 'Sent', value: stats.sent, color: '#10b981' },
                    { label: 'Failed', value: stats.failed, color: '#ef4444' },
                    { label: 'Pending', value: stats.pending + stats.processing, color: '#3b82f6' },
                ].map((s) => (
                    <div key={s.label} style={{
                        background: 'var(--card-bg)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '0.6rem 0.5rem', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    </div>
                ))}
            </motion.div>

            {/* Search + Filter Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        className="input-field"
                        placeholder="Search email, title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {(['all', 'sent', 'failed', 'pending'] as StatusFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                                textTransform: 'uppercase', border: '1px solid var(--border)', cursor: 'pointer',
                                background: statusFilter === f ? (f === 'all' ? 'var(--primary-color)' : getStatusConfig(f).bg) : 'var(--card-bg)',
                                color: statusFilter === f ? (f === 'all' ? '#fff' : getStatusConfig(f).color) : 'var(--text-secondary)',
                                transition: 'all 0.15s'
                            }}
                        >
                            {f === 'all' ? <><Filter size={12} /> All</> : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reminder Cards */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
                {filtered.length === 0 ? (
                    <div style={{
                        padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)',
                        background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)'
                    }}>
                        <Mail size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <div>No emails found</div>
                    </div>
                ) : (
                    filtered.map(r => {
                        const sc = getStatusConfig(r.status);
                        const timeline = auditByReminder.get(r.id) || [];
                        const isExpanded = expandedId === r.id;

                        return (
                            <motion.div
                                key={r.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    background: 'var(--card-bg)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    borderLeft: `4px solid ${sc.color}`,
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}
                            >
                                {/* Main Card */}
                                <div
                                    style={{ padding: '0.9rem 1rem', cursor: 'pointer' }}
                                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                >
                                    {/* Row 1: Email + Status Badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                            {r.email}
                                        </div>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            padding: '3px 10px', borderRadius: '6px',
                                            background: sc.bg, color: sc.color,
                                            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em'
                                        }}>
                                            {sc.icon} {sc.label}
                                        </span>
                                    </div>

                                    {/* Row 2: Event Title + Time */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {r.eventTitle || 'Untitled'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                            {timeAgo(r.status === 'sent' ? r.sentAt || r.processedAt : r.createdAt)}
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {r.status === 'failed' && r.lastError && (
                                        <div style={{
                                            marginTop: '0.5rem', padding: '0.4rem 0.6rem',
                                            background: 'rgba(239,68,68,0.06)', borderRadius: '6px',
                                            fontSize: '0.78rem', color: '#ef4444'
                                        }}>
                                            {r.lastError}
                                        </div>
                                    )}

                                    {/* Expand Indicator */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.3rem' }}>
                                        {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />}
                                    </div>
                                </div>

                                {/* Expanded Timeline */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{
                                                padding: '0 1rem 1rem',
                                                borderTop: '1px solid var(--border)',
                                            }}>
                                                {/* Key Details */}
                                                <div style={{
                                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem',
                                                    fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.7rem 0'
                                                }}>
                                                    <div><strong>Created:</strong> {formatTime(r.createdAt)}</div>
                                                    <div><strong>Scheduled:</strong> {formatTime(r.scheduledTime)}</div>
                                                    {r.sentAt && <div><strong>Sent:</strong> {formatTime(r.sentAt)}</div>}
                                                    {r.failedAt && <div><strong>Failed:</strong> {formatTime(r.failedAt)}</div>}
                                                    <div><strong>Attempts:</strong> {r.attempts || 0}</div>
                                                    <div><strong>ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>#{r.id.slice(-8)}</span></div>
                                                </div>

                                                {/* Complete Lifecycle Timeline — built from reminder data + audit logs */}
                                                {(() => {
                                                    // Build the definitive timeline from the reminder's own state
                                                    // This guarantees accuracy even when audit log entries are missing
                                                    type TimelineItem = { key: string; action: string; status: string; time: Timestamp | null; durationMs?: number };
                                                    const items: TimelineItem[] = [];

                                                    // Check which actions the audit logs already cover
                                                    const loggedActions = new Set(timeline.map(t => t.action));

                                                    // 1. CREATE — always present
                                                    if (!loggedActions.has('CREATE')) {
                                                        items.push({ key: 'syn-create', action: 'CREATE', status: 'PENDING', time: r.createdAt });
                                                    }

                                                    // Add all actual audit log entries
                                                    for (const entry of timeline) {
                                                        items.push({
                                                            key: entry.id,
                                                            action: entry.action,
                                                            status: entry.status,
                                                            time: entry.timestamp,
                                                            durationMs: entry.durationMs
                                                        });
                                                    }

                                                    // 2. CLAIM/PROCESSING — synthesize if missing but reminder was processed
                                                    if (!loggedActions.has('CLAIM') && (r.status === 'sent' || r.status === 'failed' || r.status === 'processing')) {
                                                        items.push({ key: 'syn-claim', action: 'CLAIM', status: 'PROCESSING', time: r.processedAt ?? r.sentAt ?? r.failedAt ?? null });
                                                    }

                                                    // 3. SEND_SUCCESS — synthesize if missing but reminder is sent
                                                    if (!loggedActions.has('SEND_SUCCESS') && r.status === 'sent') {
                                                        items.push({ key: 'syn-sent', action: 'SEND_SUCCESS', status: 'SENT', time: r.sentAt ?? r.processedAt ?? null });
                                                    }

                                                    // 4. SEND_FAILURE — synthesize if missing but reminder failed
                                                    if (!loggedActions.has('SEND_FAILURE') && r.status === 'failed') {
                                                        items.push({ key: 'syn-fail', action: 'SEND_FAILURE', status: 'FAILED', time: r.failedAt ?? null });
                                                    }

                                                    // Sort by time (oldest first for natural reading)
                                                    items.sort((a, b) => {
                                                        const ta = a.time?.toDate?.()?.getTime() || 0;
                                                        const tb = b.time?.toDate?.()?.getTime() || 0;
                                                        return ta - tb;
                                                    });

                                                    return (
                                                        <>
                                                            <div style={{
                                                                fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
                                                                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem'
                                                            }}>
                                                                Lifecycle
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                                {items.map(item => {
                                                                    const esc = getStatusConfig(item.status);
                                                                    return (
                                                                        <div key={item.key} style={{
                                                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                            padding: '0.35rem 0.5rem',
                                                                            background: 'var(--bg-secondary)',
                                                                            borderRadius: '6px', fontSize: '0.75rem'
                                                                        }}>
                                                                            <span style={{ color: esc.color, display: 'flex', alignItems: 'center' }}>{esc.icon}</span>
                                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: '100px' }}>{item.action}</span>
                                                                            <span style={{ color: esc.color, fontWeight: 600, fontSize: '0.68rem' }}>{item.status}</span>
                                                                            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
                                                                                {formatTime(item.time)}
                                                                            </span>
                                                                            {item.durationMs != null && (
                                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>⏱{item.durationMs}ms</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                )}
            </motion.div>
        </div>
    );
}
