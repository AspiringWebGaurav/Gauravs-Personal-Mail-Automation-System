'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonList } from '@/components/ui/Skeleton';

const SharedPage = dynamic(() => import('@/components/pages/SharedPage'), {
    loading: () => <SkeletonList count={3} />,
});

export default function SharedRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <SharedPage />
            </AppShell>
        </AuthGuard>
    );
}
