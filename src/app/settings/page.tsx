'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

const SettingsPage = dynamic(() => import('@/components/pages/SettingsPageFixed'), {
    loading: () => <GlobalLoader />,
});

export default function SettingsRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <SettingsPage />
            </AppShell>
        </AuthGuard>
    );
}
