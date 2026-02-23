'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { subscribeProviders } from '@/services/providerService';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CalendarPlus, Mail, Zap, Users, AlertOctagon } from 'lucide-react';
import type { EmailProvider } from '@/types';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import styles from './HomePage.module.css';

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
        <div className={styles.container}>
            {/* Top Navigation / Header */}
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className={styles.title}>Operations</h1>
                <p className={styles.subtitle}>
                    Create, schedule, and dispatch intelligent emails.
                </p>
            </motion.div>

            {/* Zero Provider State */}
            {!hasProviders && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={styles.errorBanner}
                >
                    <AlertOctagon color="#ef4444" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div className={styles.errorContent}>
                        <h3>Email Provider Required</h3>
                        <p>
                            Add a provider to activate automation. The transaction engine is locked until an active email provider is connected.
                        </p>
                        <Link href="/providers">
                            <span className={styles.errorBtn}>
                                Connect Provider
                            </span>
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Operations Grid */}
            <div className={styles.grid}>
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
                className={`${styles.actionCard} ${disabled ? styles.disabled : ''}`}
            >
                <div className={styles.iconWrapper} style={{ background: `${color}18`, color }}>
                    {icon}
                </div>
                <div className={styles.cardContent}>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                </div>
            </motion.div>
        </Component>
    );
}
