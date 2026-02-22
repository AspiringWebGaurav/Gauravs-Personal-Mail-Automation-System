'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

const CreatePage = dynamic(() => import('@/components/pages/CreatePage'), {
    loading: () => <GlobalLoader />,
});

export default function CreateRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <CreatePage />
            </AppShell>
        </AuthGuard>
    );
}
