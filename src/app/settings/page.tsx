'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/Skeleton';

const SettingsPage = dynamic(() => import('@/components/pages/SettingsPageFixed'), {
    loading: () => <SkeletonList count={3} />,
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
