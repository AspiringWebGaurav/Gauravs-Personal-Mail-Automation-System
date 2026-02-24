import { SSRShell } from '@/components/layout/SSRShell';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
    title: 'Cookie Policy | GPMAS',
    description: 'Cookie Policy for Gaurav\'s Personal Mail Automation System. Learn about cookies and local storage usage.',
    alternates: { canonical: 'https://gpmas.vercel.app/cookies' },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '32px', marginBottom: '16px' }}>{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{children}</p>
);

export default function CookiesPage() {

    return (
        <SSRShell title="Cookie Policy">
            <div className="animate-fade-in">
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Cookie Policy</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Last Updated: {new Date().toLocaleDateString()}</p>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', marginTop: '24px' }} />
                </div>

                <H2>1. What Are Cookies</H2>
                <P>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.</P>

                <H2>2. How We Use Cookies</H2>
                <P>We use cookies for the following purposes:</P>
                <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.6, listStyle: 'disc', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Essential Cookies:</strong> These are necessary for the website to function (e.g., maintaining your login session).</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Performance Cookies:</strong> These allow us to count visits and traffic sources so we can measure and improve the performance of our site.</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Functionality Cookies:</strong> These enable the website to provide enhanced functionality and personalization.</li>
                </ul>

                <H2>3. Your Choices</H2>
                <P>Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. However, this may prevent you from taking full advantage of the website.</P>

                <H2>4. Changes to This Policy</H2>
                <P>We may update this Cookie Policy from time to time. We encourage you to review this policy periodically.</P>
            </div>
        </SSRShell>
    );
}
