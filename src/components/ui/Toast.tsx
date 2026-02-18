'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
};

export function Toast() {
    const toast = useAppStore((s) => s.toast);
    const clearToast = useAppStore((s) => s.clearToast);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(clearToast, 2000);
        return () => clearTimeout(t);
    }, [toast, clearToast]);

    return (
        <div className={styles.container}>
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className={`${styles.toast} ${styles[toast.type]}`}
                        initial={{ opacity: 0, y: -40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                        {(() => {
                            const Icon = icons[toast.type];
                            return <Icon size={16} />;
                        })()}
                        <span className={styles.message}>{toast.message}</span>
                        <button className={styles.close} onClick={clearToast}>
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
