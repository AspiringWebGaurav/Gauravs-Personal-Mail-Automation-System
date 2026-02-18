'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';

const EventDetailPage = dynamic(() => import('@/components/pages/EventDetailPage'), {
    loading: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
            <div className="skeleton" style={{ height: 40, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        </div>
    ),
});

export default function EventRoute({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <EventDetailPage eventId={id} />
            </AppShell>
        </AuthGuard>
    );
}
