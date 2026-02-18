'use client';

import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import type { ReactNode } from 'react';
import styles from './AppShell.module.css';

import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { InstallPrompt } from '@/components/ui/InstallPrompt';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { useAppStore } from '@/stores/appStore';
import { useDevScheduler } from '@/hooks/useDevScheduler';

export function AppShell({ children }: { children: ReactNode }) {
    const isLoading = useAppStore((state) => state.isLoading);

    // Activate the dev-mode email scheduler (polls for pending reminders)
    useDevScheduler();

    return (
        <div className={styles.shell}>
            {isLoading && <GlobalLoader />}
            <main className={styles.main}>
                {children}
            </main>
            <Footer />
            <InstallPrompt />
            <ScrollToTop />
            <BottomNav />
        </div>
    );
}
