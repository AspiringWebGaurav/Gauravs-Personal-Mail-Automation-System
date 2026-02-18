import { adminDb } from '@/lib/server/admin';
import crypto from 'crypto';
import styles from '../invite.module.css';
import { InviteAcceptClient } from './InviteAcceptClient';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

interface InviteData {
    eventId: string;
    eventTitle: string;
    inviterName: string;
    inviteeEmail: string;
    role: string;
    status: string;
    expiresAt: Date;
    eventTime?: string;
    eventLocation?: string;
}

async function getInviteByToken(token: string): Promise<{ invite: InviteData | null; state: 'valid' | 'expired' | 'accepted' | 'invalid' }> {
    try {
        const tokenHash = hashToken(token);
        const snap = await adminDb.collection('tokenInvites')
            .where('tokenHash', '==', tokenHash)
            .limit(1)
            .get();

        if (snap.empty) return { invite: null, state: 'invalid' };

        const data = snap.docs[0].data();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

        const invite: InviteData = {
            eventId: data.eventId,
            eventTitle: data.eventTitle,
            inviterName: data.inviterName,
            inviteeEmail: data.inviteeEmail,
            role: data.role,
            status: data.status,
            expiresAt,
        };

        // Fetch event details for time/location
        try {
            const eventSnap = await adminDb.collection('events').doc(data.eventId).get();
            if (eventSnap.exists) {
                const eventData = eventSnap.data();
                if (eventData?.startTime) {
                    const start = eventData.startTime.toDate ? eventData.startTime.toDate() : new Date(eventData.startTime);
                    invite.eventTime = start.toLocaleString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                    });
                }
                if (eventData?.location) invite.eventLocation = eventData.location;
            }
        } catch {
            // Non-critical — continue without event details
        }

        if (data.status === 'accepted') return { invite, state: 'accepted' };
        if (expiresAt < new Date()) {
            // Layer 3: On-access cleanup — mark as expired and trigger batch cleanup
            try {
                await adminDb.collection('tokenInvites').doc(snap.docs[0].id).update({
                    status: 'expired',
                });
                // Fire-and-forget: trigger batch cleanup
                fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invite/cleanup`, {
                    method: 'POST',
                }).catch(() => { });
            } catch { /* best effort */ }
            return { invite, state: 'expired' };
        }
        if (data.status === 'revoked') return { invite, state: 'invalid' };

        return { invite, state: 'valid' };
    } catch (error) {
        console.error('[InvitePage] Error fetching invite:', error);
        return { invite: null, state: 'invalid' };
    }
}

export default async function InviteTokenPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const { invite, state } = await getInviteByToken(token);

    return (
        <div className={styles.invitePage}>
            <div className={styles.inviteCard}>
                {state === 'valid' && invite && (
                    <>
                        <div className={styles.cardHeader}>
                            <div className={styles.headerLabel}>EVENT INVITATION</div>
                            <h1 className={styles.headerTitle}>{invite.eventTitle}</h1>
                        </div>
                        <div className={styles.cardBody}>
                            <p className={styles.inviteMessage}>
                                <strong>{invite.inviterName}</strong> has invited you to join this event
                                as <span className={styles.roleBadge}>{invite.role}</span>
                            </p>
                            <div className={styles.detailsCard}>
                                {invite.eventTime && (
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>WHEN</div>
                                        <div className={styles.detailValue}>{invite.eventTime}</div>
                                    </div>
                                )}
                                {invite.eventLocation && (
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>WHERE</div>
                                        <div className={styles.detailValue}>{invite.eventLocation}</div>
                                    </div>
                                )}
                                <div className={styles.detailRow}>
                                    <div className={styles.detailLabel}>INVITED AS</div>
                                    <div className={styles.detailValue} style={{ textTransform: 'capitalize' }}>{invite.role}</div>
                                </div>
                            </div>
                            <InviteAcceptClient token={token} eventTitle={invite.eventTitle} />
                        </div>
                    </>
                )}

                {state === 'accepted' && (
                    <div className={styles.cardBody}>
                        <div className={`${styles.statusIcon} ${styles.successIcon}`}>✓</div>
                        <h2 className={styles.statusTitle}>Already Accepted</h2>
                        <p className={styles.statusMessage}>
                            This invitation for <strong>{invite?.eventTitle}</strong> has already been accepted.
                            You&apos;re all set!
                        </p>
                    </div>
                )}

                {state === 'expired' && (
                    <div className={styles.cardBody}>
                        <div className={`${styles.statusIcon} ${styles.warningIcon}`}>⏰</div>
                        <h2 className={styles.statusTitle}>Invitation Expired</h2>
                        <p className={styles.statusMessage}>
                            This invitation has expired. Please ask the event organizer to send a new one.
                        </p>
                    </div>
                )}

                {state === 'invalid' && (
                    <div className={styles.cardBody}>
                        <div className={`${styles.statusIcon} ${styles.errorIcon}`}>✕</div>
                        <h2 className={styles.statusTitle}>Invalid Invitation</h2>
                        <p className={styles.statusMessage}>
                            This invitation link is not valid. It may have been revoked or the link is incorrect.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
