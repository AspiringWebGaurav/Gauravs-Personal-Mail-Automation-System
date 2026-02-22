'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

const EventDetailPage = dynamic(() => import('@/components/pages/EventDetailPage'), {
    loading: () => <GlobalLoader />,
});

export default function EventDetailRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <EventDetailPage />
            </AppShell>
        </AuthGuard>
    );
}
