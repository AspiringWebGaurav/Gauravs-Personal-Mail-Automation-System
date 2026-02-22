'use client';

import { useSystemControl } from '@/providers/SystemControlProvider';
import { AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function GlobalHaltBanner() {
    const { isSystemHalted } = useSystemControl();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const _t = setTimeout(() => setMounted(true), 0);
        return () => { clearTimeout(_t); setMounted(false); };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isSystemHalted && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{
                        background: '#ef4444',
                        color: 'white',
                        textAlign: 'center',
                        overflow: 'hidden',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <div style={{
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontWeight: 600
                    }}>
                        <AlertOctagon size={24} strokeWidth={2.5} />
                        <span>SYSTEM HALTED — ALL EMAIL PROCESSING STOPPED</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
