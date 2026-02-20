'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function DashboardPage() {
    const { user, logout } = useRequireAuth();
    const router = useRouter();

    const [stats, setStats] = useState({ activeEvents: 0, totalParticipants: 0 });
    interface DashboardEvent {
        id: string;
        title: string;
        description: string;
        status: string;
        participantCount: number;
        inviteCount: number;
        location: string;
        startTime: { toDate: () => Date };
    }
    const [events, setEvents] = useState<DashboardEvent[]>([]);
    const [providersCount, setProvidersCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // 1. Fetch Events
        const eventsQ = query(
            collection(db, 'events'),
            where('status', '==', 'active'),
            orderBy('startTime', 'asc')
        );

        const unsubEvents = onSnapshot(eventsQ, (snap) => {
            let active = 0;
            let participants = 0;
            const data = snap.docs.map(doc => {
                const d = doc.data();
                active++;
                participants += d.participantCount || 0;
                return { id: doc.id, ...d } as DashboardEvent;
            });
            setEvents(data);
            setStats({ activeEvents: active, totalParticipants: participants });
            setLoading(false);
        });

        // 2. Fetch Active Providers Context
        const provQ = query(collection(db, 'emailProviders'), where('status', '==', 'active'));
        const unsubProv = onSnapshot(provQ, (snap) => {
            setProvidersCount(snap.docs.length);
        });

        return () => { unsubEvents(); unsubProv(); };
    }, [user]);

    const handleExecuteEvent = async (eventId: string) => {
        if (!confirm('Manually trigger Event End process? (Normally handled by cron)')) return;
        try {
            const res = await fetch('/api/event/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, secretKey: process.env.NEXT_PUBLIC_DEV_BYPASS || '' })
            });
            const data = await res.json();
            if (!res.ok) alert(data.error);
            else alert(`Successfully dispatched ${data.results.filter((r: { success: boolean }) => r.success).length} emails.`);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred';
            alert(message);
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
                                GMSS <span className="text-indigo-600 dark:text-indigo-400">V1</span>
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors">Admin Layer</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Authenticated as: <span className="text-slate-700 dark:text-slate-300">{user?.email}</span></p>
                    </div>
                    <div className="flex gap-3">
                        <ThemeToggle />
                        <button
                            onClick={() => router.push('/dashboard/events/create')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            + Schedule Event
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/settings')}
                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors hidden md:block"
                        >
                            Settings & Logs
                        </button>
                        <button
                            onClick={logout}
                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </header>

                {/* System Diagnostics */}
                {providersCount === 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 flex items-start gap-4 shadow-sm transition-colors">
                        <div className="mt-1 w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-700 dark:text-red-400 font-semibold mb-1 transition-colors">Critical Failure: Provider Engine Offline</h3>
                            <p className="text-red-600 dark:text-red-400/80 text-sm mb-3 transition-colors">No active email providers detected. Smart Sender is disabled and events cannot be created.</p>
                            <button onClick={() => router.push('/dashboard/providers')} className="text-xs font-semibold px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-lg transition-colors border border-red-200 dark:border-red-500/30">
                                Resolve in Provider Settings &rarr;
                            </button>
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stat Cards */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden group transition-colors">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 relative z-10 transition-colors">Active Sequences</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white relative z-10 transition-colors">{stats.activeEvents}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden group transition-colors">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 relative z-10 transition-colors">Total Enrolled Participants</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white relative z-10 transition-colors">{stats.totalParticipants}</p>
                    </div>

                    <div onClick={() => router.push('/dashboard/providers')} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/50 cursor-pointer transition-colors block">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-16 h-16 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 relative z-10 transition-colors">Smart Sender Providers</h3>
                        <div className="flex items-end gap-3 relative z-10">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{providersCount !== null ? providersCount : '-'}</p>
                            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1 transition-colors">Active</span>
                        </div>
                        <div className="absolute bottom-6 right-6 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                    </div>
                </div>

                {/* Events Feed */}
                <div className="pt-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 transition-colors">Execution Pipeline</h2>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-900/50 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-colors">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500 transition-colors">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 transition-colors">No active events in the pipeline.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {events.map(ev => (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={ev.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-6 hover:shadow-md dark:hover:border-slate-700 transition-all">

                                    {/* Date Block */}
                                    {ev.startTime && (
                                        <div className="hidden md:flex flex-col items-center justify-center w-20 shrink-0 border-r border-slate-200 dark:border-slate-800 pr-6 transition-colors">
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 transition-colors">
                                                {new Date(ev.startTime.toDate()).toLocaleString('default', { month: 'short' })}
                                            </span>
                                            <span className="text-2xl text-slate-900 dark:text-white font-bold leading-none transition-colors">
                                                {new Date(ev.startTime.toDate()).getDate()}
                                            </span>
                                            <span className="text-xs text-slate-500 mt-2 font-medium transition-colors">
                                                {new Date(ev.startTime.toDate()).toLocaleString('default', { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )}

                                    {/* Info Block */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">{ev.title}</h3>
                                            <span className="shrink-0 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] uppercase font-bold tracking-wider rounded border border-emerald-200 dark:border-emerald-500/20 transition-colors">Active</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 transition-colors">{ev.description || 'No description provided.'}</p>

                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                            <div className="flex items-center gap-1.5 transition-colors">
                                                <svg className="w-4 h-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                <span className="text-slate-700 dark:text-slate-300 transition-colors">{ev.participantCount}</span> <span className="hidden sm:inline">Accepted</span> ({ev.inviteCount} <span className="hidden sm:inline">Invited</span>)
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 transition-colors" />
                                            <div className="flex items-center gap-1.5 transition-colors">
                                                <svg className="w-4 h-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px] transition-colors">{ev.location || 'Online'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Block */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <div className="flex items-center w-full md:w-auto md:border-l border-slate-200 dark:border-slate-800 md:pl-6 pt-4 md:pt-0 mt-4 md:mt-0 border-t transition-colors">
                                            <button
                                                onClick={() => handleExecuteEvent(ev.id)}
                                                className="w-full md:w-auto px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border border-indigo-200 dark:border-indigo-500/20"
                                            >
                                                Force Execute End
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
