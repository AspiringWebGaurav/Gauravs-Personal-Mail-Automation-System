'use client';

import { useEffect, useRef, useState } from 'react';
import { renderEmailTemplate } from '@/lib/emailTemplateRenderer';
import type { LayoutType, EmailThemeColors } from '@/lib/emailTemplateRenderer';
import styles from './EmailPreview.module.css';

interface EmailPreviewProps {
    layout: LayoutType;
    theme?: Partial<EmailThemeColors>;
    data?: {
        eventTitle?: string;
        eventTime?: string;
        eventLocation?: string;
        message?: string;
        recipientName?: string;
    };
    height?: number;
}

export function EmailPreview({ layout, theme, data, height = 380 }: EmailPreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [activeView, setActiveView] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        const html = renderEmailTemplate(layout, data, theme);
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.open();
        doc.write(html);
        doc.close();
    }, [layout, theme, data]);

    return (
        <div className={styles.previewContainer}>
            <div className={styles.toolbar}>
                <span className={styles.label}>Preview</span>
                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.viewBtn} ${activeView === 'desktop' ? styles.active : ''}`}
                        onClick={() => setActiveView('desktop')}
                    >
                        🖥️
                    </button>
                    <button
                        className={`${styles.viewBtn} ${activeView === 'mobile' ? styles.active : ''}`}
                        onClick={() => setActiveView('mobile')}
                    >
                        📱
                    </button>
                </div>
            </div>
            <div className={`${styles.iframeWrap} ${activeView === 'mobile' ? styles.mobile : ''}`}>
                <iframe
                    ref={iframeRef}
                    className={styles.iframe}
                    style={{ height }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                />
            </div>
        </div>
    );
}
