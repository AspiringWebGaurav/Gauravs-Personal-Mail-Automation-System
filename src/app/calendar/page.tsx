'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/Skeleton';

const CalendarPage = dynamic(() => import('@/components/pages/CalendarPage'), {
    loading: () => <SkeletonList count={3} />,
});

export default function CalendarRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <CalendarPage />
            </AppShell>
        </AuthGuard>
    );
}
