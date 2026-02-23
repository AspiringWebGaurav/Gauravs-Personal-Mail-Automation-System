'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { subscribeProviders } from '@/services/providerService';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CalendarPlus, Mail, Zap, Users, AlertOctagon } from 'lucide-react';
import type { EmailProvider } from '@/types';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

export default function HomePage() {
    const { user } = useAuthStore();
    const [providers, setProviders] = useState<EmailProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeProviders(user.uid, (data) => {
            setProviders(data);
            setLoadingProviders(false);
        });
        return () => unsub();
    }, [user]);

    const hasProviders = providers.length > 0;

    if (loadingProviders) {
        return <GlobalLoader variant="overlay" />;
    }

    return (
        <div className="page-container" style={{ paddingBottom: '100px' }}>
            {/* Top Navigation / Header */}
            <motion.div
                className="page-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ marginBottom: '2rem' }}
            >
                <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Operations</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Create, schedule, and dispatch intelligent emails.
                </p>
            </motion.div>

            {/* Zero Provider State */}
            {!hasProviders && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'flex-start'
                    }}
                >
                    <AlertOctagon color="#ef4444" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.05rem', fontWeight: 600 }}>Email Provider Required</h3>
                        <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            Add a provider to activate automation. The transaction engine is locked until an active email provider is connected.
                        </p>
                        <Link href="/providers">
                            <span style={{
                                display: 'inline-block',
                                background: '#ef4444',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 500
                            }}>
                                Connect Provider
                            </span>
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Operations Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <ActionCard
                    href="/create?type=event"
                    icon={<CalendarPlus size={24} />}
                    title="Create Event"
                    desc="Schedule an event with automated reminders and invites."
                    color="#6c5ce7"
                    disabled={!hasProviders}
                />
                <ActionCard
                    href="/create?type=mail"
                    icon={<Mail size={24} />}
                    title="Send Mail"
                    desc="Compose a standard email with precise scheduling logic."
                    color="#00d2ff"
                    disabled={!hasProviders}
                />
                <ActionCard
                    href="/create?type=priority"
                    icon={<Zap size={24} />}
                    title="Priority Mail"
                    desc="Bypass standard queue for urgent transactional delivery."
                    color="#ff4757"
                    disabled={!hasProviders}
                />
                <ActionCard
                    href="/create?type=custom"
                    icon={<Users size={24} />}
                    title="Custom Invite"
                    desc="Mass custom send wrapper for specific participant lists."
                    color="#fdcb6e"
                    disabled={!hasProviders}
                />
            </div>
        </div>
    );
}

function ActionCard({ href, icon, title, desc, color, disabled }: { href: string, icon: React.ReactNode, title: string, desc: string, color: string, disabled: boolean }) {
    const Component = disabled ? 'div' : Link;
    return (
        <Component href={disabled ? '#' : href} style={{ textDecoration: 'none' }}>
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                <div style={{
                    background: `${color}18`,
                    color: color,
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    {icon}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</p>
                </div>
            </motion.div>
        </Component>
    );
}
