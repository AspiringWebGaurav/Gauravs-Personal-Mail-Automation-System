'use client';

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SentLog } from '@/types/engine';

export default function SettingsPage() {
    const { user } = useRequireAuth();
    const router = useRouter();

    const [logs, setLogs] = useState<SentLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterMode, setFilterMode] = useState<'all' | 'live' | 'sandbox'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'switched' | 'blocked'>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'sentLogs'),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SentLog[];
            setLogs(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredLogs = logs.filter(log => {
        if (filterMode !== 'all' && log.mode !== filterMode) return false;
        if (filterStatus !== 'all' && log.status !== filterStatus) return false;
        return true;
    });

    const getStatusStyle = (status: SentLog['status']) => {
        switch (status) {
            case 'success': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
            case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20';
            case 'blocked': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
            case 'switched': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
            case 'retried': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Sequence */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800 transition-colors">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
                                Settings & Logs <span className="text-indigo-600 dark:text-indigo-400">V2</span>
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors">Tracker</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Observability layer for GMSS engine dispatches.</p>
                    </div>
                    <div className="flex gap-3">
                        <ThemeToggle />
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            &larr; Back to Dashboard
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">

                    {/* Controls Bar */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
                        <div className="flex flex-wrap gap-4 items-center">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider transition-colors mr-2">Sent Tracker</h2>

                            <select
                                value={filterMode}
                                onChange={(e) => setFilterMode(e.target.value as 'all' | 'live' | 'sandbox')}
                                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 transition-colors"
                            >
                                <option value="all">All Modes</option>
                                <option value="live">Live Events</option>
                                <option value="sandbox">Sandbox Test</option>
                            </select>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'success' | 'failed' | 'switched' | 'blocked')}
                                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 transition-colors"
                            >
                                <option value="all">All Statuses</option>
                                <option value="success">Success</option>
                                <option value="failed">Failed</option>
                                <option value="switched">Switched</option>
                                <option value="blocked">Blocked</option>
                            </select>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Showing {filteredLogs.length} logs
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 transition-colors">
                                    <th className="p-4 font-semibold">Timestamp</th>
                                    <th className="p-4 font-semibold">Recipient</th>
                                    <th className="p-4 font-semibold">Provider</th>
                                    <th className="p-4 font-semibold">Mode</th>
                                    <th className="p-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            <div className="animate-pulse space-y-4 max-w-lg mx-auto">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/6"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 transition-colors">
                                            No logs found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <React.Fragment key={log.id}>
                                            <tr
                                                onClick={() => setExpandedRow(expandedRow === log.id ? null : (log.id as string))}
                                                className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50 ${expandedRow === log.id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                            >
                                                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap transition-colors">
                                                    {new Date(log.timestamp).toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    })}
                                                </td>
                                                <td className="p-4 text-sm font-medium text-slate-900 dark:text-white transition-colors">
                                                    {log.recipient.email}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                                                    {log.providerName || '-'}
                                                </td>
                                                <td className="p-4">
                                                    {log.mode === 'sandbox' ? (
                                                        <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">Sandbox</span>
                                                    ) : (
                                                        <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">Live</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border transition-colors inline-flex items-center gap-1 ${getStatusStyle(log.status)}`}>
                                                        {log.status}
                                                        {(log.status === 'failed' || log.status === 'switched') && (
                                                            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Expanded Row Diagnostics */}
                                            <AnimatePresence>
                                                {expandedRow === log.id && (
                                                    <motion.tr
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
                                                    >
                                                        <td colSpan={5} className="p-0">
                                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div>
                                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Diagnostic Context</h4>
                                                                    <dl className="space-y-2 text-sm">
                                                                        <div className="flex">
                                                                            <dt className="w-32 text-slate-500 dark:text-slate-400">Log ID:</dt>
                                                                            <dd className="font-mono text-slate-900 dark:text-slate-300">{log.id}</dd>
                                                                        </div>
                                                                        {log.eventReference && (
                                                                            <div className="flex">
                                                                                <dt className="w-32 text-slate-500 dark:text-slate-400">Trigger Event:</dt>
                                                                                <dd className="text-slate-900 dark:text-slate-300 font-medium">{log.eventReference.name}</dd>
                                                                            </div>
                                                                        )}
                                                                        {log.providerId && (
                                                                            <div className="flex">
                                                                                <dt className="w-32 text-slate-500 dark:text-slate-400">Provider Key ID:</dt>
                                                                                <dd className="font-mono text-slate-900 dark:text-slate-300">{log.providerId}</dd>
                                                                            </div>
                                                                        )}
                                                                        {(log.dispatchLatencyMs !== undefined) && (
                                                                            <div className="flex">
                                                                                <dt className="w-32 text-slate-500 dark:text-slate-400">Execution Latency:</dt>
                                                                                <dd className="text-slate-900 dark:text-slate-300">{log.dispatchLatencyMs} ms</dd>
                                                                            </div>
                                                                        )}
                                                                    </dl>
                                                                </div>

                                                                {log.errorPayload && (
                                                                    <div>
                                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 mb-3">Failure Trace Payload</h4>
                                                                        <div className="bg-slate-900 dark:bg-black rounded-lg p-3 overflow-x-auto shadow-inner border border-slate-800">
                                                                            <code className="text-rose-400 text-xs font-mono whitespace-pre-wrap">
                                                                                {log.errorPayload}
                                                                            </code>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
