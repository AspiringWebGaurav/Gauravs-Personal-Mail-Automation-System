'use client';

import { useState } from 'react';
import styles from '../invite.module.css';

interface Props {
    token: string;
    eventTitle: string;
}

export function InviteAcceptClient({ token, eventTitle }: Props) {
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleAccept = async () => {
        if (state === 'loading' || state === 'success') return; // Double-click guard
        setState('loading');

        try {
            const res = await fetch(`/api/invite/${token}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();

            if (data.status === 'accepted' || data.status === 'already_accepted') {
                setState('success');
            } else if (data.status === 'expired') {
                setState('error');
                setErrorMsg('This invitation has expired.');
            } else if (data.status === 'invalid' || data.status === 'invalid_state') {
                setState('error');
                setErrorMsg('This invitation is no longer valid.');
            } else {
                setState('error');
                setErrorMsg(data.error || 'Something went wrong.');
            }
        } catch {
            setState('error');
            setErrorMsg('Network error. Please try again.');
        }
    };

    if (state === 'success') {
        return (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className={`${styles.statusIcon} ${styles.successIcon}`} style={{ fontSize: 40 }}>✓</div>
                <h3 className={styles.statusTitle} style={{ fontSize: 18 }}>You&apos;re In!</h3>
                <p className={styles.statusMessage}>
                    You&apos;ve successfully joined <strong>{eventTitle}</strong>.
                </p>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className={`${styles.statusIcon} ${styles.errorIcon}`} style={{ fontSize: 40 }}>✕</div>
                <p className={styles.statusMessage}>{errorMsg}</p>
            </div>
        );
    }

    return (
        <div className={styles.acceptForm}>
            <button
                className={styles.acceptBtn}
                onClick={handleAccept}
                disabled={state === 'loading'}
            >
                {state === 'loading' ? (
                    <>
                        <span className={styles.spinner} style={{ width: 18, height: 18, borderWidth: 2 }} />
                        Accepting...
                    </>
                ) : (
                    'Accept Invitation'
                )}
            </button>
        </div>
    );
}
