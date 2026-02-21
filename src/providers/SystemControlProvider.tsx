'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

interface SystemControlContextType {
    isSystemHalted: boolean;
    isSimulationMode: boolean; // New state
    loading: boolean;
}

const SystemControlContext = createContext<SystemControlContextType>({
    isSystemHalted: false,
    isSimulationMode: false,
    loading: true,
});

export function SystemControlProvider({ children }: { children: ReactNode }) {
    const [isSystemHalted, setIsSystemHalted] = useState(false);
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'systemSettings', 'globalConfig'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setIsSystemHalted(!!data?.emergencyStop);
                setIsSimulationMode(!!data?.simulationMode); // Listen to simulation mode
            } else {
                setIsSystemHalted(false);
                setIsSimulationMode(false);
            }
            setLoading(false);
        }, (error) => {
            console.error('[SystemControl] Failed to listen to config:', error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    return (
        <SystemControlContext.Provider value={{ isSystemHalted, isSimulationMode, loading }}>
            {children}
        </SystemControlContext.Provider>
    );
}

export function useSystemControl() {
    return useContext(SystemControlContext);
}
