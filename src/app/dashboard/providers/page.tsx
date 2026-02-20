'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmailProvider } from '@/types/engine';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ProviderSandbox } from '@/components/ui/ProviderSandbox';

export default function ProvidersPage() {
    const { user } = useRequireAuth();
    const router = useRouter();
    const [providers, setProviders] = useState<EmailProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [fromName, setFromName] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sandbox State
    const [activeSandboxProvider, setActiveSandboxProvider] = useState<EmailProvider | null>(null);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'emailProviders'));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailProvider));
            setProviders(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'emailProviders'), {
                name,
                fromName: fromName || name,
                serviceId,
                templateId,
                publicKey,
                privateKey,
                monthlyQuota: 200, // Default EmailJS
                priority: providers.length + 1,
                status: 'active',
                createdBy: user?.uid,
                createdAt: serverTimestamp()
            });
            setShowForm(false);
            // Reset
            setName(''); setFromName(''); setServiceId(''); setTemplateId(''); setPublicKey(''); setPrivateKey('');
        } catch (error) {
            console.error("Failed to add provider", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        await updateDoc(doc(db, 'emailProviders', id), {
            status: currentStatus === 'active' ? 'disabled' : 'active'
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this provider?')) {
            await deleteDoc(doc(db, 'emailProviders', id));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-300">
            {/* Active Sandbox Modal Overlay */}
            <ProviderSandbox
                provider={activeSandboxProvider}
                onClose={() => setActiveSandboxProvider(null)}
            />

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 transition-colors">
                    <div>
                        <button onClick={() => router.push('/dashboard')} className="text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 text-sm flex items-center gap-1 transition-colors">
                            &larr; Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1 transition-colors">
                            Provider Matrix
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm transition-colors">Configure email delivery infrastructure</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        {showForm ? 'Cancel' : '+ Add Provider Key'}
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Left Column: Information & Form */}
                    <div className="lg:col-span-1 space-y-6">

                        <AnimatePresence mode="popLayout">
                            {showForm ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-6 overflow-hidden shadow-xl shadow-indigo-500/10 transition-colors"
                                >
                                    <form onSubmit={handleAdd}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight transition-colors">EmailJS Credentials</h2>
                                                    <a href="https://www.emailjs.com/docs/" target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700 font-semibold tracking-wide">Read Docs &rarr;</a>
                                                </div>
                                                <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium transition-colors mt-0.5">GMSS V1 Engine Support</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Alias</label>
                                                <input required placeholder="e.g., Primary Mailer" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all shadow-inner" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">A friendly, internal name to identify this routing key.</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors flex items-center gap-1">
                                                    Sender Name <span className="text-[10px] text-slate-400 normal-case font-normal">(Optional)</span>
                                                </label>
                                                <input placeholder="e.g., GMSS-1 or Gaurav Patil" value={fromName} onChange={e => setFromName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all shadow-inner" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">The name that will appear in the recipient&apos;s inbox.</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Service ID</label>
                                                <input required placeholder="service_xyz" value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all shadow-inner" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">Found in your <a href="https://dashboard.emailjs.com/admin" target="_blank" className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">EmailJS Dashboard &rarr; Email Services</a>.</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Template ID</label>
                                                <input required placeholder="template_abc" value={templateId} onChange={e => setTemplateId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all shadow-inner" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">Found in your <a href="https://dashboard.emailjs.com/admin/templates" target="_blank" className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">EmailJS Dashboard &rarr; Email Templates</a>.</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Public Key</label>
                                                <input required placeholder="Public Account Key" value={publicKey} onChange={e => setPublicKey(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all shadow-inner" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">Found in your <a href="https://dashboard.emailjs.com/admin/account" target="_blank" className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">Account Settings &rarr; API Keys</a>.</p>
                                            </div>
                                            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 transition-colors">
                                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 transition-colors">
                                                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    Private Key
                                                </label>
                                                <input required type="password" placeholder="Extremely Sensitive" value={privateKey} onChange={e => setPrivateKey(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border-amber-300 dark:border-amber-500/30 border rounded-lg px-4 py-2.5 text-amber-700 dark:text-amber-500 placeholder-slate-400 dark:placeholder-slate-600 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition-all shadow-inner" />
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">Also found in <a href="https://dashboard.emailjs.com/admin/account" target="_blank" className="text-amber-600 hover:text-amber-700 dark:hover:text-amber-500 hover:underline">Account Settings &rarr; API Keys</a>. Keep this secret!</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex gap-3">
                                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg text-sm font-medium transition-colors">
                                                Cancel
                                            </button>
                                            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                                {isSubmitting ? 'Registering...' : 'Save Keys'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-lg dark:shadow-none"
                                >
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 transition-colors">Supported Market Engines</h2>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer" onClick={() => setShowForm(true)}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-indigo-700 dark:text-indigo-400 transition-colors">EmailJS</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-colors">V1 Native</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">Supported natively in V1. Free tier supports 200 emails/month. Highly recommended for GMSS.</p>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 opacity-60 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-slate-700 dark:text-slate-300 transition-colors">SendGrid</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">API Coming Soon</span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-500 transition-colors">Industry standard bulk mailer. V1 engine supports the interface conceptually, API wrapper pending.</p>
                                        </div>

                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 opacity-60 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-slate-700 dark:text-slate-300 transition-colors">AWS SES</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">API Coming Soon</span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-500 transition-colors">Enterprise grade routing. High volume capability. Pending API implementation.</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 transition-colors">
                                        <div className="flex items-start gap-3 mb-4">
                                            <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                                                <strong className="text-slate-900 dark:text-slate-300 transition-colors">Smart Sender Info:</strong> GMSS V1 uses an intelligent routing engine. Ensure you configure at least one active provider (EmailJS). If one provider exhausts its quota, the GMSS engine instantly rolls over to the next active provider in your pool during an event dispatch sequence.
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Required Template Layout</h4>
                                            <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">To ensure <strong className="text-indigo-500">fully dynamic rendering</strong>, copy the exact HTML code below into your EmailJS template. <strong>Do not write hardcoded static words</strong>. GMSS passes all content natively.</p>
                                            <div className="bg-slate-800 text-slate-300 text-[10px] p-3 rounded-lg overflow-x-auto font-mono whitespace-pre">
                                                {`<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
    <h2 style="color: #4f46e5;">{{subject}}</h2>
    <p>Hi {{to_name}},</p>
    <div style="white-space: pre-wrap; color: #334155; line-height: 1.6;">{{message}}</div>
    <br/>
    <hr style="border: none; border-top: 1px solid #e2e8f0;"/>
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">
        Securely routed by {{from_name}}<br/>GMSS Enterprise Engine
    </p>
</div>`}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>


                    {/* Right Column: Active Keys Grid */}
                    <div className="lg:col-span-2">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 animate-pulse transition-colors" />)}
                            </div>
                        ) : providers.length === 0 ? (
                            <div className="h-[400px] border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-950/50 transition-colors">
                                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-900 text-slate-500 dark:text-slate-700 rounded-full flex items-center justify-center mb-4 transition-colors">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-slate-800 dark:text-slate-300 font-semibold mb-2 text-lg transition-colors">No Active Providers</h3>
                                <p className="text-slate-500 text-sm max-w-sm mb-6 transition-colors">
                                    The Smart Sender framework is currently offline. You must configure an email provider in the left panel to begin sending invitations and event alerts.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {providers.map(p => (
                                    <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-lg dark:shadow-none">
                                        <div className="absolute top-6 right-6 flex gap-2">
                                            <button onClick={() => toggleStatus(p.id, p.status)} className={`w-2.5 h-2.5 rounded-full transition-colors ${p.status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-400 dark:bg-slate-600'}`} title={p.status} />
                                        </div>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight transition-colors">{p.name}</h3>
                                                <div className="text-[10px] text-slate-500 font-mono tracking-wider transition-colors">{p.serviceId} {p.fromName ? ` • Sends as: ${p.fromName}` : ''}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/50 transition-colors">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 dark:text-slate-400 font-medium transition-colors">Engine Route</span>
                                                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-300 dark:border-slate-700 transition-colors">P{p.priority}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 dark:text-slate-400 font-medium transition-colors">Monthly Quota</span>
                                                <span className="text-slate-800 dark:text-slate-300 font-medium transition-colors">{p.monthlyQuota || (p as EmailProvider & { dailyQuota?: number }).dailyQuota || 200} limits</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 dark:text-slate-400 font-medium transition-colors">Status</span>
                                                <span className={`font-bold transition-colors ${p.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>{p.status.toUpperCase()}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 justify-end items-center pt-4 border-t border-slate-200 dark:border-slate-800 transition-colors">
                                            <button
                                                onClick={() => setActiveSandboxProvider(p)}
                                                disabled={p.status !== 'active'}
                                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors border border-indigo-200 dark:border-indigo-500/20 disabled:opacity-50"
                                            >
                                                Test Sandbox
                                            </button>
                                            <button onClick={() => toggleStatus(p.id, p.status)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                {p.status === 'active' ? 'Hold' : 'Enable'}
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-red-500/20">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
