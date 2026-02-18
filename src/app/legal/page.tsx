import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Legal & Disclaimers — GMSS',
    description: 'Legal disclaimers, email usage policy, and limitation of liability for GMSS.',
};

export default function LegalPage() {
    return (
        <div className={styles.legalContainer}>
            <Link href="/" className={styles.backLink}>
                ← Back to App
            </Link>

            <h1 className={styles.legalTitle}>Legal &amp; Disclaimers</h1>
            <p className={styles.lastUpdated}>Last updated: February 16, 2026</p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Email Usage Disclaimer</h2>
                <p className={styles.paragraph}>
                    GMSS is an email scheduling tool that automates the sending of emails through third-party email service providers (EmailJS). The following disclaimers apply to all email functionality:
                </p>
                <ul className={styles.list}>
                    <li><strong>No Delivery Guarantee</strong> — GMSS does not guarantee that emails will be delivered, received, or opened. Delivery depends on third-party providers, recipient server policies, spam filters, and network conditions.</li>
                    <li><strong>User Responsibility</strong> — Users are solely responsible for the content, recipients, and legality of emails sent through the Service. The owner assumes no liability for misuse.</li>
                    <li><strong>Compliance</strong> — Users must comply with all applicable anti-spam laws, including CAN-SPAM (USA), GDPR (EU), and IT Act (India). Sending unsolicited commercial emails is prohibited.</li>
                    <li><strong>Rate Limits</strong> — Email providers impose daily sending limits. GMSS tracks quotas but cannot prevent provider-side throttling or account suspension.</li>
                    <li><strong>Content Accuracy</strong> — GMSS delivers emails based on user-configured templates and data. The owner is not responsible for errors, typos, or inaccuracies in email content.</li>
                </ul>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Limitation of Liability</h2>
                <p className={styles.paragraph}>
                    TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:
                </p>
                <ul className={styles.list}>
                    <li>The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind.</li>
                    <li>The owner disclaims all warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.</li>
                    <li>The owner shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages arising from use of the Service.</li>
                    <li>The owner&apos;s total liability for any claim related to the Service shall not exceed ₹0 (zero rupees).</li>
                    <li>The owner is not liable for any loss of data, revenue, reputation, or business opportunities resulting from Service use, downtime, or email delivery failures.</li>
                </ul>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Data Processing Disclaimer</h2>
                <p className={styles.paragraph}>
                    GMSS processes the following types of data:
                </p>
                <ul className={styles.list}>
                    <li><strong>Authentication Data</strong> — Google OAuth tokens and profile information, processed and stored by Firebase Authentication.</li>
                    <li><strong>Event Data</strong> — Scheduled events, recipient email addresses, and email content, stored in Cloud Firestore.</li>
                    <li><strong>Provider Credentials</strong> — EmailJS API keys and service identifiers, stored securely in Firestore and server environment variables.</li>
                    <li><strong>Diagnostic Data</strong> — Error logs and failed delivery records in the Disaster Bank, used for debugging and retry operations.</li>
                </ul>
                <p className={styles.paragraph}>
                    All data processing occurs on Google Cloud Platform (Firebase) and Vercel infrastructure. No data is sold, shared with advertisers, or used for profiling.
                </p>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Intellectual Property Notice</h2>
                <p className={styles.paragraph}>
                    GMSS, including all source code, design, documentation, branding, and visual assets, is the exclusive property of Gaurav Patil. All rights are reserved under a Custom Proprietary License.
                </p>
                <p className={styles.paragraph}>
                    Unauthorized reproduction, modification, distribution, or commercial exploitation is strictly prohibited and may result in legal action.
                </p>
            </section>

            <div className={styles.divider} />

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Indemnification</h2>
                <p className={styles.paragraph}>
                    By using the Service, you agree to indemnify, defend, and hold harmless the owner from and against any claims, liabilities, damages, losses, and expenses (including legal fees) arising from your use of the Service, violation of these terms, or infringement of any third-party rights.
                </p>
            </section>

            <div className={styles.contactSection}>
                <h2 className={styles.sectionTitle}>Legal Contact</h2>
                <p className={styles.paragraph}>
                    For legal inquiries or licensing requests:<br />
                    Portfolio: <a href="https://www.gauravpatil.online" target="_blank" rel="noopener noreferrer">www.gauravpatil.online</a><br />
                    Workspace: <a href="https://www.gauravworkspace.site" target="_blank" rel="noopener noreferrer">www.gauravworkspace.site</a>
                </p>
                <p className={styles.paragraph} style={{ marginTop: '12px', fontSize: '0.75rem' }}>
                    © 2024–2026 Gaurav Patil. All Rights Reserved.
                </p>
            </div>
        </div>
    );
}
