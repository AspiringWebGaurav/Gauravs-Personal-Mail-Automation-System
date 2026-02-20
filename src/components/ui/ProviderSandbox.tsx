'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmailProvider } from '@/types/engine';
import { auth } from '@/lib/firebase';

interface ProviderSandboxProps {
    provider: EmailProvider | null;
    onClose: () => void;
}

export function ProviderSandbox({ provider, onClose }: ProviderSandboxProps) {
    const [testEmail, setTestEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Wipes all data securely when closing the Sandbox route
    const handleClose = () => {
        setTestEmail('');
        setIsSending(false);
        setResult('idle');
        setErrorMessage('');
        onClose();
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!provider || !testEmail) return;

        setIsSending(true);
        setResult('idle');

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/provider/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ providerId: provider.id, testEmail })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Server rejected routing test');

            setResult('success');
        } catch (e: unknown) {
            setResult('error');
            setErrorMessage(e instanceof Error ? e.message : 'Unknown testing error');
        } finally {
            setIsSending(false);
        }
    };

    // Simulated Inbox Timestamp
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <AnimatePresence>
            {provider && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 20 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md"
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                        {/* Header Area */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Provider Sandbox</h2>
                                    <p className="text-xs text-slate-500 font-mono tracking-wide">Testing Route: {provider.name}</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            {/* Left Side: Diagnostics Form */}
                            <div className="w-full md:w-1/3 p-6 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
                                <form onSubmit={handleSend} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Test Recipient Email</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="Enter your inbox email..."
                                            value={testEmail}
                                            onChange={(e) => setTestEmail(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-shadow shadow-sm"
                                        />
                                    </div>

                                    <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/5">
                                        <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-2 uppercase tracking-wider">Engine Payload Info</h4>
                                        <div className="space-y-1 text-xs text-indigo-600/80 dark:text-indigo-400">
                                            <p><strong className="dark:text-indigo-300">From Name:</strong> {provider.fromName || 'GMSS Engine Sandbox'}</p>
                                            <p><strong className="dark:text-indigo-300">Subject:</strong> Sandbox Diagnostics...</p>
                                            <p><strong className="dark:text-indigo-300">Template ID:</strong> {provider.templateId}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSending || !testEmail}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                                    >
                                        {isSending ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Dispatching Payload...
                                            </>
                                        ) : 'Inject Test Payload'}
                                    </button>

                                    {result === 'success' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm text-center font-medium">
                                            ✅ Sandbox delivery successful. Check your inbox!
                                        </motion.div>
                                    )}

                                    {result === 'error' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm font-medium">
                                            ❌ Delivery Failed: {errorMessage}
                                        </motion.div>
                                    )}
                                </form>
                            </div>

                            {/* Right Side: Visual Sandbox / Inbox Simulator */}
                            <div className="w-full md:w-2/3 bg-white dark:bg-slate-950 p-0 overflow-y-auto flex flex-col">
                                {/* Simulated Email Client Top Bar */}
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                        {(provider.fromName || 'G')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-slate-900 dark:text-white">{provider.fromName || 'GMSS Engine Sandbox'}</h3>
                                            <span className="text-xs text-slate-400">{timeString}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                            To: {testEmail || 'recipient@domain.com'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                        Sandbox Diagnostics: Routing Test Successful
                                    </h2>

                                    {/* The exact HTML preview representing what EmailJS renders */}
                                    <div className="w-full max-w-[600px] border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-white mx-auto shadow-sm">
                                        <div style={{ fontFamily: 'sans-serif', margin: 'auto' }}>
                                            <h2 style={{ color: '#4f46e5', marginTop: 0 }}>Sandbox Diagnostics: Routing Test Successful</h2>
                                            <p style={{ color: '#334155' }}>Hi GMSS Administrator,</p>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.6' }}>
                                                {`This is an automated sandbox verification dispatch from GMSS V1.\n\nProvider Alias: ${provider.name}\nService ID: ${provider.serviceId}\nTimestamp: ${now.toISOString()}\n\nIf you are reading this, your fully dynamic EmailJS template is working perfectly without any hardcoded static text!`}
                                            </div>
                                            <br />
                                            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />
                                            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginBottom: 0 }}>
                                                Securely routed by {provider.fromName || 'GMSS Engine Sandbox'}<br />GMSS Enterprise Engine
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
                                        Previewing internal dynamic payload layout • Template visually rendered via frontend simulation
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
