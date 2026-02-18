'use client';

import { useAuth } from '@/providers/AuthProvider';
import type { ReactNode } from 'react';

interface AuthGuardProps {
    children: ReactNode;
    fallback: ReactNode;
}

import { GlobalLoader } from '@/components/ui/GlobalLoader';

export function AuthGuard({ children, fallback }: AuthGuardProps) {
    const { user, loading } = useAuth();

    // Render splash screen until auth resolves — no black flash
    if (loading) return <GlobalLoader />;

    // Not authenticated — render fallback (login page)
    if (!user) return <>{fallback}</>;

    // Authenticated — render app
    return <>{children}</>;
}
