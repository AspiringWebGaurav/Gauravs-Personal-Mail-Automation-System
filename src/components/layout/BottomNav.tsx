'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Settings, Activity, Server, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './BottomNav.module.css';

const tabs = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/templates', icon: FileText, label: 'Templates' },
    { href: '/providers', icon: Server, label: 'Providers' },
    { href: '/tracker', icon: Activity, label: 'Tracker' },
    { href: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.nav}>
            <div className={styles.inner}>
                {tabs.map((tab) => {
                    const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
                    const Icon = tab.icon;



                    return (
                        <Link key={tab.href} href={tab.href} className={`${styles.tab} ${isActive ? styles.active : ''}`}>
                            <motion.div
                                className={styles.iconWrap}
                                whileTap={{ scale: 0.85 }}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                                {isActive && (
                                    <motion.div
                                        className={styles.indicator}
                                        layoutId="nav-indicator"
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                )}
                            </motion.div>
                            <span className={styles.label}>{tab.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
