import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.brand}>
                <p className={styles.builtBy}>Built &amp; Engineered by</p>
                <p className={styles.authorName}>Gaurav Patil</p>
            </div>

            <div className={styles.links}>
                <a
                    href="https://www.gauravpatil.site"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.brandLink}
                >
                    🌐 Portfolio
                </a>
                <a
                    href="https://www.gauravworkspace.site"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.brandLink}
                >
                    💼 Workspace
                </a>
            </div>

            <div className={styles.legalLinks}>
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>Terms</Link>
                <span className={styles.separator}>·</span>
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>Privacy</Link>
                <span className={styles.separator}>·</span>
                <Link href="/license" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>License</Link>
                <span className={styles.separator}>·</span>
                <Link href="/cookies" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>Cookies</Link>
                <span className={styles.separator}>·</span>
                <Link href="/acceptable-use" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>AUP</Link>
            </div>

            <p className={styles.copyright}>
                © 2024–2026 Gaurav Patil. All Rights Reserved.
            </p>
        </footer>
    );
}
