import Link from 'next/link';
import { Home } from 'lucide-react';
import { SSRShell } from '@/components/layout/SSRShell';

export default function NotFound() {
    return (
        <SSRShell title="Page Not Found">
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '60px 0' }}>
                <h1 style={{ fontSize: '120px', fontWeight: 900, lineHeight: 1, color: 'var(--bg-tertiary)', letterSpacing: '-0.05em', marginBottom: '24px' }}>
                    404
                </h1>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Page not found
                </h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 40px', lineHeight: 1.6 }}>
                    The page you are looking for doesn&apos;t exist or has been moved.
                </p>

                <div style={{ height: '1px', background: 'var(--border-subtle)', maxWidth: '200px', margin: '0 auto 40px' }} />

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Link href="/" className="btn-primary">
                        <Home size={18} />
                        Return Home
                    </Link>
                </div>
            </div>
        </SSRShell>
    );
}

