'use client';
import { motion } from 'framer-motion';
import styles from './SplashScreen.module.css';

export function SplashScreen() {
    return (
        <div className={styles.container}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={styles.card}
            >
                {/* Logo and Animation - Same as before */}
                <div className={styles.logoWrapper}>
                    <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
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

                    {/* Pulsing glow */}
                    <motion.div
                        className={styles.glow}
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>

                <h1 className={styles.title}>GMSS</h1>

                {/* Loader Dots */}
                <div className={styles.dots}>
                    <motion.div
                        className={styles.dot}
                        style={{ backgroundColor: '#6c5ce7' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                        className={styles.dot}
                        style={{ backgroundColor: '#00d2ff' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                        className={styles.dot}
                        style={{ backgroundColor: '#00d68f' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                </div>

                {/* Slow Connection Message (appears after 3s) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3, duration: 0.5 }}
                    className={styles.slowMessage}
                >
                    <p className={styles.messageText}>Taking longer than usual...</p>
                    <button
                        onClick={() => window.location.reload()}
                        className={styles.reloadBtn}
                    >
                        Reload App
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
