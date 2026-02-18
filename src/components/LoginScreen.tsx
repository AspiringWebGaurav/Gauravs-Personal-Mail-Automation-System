'use client';

import { useAuth } from '@/providers/AuthProvider';
import { motion } from 'framer-motion';
import styles from './login.module.css';

export default function LoginScreen() {
    const { signInWithGoogle } = useAuth();

    return (
        <div className={styles.container}>
            {/* Animated background orbs */}
            <div className={styles.bgOrbs}>
                <div className={styles.orb1} />
                <div className={styles.orb2} />
                <div className={styles.orb3} />
            </div>

            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Logo */}
                <motion.div
                    className={styles.logoSection}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className={styles.logoIcon}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <rect width="48" height="48" rx="14" fill="url(#grad)" />
                            <path d="M14 18L24 25L34 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 18H34V32H14V18Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="36" cy="14" r="5" fill="#00d2ff" stroke="#0a0a0f" strokeWidth="2" />
                            <defs>
                                <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48">
                                    <stop stopColor="#6c5ce7" />
                                    <stop offset="1" stopColor="#00d2ff" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className={styles.title}>GMSS</h1>
                    <p className={styles.subtitle}>Gaurav&apos;s Personal System</p>
                </motion.div>

                {/* Tagline */}
                <motion.p
                    className={styles.tagline}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                >
                    Targeted email automation, exclusively designed for Gaurav.
                    <br />
                    This entire platform handles your schedule, your way.
                </motion.p>

                {/* CTA */}
                <motion.button
                    className={styles.googleBtn}
                    onClick={signInWithGoogle}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Enter Gaurav&apos;s Dashboard</span>
                </motion.button>

                {/* Footer */}
                <motion.div
                    className={styles.footer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                >
                    <p className={styles.footerBrand}>
                        Built &amp; Engineered by <span className={styles.footerAuthor}>Gaurav Patil</span>
                    </p>
                    <div className={styles.footerLinks}>
                        <a href="https://www.gauravpatil.online" target="_blank" rel="noopener noreferrer">Portfolio</a>
                        <span className={styles.footerDot}>·</span>
                        <a href="https://www.gauravworkspace.site" target="_blank" rel="noopener noreferrer">Workspace</a>
                    </div>
                    <div className={styles.footerLegal}>
                        <a href="/terms">Terms</a>
                        <span className={styles.footerDot}>·</span>
                        <a href="/privacy">Privacy</a>
                        <span className={styles.footerDot}>·</span>
                        <a href="/legal">Legal</a>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
