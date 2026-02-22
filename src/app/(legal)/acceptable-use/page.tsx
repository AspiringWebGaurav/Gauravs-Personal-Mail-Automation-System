import { SSRShell } from '@/components/layout/SSRShell';

export const dynamic = 'force-static';

const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '32px', marginBottom: '16px' }}>{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{children}</p>
);

export default function AcceptableUsePage() {

    return (
        <SSRShell title="Acceptable Use Policy">
            <div className="animate-fade-in">
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Acceptable Use Policy</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Last Updated: {new Date().toLocaleDateString()}</p>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', marginTop: '24px' }} />
                </div>

                <H2>1. Introduction</H2>
                <P>This Acceptable Use Policy (AUP) outlines the acceptable use of the Gaurav Mail Scheduling System (GMSS). By using our service, you agree to comply with this policy.</P>

                <H2>2. Prohibited Activities</H2>
                <P>You may not use the service to:</P>
                <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.6, listStyle: 'disc', marginBottom: '16px' }}>
                    <li style={{ marginBottom: '8px' }}>Send unsolicited mass emails (spam).</li>
                    <li style={{ marginBottom: '8px' }}>Distribute malware, viruses, or other harmful software.</li>
                    <li style={{ marginBottom: '8px' }}>Engage in phishing or social engineering attacks.</li>
                    <li style={{ marginBottom: '8px' }}>Violate the privacy or intellectual property rights of others.</li>
                </ul>

                <H2>3. System Abuse</H2>
                <P>You allow us to monitor your use of the system to ensure compliance with this policy. We reserve the right to throttle or suspend accounts that place an unreasonable load on our infrastructure or attempt to bypass rate limits.</P>

                <H2>4. Content Standards</H2>
                <P>All content transmitted through the service must comply with applicable laws and regulations. You are solely responsible for the content of your communications.</P>

                <H2>5. Enforcement</H2>
                <P>We reserve the right to investigate and take appropriate action against anyone who, in our sole discretion, violates this AUP, including suspending or terminating their account and reporting them to law enforcement authorities.</P>
            </div>
        </SSRShell>
    );
}
