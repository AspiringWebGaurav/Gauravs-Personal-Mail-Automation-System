'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthStore } from '@/store/authStore';
import { Activity, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Server, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { MailAuditLog } from '@/services/auditService';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

// Styles for the Tracker UI
const trackerStyles = `
.container { padding: 100px 1rem 100px 1rem; max-width: var(--max-width); margin: 0 auto; min-height: 100vh; }
.header { margin-bottom: 2rem; }
.title { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem; }
.log-list { display: flex; flex-direction: column; gap: 0.75rem; }
.log-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden; }
.log-summary { padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s; }
.log-summary:hover { background: var(--bg-tertiary); }
.log-main { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0; }
.log-title { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.log-meta { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-tertiary); }
.status-badge { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; font-family: var(--font-mono); letter-spacing: 0.05em; }
.status-PENDING { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
.status-PROCESSING { background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2); }
.status-SENT { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.status-FAILED { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.log-details { padding: 1.25rem; background: var(--bg-tertiary); border-top: 1px solid var(--border-subtle); font-size: 0.85rem; color: var(--text-secondary); display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
.detail-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); font-weight: 600; }
.detail-value { font-family: var(--font-mono); color: var(--text-primary); word-break: break-all; }
.empty-state { padding: 4rem 2rem; text-align: center; color: var(--text-tertiary); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
`;

function getStatusIcon(status: string) {
    if (status === 'PENDING' || status === 'PROCESSING') return <Clock size={14} className={status === 'PROCESSING' ? 'animate-spin' : ''} />;
    if (status === 'SENT') return <CheckCircle2 size={14} />;
    if (status === 'FAILED') return <XCircle size={14} />;
    return <Activity size={14} />;
}

export default function TrackerPage() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <TrackerContent />
            </AppShell>
        </AuthGuard>
    );
}

function TrackerContent() {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState<MailAuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const _t = setTimeout(() => setLoading(true), 0);

        const q = query(
            collection(db, 'mailAuditLogs'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MailAuditLog));
            setLogs(data);
            clearTimeout(_t);
            setLoading(false);
        }, (error) => {
            console.error('Failed to string audit logs:', error);
            clearTimeout(_t);
            setLoading(false);
        });

        return () => { clearTimeout(_t); unsub(); };
    }, [user]);

    const toggleExpand = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const formatDate = (ts: unknown) => {
        if (!ts) return 'Unknown';
        const t = ts as { toDate?: () => Date };
        const date = t.toDate && typeof t.toDate === 'function' ? t.toDate() : new Date(ts as string | number);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'
        }).format(date);
    };

    return (
        <>
            <style>{trackerStyles}</style>
            <div className="container">
                <motion.div className="header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                            <ArrowLeft size={18} />
                        </Link>
                        <h1 className="title" style={{ margin: 0 }}>Transaction Tracker</h1>
                    </div>
                    <p className="subtitle">Real-time mail execution logs and delivery status.</p>
                </motion.div>

                {loading ? (
                    <GlobalLoader variant="inline" />
                ) : logs.length === 0 ? (
                    <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Search size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
                        <p>No transaction logs found.</p>
                    </motion.div>
                ) : (
                    <div className="log-list">
                        {logs.map((log, i) => {
                            const isExpanded = expandedLogId === log.id;
                            // Map generic status to UI classes
                            let displayStatus = log.status || 'PENDING';
                            if (displayStatus === 'SIMULATION_ON' || displayStatus === 'SIMULATION_OFF') displayStatus = 'PROCESSING';

                            return (
                                <motion.div
                                    key={log.id}
                                    className="log-card"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <div className="log-summary" onClick={() => log.id && toggleExpand(log.id)}>
                                        <div className="log-main">
                                            <div>
                                                <div className="log-title">{log.action}: {log.eventTitle || log.recipientEmail || 'System Event'}</div>
                                                <div className="log-meta">
                                                    <span>{formatDate(log.timestamp)}</span>
                                                    {log.provider && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Server size={12} /> {log.provider}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span className={`status-badge status-${displayStatus}`}>
                                                {getStatusIcon(displayStatus)}
                                                {displayStatus}
                                            </span>
                                            {isExpanded ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                className="log-details"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="detail-item">
                                                    <span className="detail-label">Recipient Name</span>
                                                    <span className="detail-value">{log.recipientName || 'N/A'}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Recipient Email</span>
                                                    <span className="detail-value">{log.recipientEmail || 'N/A'}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Template ID</span>
                                                    <span className="detail-value">{log.templateId || 'N/A'}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Idempotency Key</span>
                                                    <span className="detail-value">{log.idempotencyKey || 'N/A'}</span>
                                                </div>
                                                {log.errorMessage && (
                                                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                                        <span className="detail-label" style={{ color: '#ef4444' }}>Error Message</span>
                                                        <span className="detail-value" style={{ color: '#ef4444' }}>{log.errorMessage}</span>
                                                    </div>
                                                )}
                                                {log.durationMs !== undefined && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Execution Time</span>
                                                        <span className="detail-value">{log.durationMs} ms</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
