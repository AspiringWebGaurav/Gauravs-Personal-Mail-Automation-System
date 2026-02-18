'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SystemControlContextType {
    isSystemHalted: boolean;
    loading: boolean;
}

const SystemControlContext = createContext<SystemControlContextType>({
    isSystemHalted: false,
    loading: true,
});

export function SystemControlProvider({ children }: { children: ReactNode }) {
    const [isSystemHalted, setIsSystemHalted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'systemSettings', 'globalConfig'), (snap) => {
            if (snap.exists()) {
                setIsSystemHalted(!!snap.data()?.emergencyStop);
            } else {
                setIsSystemHalted(false);
            }
            setLoading(false);
        }, (error) => {
            console.error('[SystemControl] Failed to listen to config:', error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    return (
        <SystemControlContext.Provider value={{ isSystemHalted, loading }}>
            {children}
        </SystemControlContext.Provider>
    );
}

export function useSystemControl() {
    return useContext(SystemControlContext);
}
