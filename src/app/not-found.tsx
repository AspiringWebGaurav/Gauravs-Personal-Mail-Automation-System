import Link from 'next/link';
import { Home } from 'lucide-react';
import { SSRShell } from '@/components/layout/SSRShell';

export default function NotFound() {
    return (
        <SSRShell title="Page Not Found">
            <div className="animate-fade-in" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '20px',
                minHeight: '60vh'
            }}>
                <h1 style={{ fontSize: 'clamp(80px, 20vw, 120px)', fontWeight: 900, lineHeight: 1, color: 'var(--bg-tertiary)', letterSpacing: '-0.05em', marginBottom: '24px' }}>
                    404
                </h1>
                <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Page not found
                </h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 40px', lineHeight: 1.6, fontSize: 'clamp(14px, 4vw, 16px)' }}>
                    The page you are looking for doesn&apos;t exist or has been moved.
                </p>

                <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%', maxWidth: '200px', margin: '0 auto 40px' }} />

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

