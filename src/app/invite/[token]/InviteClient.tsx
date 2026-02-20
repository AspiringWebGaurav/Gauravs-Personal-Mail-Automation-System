'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function InviteClient({
    token,
    uiState: initialState,
    eventTitle,
    inviterName,
    inviteeEmail,
    startTime,
    location
}: {
    token: string;
    uiState: 'valid' | 'accepted' | 'expired' | 'event_ended';
    eventTitle: string;
    inviterName: string;
    inviteeEmail: string;
    startTime: string | null;
    location: string | undefined;
}) {
    const [status, setStatus] = useState(initialState);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState('');

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const res = await fetch('/api/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to process request');

            if (data.status === 'success' || data.status === 'already_accepted') {
                setStatus('accepted');
            } else if (data.status === 'expired') {
                setStatus('expired');
            } else {
                throw new Error('Verification failed.');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden"
            >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-full h-1 ${status === 'valid' ? 'bg-indigo-500' : status === 'accepted' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                <div className="text-center mb-8">
                    <p className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">
                        Secure Invitation Hub
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {eventTitle}
                    </h1>
                    {status === 'valid' && (
                        <p className="text-slate-400">
                            <span className="text-white font-medium">{inviterName}</span> has invited you to participate.
                        </p>
                    )}
                </div>

                {status === 'valid' && (
                    <div className="space-y-6">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                            <div>
                                <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Invitee Profile</span>
                                <span className="text-sm text-white font-medium">{inviteeEmail}</span>
                            </div>
                            {startTime && (
                                <div>
                                    <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Scheduled For</span>
                                    <span className="text-sm text-indigo-300 font-medium">
                                        {new Date(startTime).toLocaleString(undefined, {
                                            dateStyle: 'full', timeStyle: 'short'
                                        })}
                                    </span>
                                </div>
                            )}
                            {location && (
                                <div>
                                    <span className="block text-xs uppercase text-slate-500 font-semibold mb-1">Location / Join Link</span>
                                    <span className="text-sm text-white font-medium">{location}</span>
                                </div>
                            )}
                        </div>

                        {error && <div className="text-red-400 text-sm text-center font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

                        <button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-4 font-bold text-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isAccepting ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Confirming Identity...</span>
                                </div>
                            ) : (
                                <span>Accept Invitation</span>
                            )}
                        </button>
                    </div>
                )}

                {status === 'accepted' && (
                    <div className="text-center space-y-4 py-6">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Participation Confirmed</h2>
                        <p className="text-slate-400">
                            Your slot for <span className="text-white">{eventTitle}</span> has been securely locked. You will receive system notifications as needed.
                        </p>
                    </div>
                )}

                {status === 'expired' && (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Token Expired</h2>
                        <p className="text-slate-400">
                            This invitation link has exceeded the 10-hour security TTL. Please request a new invite from the organizer.
                        </p>
                    </div>
                )}
                {status === 'event_ended' && (
                    <div className="text-center space-y-4 py-4">
                        <h2 className="text-xl font-bold text-white">Event Concluded</h2>
                        <p className="text-slate-400">
                            This event has already ended. Invitations are no longer valid.
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
