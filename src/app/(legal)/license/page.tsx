import { SSRShell } from '@/components/layout/SSRShell';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
    title: 'License | GPMAS',
    description: 'Private Use License for Gaurav\'s Personal Mail Automation System. All intellectual property rights reserved by Gaurav Patil.',
    alternates: { canonical: 'https://gpmas.vercel.app/license' },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '32px', marginBottom: '16px' }}>{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{children}</p>
);

export default function LicensePage() {

    return (
        <SSRShell title="License Information">
            <div className="animate-fade-in">
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>License Information</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Last Updated: {new Date().toLocaleDateString()}</p>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', marginTop: '24px' }} />
                </div>

                <H2>1. Grant of License</H2>
                <P>This Use License grants you a limited, non-exclusive, non-transferable, revocable license to use the application in accordance with the Terms and Conditions.</P>

                <H2>2. Usage Limits</H2>
                <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.6, listStyle: 'disc', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Rate Limiting:</strong> You must adhere to the rate limits imposed by the system.</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Fair Use:</strong> Usage must not place an unreasonable load on the infrastructure.</li>
                </ul>

                <H2>3. Prohibited Acts</H2>
                <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.6, listStyle: 'disc', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>API Abuse:</strong> Attempting to bypass quotas or rate limits is prohibited.</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Reverse Engineering:</strong> You may not reverse engineer, decompile, or disassemble any aspect of the service.</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Scraping:</strong> Automated scraping of data is strictly forbidden.</li>
                </ul>

                <H2>4. Violation Consequences</H2>
                <P>Violation of any terms in this license may result in:</P>
                <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.6, listStyle: 'disc', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}>Immediate account suspension.</li>
                    <li style={{ marginBottom: '8px' }}>Permanent ban from the service.</li>
                    <li style={{ marginBottom: '8px' }}>Legal action for damages.</li>
                </ul>

                <H2>5. Termination</H2>
                <P>This license is effective until terminated by you or the owner. Your rights under this license will terminate automatically without notice if you fail to comply with any term.</P>

                <div style={{ height: '1px', background: 'var(--border-subtle)', marginTop: '32px', marginBottom: '32px' }} />

                <H2>Third-Party Licenses</H2>
                <P>This software may include or utilize third-party software components. The licenses for these components are as follows:</P>
                <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.6, listStyle: 'disc', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Next.js:</strong> MIT License</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>React:</strong> MIT License</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Firebase:</strong> Apache License 2.0</li>
                    <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Lucide React:</strong> ISC License</li>
                </ul>
                <P>Full license texts for third-party components are available in their respective repositories or distributions.</P>
            </div>
        </SSRShell>
    );
}
