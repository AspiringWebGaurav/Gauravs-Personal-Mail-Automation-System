'use client';

import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import CreatePage from '@/components/pages/CreatePage';

export default function CreateRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <CreatePage />
            </AppShell>
        </AuthGuard>
    );
}
