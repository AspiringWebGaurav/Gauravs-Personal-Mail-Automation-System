'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

const EventDetailPage = dynamic(() => import('@/components/pages/EventDetailPage'), {
    loading: () => <GlobalLoader />,
});

export default function EventDetailRoute() {
    const params = useParams<{ id: string }>();
    const eventId = params?.id || '';

    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <EventDetailPage eventId={eventId} />
            </AppShell>
        </AuthGuard>
    );
}
