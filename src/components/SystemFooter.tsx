"use client";

import { useState } from "react";
import { X, Server, Activity, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SystemFooter() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ position: 'fixed', maxWidth: '480px', width: '100%', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, padding: '1rem', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="glass-heavy"
                        style={{ width: '100%', pointerEvents: 'auto', borderRadius: '1.5rem', padding: '1.5rem', boxShadow: 'var(--shadow-xl)', marginBottom: '1rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                <Activity style={{ width: '18px', height: '18px', color: 'var(--accent-success)' }} />
                                System Diagnostics
                            </h3>
                            <button onClick={() => setIsOpen(false)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'var(--text-tertiary)', background: 'transparent', transition: 'color 0.2s' }}>
                                <X style={{ width: '16px', height: '16px' }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.375rem' }}>Architecture</p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', background: 'var(--bg-card)', padding: '0.625rem', borderRadius: '0.75rem', border: '1px solid var(--border-subtle)' }}>GPMAS V1 / Next.js 15 Edge</p>
                            </div>

                            <div>
                                <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.375rem' }}>Engine Core</p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.625rem', borderRadius: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                                    <Shield style={{ width: '14px', height: '14px', color: 'var(--accent-info)' }} />
                                    Strict Atomic Locks + Queue
                                </p>
                            </div>

                            <div style={{ paddingTop: '0.25rem' }}>
                                <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>Service Pool</p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', background: 'rgba(0,214,143,0.1)', color: 'var(--accent-success)', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', border: '1px solid rgba(0,214,143,0.2)', boxShadow: '0 0 12px rgba(0,214,143,0.15)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-success)', animation: 'pulse 1.5s infinite' }}></span>
                                        EmailJS Active
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', pointerEvents: 'auto', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', transition: 'all 0.2s', cursor: 'pointer' }}
            >
                <Server style={{ width: '14px', height: '14px', color: 'var(--text-accent)' }} />
                Syslog
            </button>
        </div>
    );
}
