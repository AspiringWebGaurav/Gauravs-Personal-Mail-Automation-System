'use client';

import { useEffect, useState } from 'react';
import { useAuthStore as useAuth } from '@/store/authStore';
import { subscribeToInvitations } from '@/services/invitationService';
import { respondToInvitation } from '@/services/invitationService';
import { addParticipant } from '@/services/participantServiceFixed';
import { getEvent } from '@/services/eventService';
import { useAppStore } from '@/stores/appStore';
import { motion } from 'framer-motion';
import { Check, X, Mail, Clock } from 'lucide-react';
import type { Invitation } from '@/types';
import styles from './SharedPage.module.css';

export default function SharedPage() {
    const { user } = useAuth();
    const showToast = useAppStore((s) => s.showToast);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToInvitations(user.email, (items) => {
            setInvitations(items);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleRespond = async (invitation: Invitation, action: 'accepted' | 'declined') => {
        if (!user) return;
        setResponding(invitation.id);
        try {
            await respondToInvitation(invitation.id, action);

            if (action === 'accepted') {
                const event = await getEvent(invitation.eventId);
                if (event) {
                    await addParticipant(invitation.eventId, {
                        userId: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        role: invitation.role,
                    });
                }
            }

            showToast(action === 'accepted' ? 'Invitation accepted!' : 'Invitation declined', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to respond', 'error');
        }
        setResponding(null);
    };

    const pending = invitations.filter((i) => i.status === 'pending');
    const responded = invitations.filter((i) => i.status !== 'pending');

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Shared</h1>
                <p className="page-subtitle">Event invitations & collaborations</p>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            ) : invitations.length === 0 ? (
                <motion.div
                    className={styles.empty}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Mail size={40} strokeWidth={1.5} />
                    <h3>No invitations yet</h3>
                    <p>When someone invites you to an event, it will appear here</p>
                </motion.div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Pending</h2>
                            {pending.map((inv, i) => (
                                <motion.div
                                    key={inv.id}
                                    className={`card ${styles.invCard}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                >
                                    <div className={styles.invHeader}>
                                        <h3 className={styles.invTitle}>{inv.eventTitle}</h3>
                                        <span className={styles.roleBadge}>{inv.role}</span>
                                    </div>
                                    <p className={styles.invFrom}>From {inv.fromName}</p>
                                    <div className={styles.invActions}>
                                        <button
                                            className={`btn-primary ${styles.acceptBtn}`}
                                            onClick={() => handleRespond(inv, 'accepted')}
                                            disabled={responding === inv.id}
                                        >
                                            <Check size={16} /> Accept
                                        </button>
                                        <button
                                            className={`btn-secondary ${styles.declineBtn}`}
                                            onClick={() => handleRespond(inv, 'declined')}
                                            disabled={responding === inv.id}
                                        >
                                            <X size={16} /> Decline
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </section>
                    )}

                    {responded.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>History</h2>
                            {responded.map((inv) => (
                                <div key={inv.id} className={`card ${styles.invCard} ${styles.responded}`}>
                                    <div className={styles.invHeader}>
                                        <h3 className={styles.invTitle}>{inv.eventTitle}</h3>
                                        <span className={`${styles.statusBadge} ${styles[inv.status]}`}>{inv.status}</span>
                                    </div>
                                    <p className={styles.invFrom}>
                                        <Clock size={12} /> From {inv.fromName}
                                    </p>
                                </div>
                            ))}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
