'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

/**
 * Zero-state onboarding banner.
 * Shown when no email providers are configured.
 * Professional, enterprise-grade, non-alarming.
 */
export function ProviderSetupBanner() {
    const [providerCount, setProviderCount] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'emailProviders'), (snap) => {
            setProviderCount(snap.size);
        });
        return unsub;
    }, []);

    // Still loading or providers exist → don't show
    if (providerCount === null || providerCount > 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '16px',
                padding: '28px 24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Subtle glow */}
            <div style={{
                position: 'absolute', top: '-50%', right: '-20%',
                width: '200px', height: '200px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '8px',
                }}>
                    <span style={{ fontSize: '20px' }}>📧</span>
                    <h3 style={{
                        margin: 0, fontSize: '16px', fontWeight: 600,
                        color: 'var(--text-primary, #fff)',
                        letterSpacing: '-0.01em',
                    }}>
                        Email Provider Required
                    </h3>
                </div>

                <p style={{
                    margin: '0 0 16px', fontSize: '13px', lineHeight: 1.5,
                    color: 'var(--text-secondary, rgba(255,255,255,0.6))',
                }}>
                    Add at least one email provider to activate mail automation.
                    Scheduling, invites, and dispatch will be enabled once configured.
                </p>

                <button
                    onClick={() => router.push('/settings')}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        letterSpacing: '0.01em',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    Add Provider →
                </button>
            </div>
        </motion.div>
    );
}

/**
 * Clean empty-state card for when system is ready but no events exist yet.
 * Shows after providers are configured.
 */
export function ZeroStateCard() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '40px 24px',
                textAlign: 'center',
            }}
        >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
            <h3 style={{
                margin: '0 0 8px', fontSize: '15px', fontWeight: 600,
                color: 'var(--text-primary, #fff)',
            }}>
                GPMAS is ready
            </h3>
            <p style={{
                margin: 0, fontSize: '13px',
                color: 'var(--text-secondary, rgba(255,255,255,0.5))',
            }}>
                Connect your first provider to begin.
            </p>
        </motion.div>
    );
}
