'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';

export default function CreateEventPage() {
    useRequireAuth();
    const router = useRouter();
    const [providersCount, setProvidersCount] = useState<number | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [inviteEmails, setInviteEmails] = useState<string[]>([]);
    const [currentEmail, setCurrentEmail] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Enforce Provider Rule: Must have at least one active provider
        const q = query(collection(db, 'emailProviders'), where('status', '==', 'active'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setProvidersCount(snap.docs.length);
        });
        return () => unsubscribe();
    }, []);

    const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
        if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();

        const email = currentEmail.trim().toLowerCase();
        if (email && email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) && !inviteEmails.includes(email)) {
            setInviteEmails([...inviteEmails, email]);
        }
        setCurrentEmail('');
    };

    const removeEmail = (emailToRemove: string) => {
        setInviteEmails(inviteEmails.filter(e => e !== emailToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (providersCount === 0) {
            setError("Cannot create event: No active email providers configured.");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/event/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    location,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString(),
                    inviteEmails
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create event');

            router.push('/dashboard');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (providersCount === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 flex items-center justify-center transition-colors duration-300">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-8 text-center max-w-md w-full transition-colors">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-amber-900 dark:text-white mb-2 transition-colors">Provider Warning</h2>
                    <p className="text-amber-700/80 dark:text-slate-400 mb-8 transition-colors">
                        You cannot create events requiring email dispatches because there are zero active providers registered.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/providers')}
                        className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors border border-amber-700/50"
                    >
                        Configure Providers
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full mt-3 px-4 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-medium transition-colors border border-slate-300 dark:border-slate-700"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-300">
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="pb-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
                    <button onClick={() => router.push('/dashboard')} className="text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4 text-sm flex items-center gap-1 transition-colors">
                        &larr; Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1 transition-colors">
                        Schedule Event
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Configure event details and dispatch intelligent invitations</p>
                </header>

                <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl dark:shadow-none transition-colors"
                    onSubmit={handleSubmit}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Event Title</label>
                            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="E.g., Q3 Strategy Review" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Start Time</label>
                            <input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">End Time</label>
                            <input required type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Location</label>
                            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="Google Meet Link or Physical Address" />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none" placeholder="Provide context or an agenda for the participants..." />
                        </div>

                        {/* Relational Invite Module */}
                        <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-200 dark:border-slate-800 transition-colors">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2 transition-colors">Participant Matrix <span className="text-slate-500 font-normal">(Invites will be dispatched instantly)</span></label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {inviteEmails.map(email => (
                                        <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-sm transition-colors">
                                            {email}
                                            <button type="button" onClick={() => removeEmail(email)} className="hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors">&times;</button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="email"
                                    value={currentEmail}
                                    onChange={(e) => setCurrentEmail(e.target.value)}
                                    onKeyDown={handleAddEmail}
                                    onBlur={handleAddEmail}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Type email and press Enter or Comma..."
                                />
                            </div>
                        </div>

                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-500 text-sm transition-colors">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || providersCount === null}
                            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Dispatching Sequence...</span>
                                </>
                            ) : (
                                <span>Initialize Event &amp; Dispatch</span>
                            )}
                        </button>
                    </div>
                </motion.form>
            </div>
        </div>
    );
}
