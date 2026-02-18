'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Bell, BellOff, RotateCcw } from 'lucide-react';
import styles from './InstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEYS = {
    installed: 'gmss-installed',
    silencedUntil: 'gmss-install-silenced-until',
    sessionHide: 'gmss-install-session-hide',
} as const;

const SNOOZE_OPTIONS = [
    { label: 'Show reminders normally', icon: Bell, minutes: 0 },
    { label: 'Silence for 15 minutes', icon: BellOff, minutes: 15 },
    { label: 'Silence for 30 minutes', icon: BellOff, minutes: 30 },
    { label: 'Silence for 60 minutes', icon: BellOff, minutes: 60 },
    { label: 'Show on next visit', icon: RotateCcw, minutes: -1 }, // -1 = session only
] as const;

export function InstallPrompt() {
    const [mounted, setMounted] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showSnooze, setShowSnooze] = useState(false);

    // ── Suppression check ──
    const isSuppressed = useCallback((): boolean => {
        try {
            // Permanent: already installed
            if (localStorage.getItem(STORAGE_KEYS.installed)) return true;

            // Session: "show on next visit"
            if (sessionStorage.getItem(STORAGE_KEYS.sessionHide)) return true;

            // Timed: silenced until timestamp
            const silencedUntil = localStorage.getItem(STORAGE_KEYS.silencedUntil);
            if (silencedUntil) {
                const until = parseInt(silencedUntil, 10);
                if (Date.now() < until) return true;
                // Expired silence — clean up
                localStorage.removeItem(STORAGE_KEYS.silencedUntil);
            }
        } catch {
            // Storage unavailable — don't suppress
        }
        return false;
    }, []);

    useEffect(() => {
        setMounted(true);

        // Already installed — never show
        if (isSuppressed()) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show banner after 2s delay for smoother UX — never blocks anything
            setTimeout(() => {
                if (!isSuppressed()) setShowBanner(true);
            }, 2000);
        };

        // Listen for native install event to permanently suppress
        const installedHandler = () => {
            try { localStorage.setItem(STORAGE_KEYS.installed, '1'); } catch { }
            setShowBanner(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
            setMounted(false);
        };
    }, [isSuppressed]);

    // ── Install action ──
    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            try { localStorage.setItem(STORAGE_KEYS.installed, '1'); } catch { }
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    // ── Snooze action ──
    const handleSnooze = (minutes: number) => {
        setShowBanner(false);
        setShowSnooze(false);

        try {
            if (minutes === 0) {
                // "Show reminders normally" — dismiss for this page load only (no storage write)
                return;
            }

            if (minutes === -1) {
                // "Show on next visit" — suppress for current session only
                sessionStorage.setItem(STORAGE_KEYS.sessionHide, '1');
                return;
            }

            // Timed silence
            const until = Date.now() + minutes * 60 * 1000;
            localStorage.setItem(STORAGE_KEYS.silencedUntil, until.toString());
        } catch {
            // Storage unavailable — best effort
        }
    };

    // ── Dismiss X → toggle snooze panel ──
    const handleDismissClick = () => {
        if (showSnooze) {
            // Second click on X while snooze is open → just close banner (page-load dismiss)
            setShowBanner(false);
            setShowSnooze(false);
        } else {
            setShowSnooze(true);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    className={styles.banner}
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                    {/* Main banner row */}
                    <div className={styles.bannerRow}>
                        <div className={styles.iconWrap}>
                            <Download />
                        </div>
                        <div className={styles.textWrap}>
                            <p className={styles.title}>Install GMSS</p>
                            <p className={styles.subtitle}>Add to home screen for quick access</p>
                        </div>
                        <div className={styles.actions}>
                            <button className={styles.installBtn} onClick={handleInstall}>
                                Install
                            </button>
                            <button className={styles.dismissBtn} onClick={handleDismissClick} aria-label="Options">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Snooze panel — expands below banner */}
                    <AnimatePresence>
                        {showSnooze && (
                            <motion.div
                                className={styles.snoozePanel}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className={styles.snoozeDivider} />
                                <p className={styles.snoozeLabel}>Remind me...</p>
                                {SNOOZE_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.minutes}
                                            className={styles.snoozeOption}
                                            onClick={() => handleSnooze(opt.minutes)}
                                        >
                                            <Icon size={14} />
                                            <span>{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
