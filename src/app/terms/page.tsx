import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Terms & Conditions — GMSS',
    description: 'Terms and conditions for using GMSS — Gaurav\'s Mail Scheduler System.',
};

export default function TermsPage() {
    return (
        <div className={styles.legalContainer}>
            <Link href="/" className={styles.backLink}>
                ← Back to App
            </Link>

            <h1 className={styles.legalTitle}>Terms &amp; Conditions</h1>
            <p className={styles.lastUpdated}>Last updated: February 16, 2026</p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
                <p className={styles.paragraph}>
                    By accessing or using GMSS — Gaurav&apos;s Mail Scheduler System (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not use the Service.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Service Description</h2>
                <p className={styles.paragraph}>
                    GMSS is a personal email scheduling and automation platform designed exclusively for use by its owner, Gaurav Patil. The Service enables automated, time-triggered email delivery through third-party email providers.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Acceptable Use Policy</h2>
                <p className={styles.paragraph}>You agree NOT to use the Service to:</p>
                <ul className={styles.list}>
                    <li>Send spam, unsolicited bulk email, or phishing communications</li>
                    <li>Harass, abuse, or harm any person or entity</li>
                    <li>Send emails containing malware, viruses, or malicious content</li>
                    <li>Violate any applicable local, state, national, or international law</li>
                    <li>Impersonate any person or entity</li>
                    <li>Exceed email provider rate limits or abuse third-party services</li>
                    <li>Attempt to gain unauthorized access to any systems or networks</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Intellectual Property</h2>
                <p className={styles.paragraph}>
                    All content, code, design, branding, and documentation associated with GMSS are the exclusive intellectual property of Gaurav Patil. No rights are granted to copy, modify, distribute, or create derivative works without explicit written permission.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Third-Party Services</h2>
                <p className={styles.paragraph}>
                    GMSS integrates with third-party services including Firebase (Google), EmailJS, and Vercel. Your use of these services is governed by their respective terms of service and privacy policies. GMSS is not responsible for the availability, performance, or policies of third-party services.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>6. Email Delivery Disclaimer</h2>
                <p className={styles.paragraph}>
                    GMSS does not guarantee email delivery. Emails may be delayed, blocked, or filtered by recipient email providers. The Service relies on third-party email APIs, and delivery is subject to their service availability, rate limits, and policies.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>7. Limitation of Liability</h2>
                <p className={styles.paragraph}>
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, GMSS AND ITS OWNER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, REVENUE, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
                </p>
                <p className={styles.paragraph}>
                    The Service is provided &quot;as is&quot; without warranties of any kind, either express or implied.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>8. Termination</h2>
                <p className={styles.paragraph}>
                    The owner reserves the right to terminate or suspend access to the Service at any time, without prior notice, for any reason.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>9. Governing Law</h2>
                <p className={styles.paragraph}>
                    These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Maharashtra, India.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>10. Changes to Terms</h2>
                <p className={styles.paragraph}>
                    The owner reserves the right to modify these Terms at any time. Continued use of the Service after modifications constitutes acceptance of the revised Terms.
                </p>
            </section>

            <div className={styles.contactSection}>
                <h2 className={styles.sectionTitle}>Contact</h2>
                <p className={styles.paragraph}>
                    For questions about these Terms, contact:<br />
                    Portfolio: <a href="https://www.gauravpatil.online" target="_blank" rel="noopener noreferrer">www.gauravpatil.online</a><br />
                    Workspace: <a href="https://www.gauravworkspace.site" target="_blank" rel="noopener noreferrer">www.gauravworkspace.site</a>
                </p>
            </div>
        </div>
    );
}
