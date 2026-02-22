'use client';

import styles from './GlobalLoader.module.css';

export interface GlobalLoaderProps {
    variant?: 'fullscreen' | 'overlay' | 'inline';
}

export function GlobalLoader({ variant = 'fullscreen' }: GlobalLoaderProps) {
    const containerClass =
        variant === 'fullscreen' ? styles.container :
            variant === 'overlay' ? styles.containerLocal :
                styles.containerInline;

    return (
        <div className={containerClass}>
            <div className={styles.glass}>
                <svg className={styles.logo} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="48" rx="14" fill="url(#grad_loader)" />
                    <path d="M14 18L24 25L34 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 18H34V32H14V18Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="36" cy="14" r="5" fill="#00d2ff" stroke="#0a0a0f" strokeWidth="2" />
                    <defs>
                        <linearGradient id="grad_loader" x1="0" y1="0" x2="48" y2="48">
                            <stop stopColor="#6c5ce7" />
                            <stop offset="1" stopColor="#00d2ff" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
}
