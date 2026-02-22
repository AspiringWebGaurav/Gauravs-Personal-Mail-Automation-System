import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import TemplatesPage from '@/components/pages/TemplatesPage';

export default function TemplatesRoute() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <TemplatesPage />
            </AppShell>
        </AuthGuard>
    );
}
