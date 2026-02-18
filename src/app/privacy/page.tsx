import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Privacy Policy — GMSS',
    description: 'Privacy policy and data handling practices for GMSS — Gaurav\'s Mail Scheduler System.',
};

export default function PrivacyPage() {
    return (
        <div className={styles.legalContainer}>
            <Link href="/" className={styles.backLink}>
                ← Back to App
            </Link>

            <h1 className={styles.legalTitle}>Privacy Policy</h1>
            <p className={styles.lastUpdated}>Last updated: February 16, 2026</p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
                <p className={styles.paragraph}>
                    GMSS collects the following information through Firebase Authentication:
                </p>
                <ul className={styles.list}>
                    <li>Google account display name</li>
                    <li>Google account email address</li>
                    <li>Google account profile photo URL</li>
                    <li>Firebase User ID (UID)</li>
                </ul>
                <p className={styles.paragraph}>
                    Additionally, the Service stores user-created content including scheduled events, email templates, category configurations, and email provider credentials.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>2. How We Use Your Information</h2>
                <p className={styles.paragraph}>Information collected is used exclusively for:</p>
                <ul className={styles.list}>
                    <li>Authenticating your identity and securing your account</li>
                    <li>Delivering scheduled email reminders to specified recipients</li>
                    <li>Displaying your profile within the application interface</li>
                    <li>Maintaining service functionality and diagnosing technical issues</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Data Storage & Security</h2>
                <p className={styles.paragraph}>
                    All data is stored in Google Cloud Firestore with strict security rules. Each user&apos;s data is isolated and accessible only via their authenticated session. Firestore security rules enforce per-user document access control.
                </p>
                <p className={styles.paragraph}>
                    Email provider credentials (API keys, service IDs) are stored in your personal Firestore document and in server-side environment variables. They are never exposed to other users or transmitted to unauthorized parties.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Data Handling Policy</h2>
                <p className={styles.paragraph}>
                    GMSS does not sell, trade, rent, or share your personal information with any third party. Data is transmitted only to:
                </p>
                <ul className={styles.list}>
                    <li><strong>Firebase/Google Cloud</strong> — Authentication and database storage</li>
                    <li><strong>EmailJS</strong> — Email delivery API (recipient addresses and email content only)</li>
                    <li><strong>Vercel</strong> — Application hosting and serverless functions</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Cookies & Local Storage</h2>
                <p className={styles.paragraph}>
                    GMSS uses browser local storage and session storage for authentication tokens and UI preferences. The Service Worker caches application assets for offline functionality. No third-party tracking cookies are used.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>6. Data Retention</h2>
                <p className={styles.paragraph}>
                    Your data is retained as long as your account is active. Scheduled events that have been sent are retained in Firestore for historical reference. You may delete your events through the application interface at any time.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>7. Your Rights</h2>
                <p className={styles.paragraph}>You have the right to:</p>
                <ul className={styles.list}>
                    <li>Access your personal data stored within the Service</li>
                    <li>Request deletion of your account and associated data</li>
                    <li>Revoke Google OAuth access at any time via your Google Account settings</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>8. Children&apos;s Privacy</h2>
                <p className={styles.paragraph}>
                    GMSS is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>9. Changes to This Policy</h2>
                <p className={styles.paragraph}>
                    This Privacy Policy may be updated periodically. Continued use of the Service constitutes acceptance of the revised policy.
                </p>
            </section>

            <div className={styles.contactSection}>
                <h2 className={styles.sectionTitle}>Contact</h2>
                <p className={styles.paragraph}>
                    For privacy-related inquiries:<br />
                    Portfolio: <a href="https://www.gauravpatil.online" target="_blank" rel="noopener noreferrer">www.gauravpatil.online</a><br />
                    Workspace: <a href="https://www.gauravworkspace.site" target="_blank" rel="noopener noreferrer">www.gauravworkspace.site</a>
                </p>
            </div>
        </div>
    );
}
