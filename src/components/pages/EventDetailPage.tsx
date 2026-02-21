'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore as useAuth } from '@/store/authStore';
import { useSystemControl } from '@/providers/SystemControlProvider';
import { updateEvent, deleteEvent, subscribeToEvent } from '@/services/eventService';
// ... imports


import { subscribeToParticipants, updateParticipant, removeParticipant, createScheduledReminder } from '@/services/participantServiceFixed';
import { createInvitation, createTokenInvite, subscribeToTokenInvites } from '@/services/invitationService';
import { getTemplates } from '@/services/templateService';
import { getThemes } from '@/services/themeService';
import { useAppStore } from '@/stores/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Clock, MapPin, Users, Plus, Trash2, Bell, Send, Edit3, Save, X, Mail, Server, RefreshCw, AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import type { GPMASEvent, Participant, EmailTemplate, EmailTheme, TokenInvite } from '@/types';
import type { LayoutType } from '@/lib/emailTemplateRenderer';
import { EmailPreview } from '@/components/email/EmailPreview';
import { resolveMessagePlaceholders } from '@/lib/messagePresets';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import dynamic from 'next/dynamic';

const TemplateGallery = dynamic(() => import('@/components/email/TemplateGallery').then(mod => mod.TemplateGallery), {
    loading: () => null,
    ssr: false
});
import { subscribeToEventReminders, type EventReminderDoc } from '@/services/reminderService';
import { getStatusConfig, isActiveStatus } from '@/lib/statusConfig';
import styles from './EventDetailPage.module.css';

interface EventDetailPageProps {
    eventId: string;
}

export default function EventDetailPage({ eventId }: EventDetailPageProps) {
    const { user, user } = useAuth();
    const router = useRouter();
    const showToast = useAppStore((s) => s.showToast);
    const { isSystemHalted } = useSystemControl(); // Access global halt state

    const [event, setEvent] = useState<GPMASEvent | null>(null);
    const [tokenInvites, setTokenInvites] = useState<TokenInvite[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editLocation, setEditLocation] = useState('');

    // Invite modal state
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
    const [inviting, setInviting] = useState(false);
    const [invitePhase, setInvitePhase] = useState<'idle' | 'preparing' | 'sending' | 'done'>('idle');

    // Reminder modal state
    const [showReminder, setShowReminder] = useState<string | null>(null);
    const [reminderOffset, setReminderOffset] = useState(30);
    const [reminderBase, setReminderBase] = useState<'start' | 'end'>('start');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedThemeId, setSelectedThemeId] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [themes, setThemes] = useState<EmailTheme[]>([]);
    const [showGallery, setShowGallery] = useState(false);

    // ── Email Execution Log state ──
    const [eventReminders, setEventReminders] = useState<EventReminderDoc[]>([]);
    const [remindersLoading, setRemindersLoading] = useState(true);
    const [remindersError, setRemindersError] = useState(false);
    const [executionLogExpanded, setExecutionLogExpanded] = useState(true);
    const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);

    useEffect(() => {
        const unsubEvent = subscribeToEvent(eventId, (e) => {
            if (e) {
                setEvent(e);
                // Initialize form state only once when data first loads
                setEditTitle(prev => prev || e.title);
                setEditDescription(prev => prev || e.description);
                setEditLocation(prev => prev || e.location);
            }
            setLoading(false);
        });

        const unsubParticipants = subscribeToParticipants(eventId, setParticipants);
        const unsubTokenInvites = subscribeToTokenInvites(eventId, setTokenInvites);

        return () => {
            unsubEvent();
            unsubParticipants();
            unsubTokenInvites();
        };
    }, [eventId]);

    // ── Real-time Email Execution Log subscription ──
    useEffect(() => {
        setRemindersLoading(true);
        setRemindersError(false);
        let unsub: (() => void) | undefined;
        try {
            unsub = subscribeToEventReminders(eventId, (reminders) => {
                setEventReminders(reminders);
                setRemindersLoading(false);
            });
        } catch (err) {
            console.warn('[EventDetail] Reminder subscription failed:', err);
            setRemindersError(true);
            setRemindersLoading(false);
        }
        return () => { try { unsub?.(); } catch { /* ignore */ } };
    }, [eventId]);

    // Load templates & themes for reminder modal
    useEffect(() => {
        if (!user) return;
        getTemplates(user.uid).then(setTemplates);
        getThemes(user.uid).then(setThemes);
    }, [user]);

    const selectedTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId), [selectedTemplateId, templates]);
    const selectedThemeObj = useMemo(() => themes.find(t => t.id === selectedThemeId), [selectedThemeId, themes]);

    const previewTheme = useMemo(() => {
        if (!selectedThemeObj) return undefined;
        return {
            primaryColor: selectedThemeObj.primaryColor,
            secondaryColor: selectedThemeObj.secondaryColor,
            backgroundColor: selectedThemeObj.backgroundColor,
            textColor: selectedThemeObj.textColor,
            borderRadius: selectedThemeObj.borderRadius,
        };
    }, [selectedThemeObj]);

    const previewLayout: LayoutType = (selectedTemplate?.layoutType as LayoutType) || 'card';

    // Auto-fill message when template changes
    useEffect(() => {
        if (selectedTemplate?.messageBody) {
            setCustomMessage(selectedTemplate.messageBody);
        } else if (!selectedTemplateId) {
            setCustomMessage('Your event is coming up! Don\'t forget to prepare.');
        }
    }, [selectedTemplateId, selectedTemplate]);

    const resolvedPreviewMessage = useMemo(() => {
        return resolveMessagePlaceholders(customMessage, {
            eventTitle: event?.title || 'Your Event',
            eventTime: event?.startTime?.toDate ? format(event.startTime.toDate(), 'EEE, MMM d · h:mm a') : 'Today',
            location: event?.location || undefined,
            recipientName: user?.displayName || 'User',
        });
    }, [customMessage, event, user]);

    const previewData = useMemo(() => ({
        eventTitle: event?.title || 'Your Event',
        eventTime: event?.startTime?.toDate ? format(event.startTime.toDate(), 'EEE, MMM d · h:mm a') : 'Today',
        eventLocation: event?.location || undefined,
        message: resolvedPreviewMessage,
        recipientName: user?.displayName || 'User',
    }), [event, user, resolvedPreviewMessage]);

    const isOwner = event?.createdBy === user?.uid;

    const handleSaveEdit = async () => {
        if (!event) return;
        try {
            await updateEvent(eventId, {
                title: editTitle,
                description: editDescription,
                location: editLocation,
            });
            setEvent({ ...event, title: editTitle, description: editDescription, location: editLocation });
            setEditing(false);
            showToast('Event updated', 'success');
        } catch {
            showToast('Failed to update', 'error');
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteEvent(eventId);
            showToast('Event deleted', 'success');
            router.push('/');
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    const handleInvite = async () => {
        if (!user || !event || !inviteEmail || !user) return;

        if (isSystemHalted) {
            showToast('System Halted: Action blocked.', 'error');
            return;
        }

        // Validate email format before anything
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inviteEmail)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        // ── Phase 1: Optimistic close + immediate feedback ──
        const capturedEmail = inviteEmail;
        const capturedRole = inviteRole;
        setInviting(true);
        setInvitePhase('preparing');
        setShowInvite(false); // Close modal immediately — feels instant
        setInviteEmail('');   // Reset for next use
        showToast(`Preparing invitation for ${capturedEmail}...`, 'info');

        try {
            // ── Phase 2: Get auth token ──
            let authToken: string;
            try {
                authToken = await user.getIdToken();
            } catch {
                showToast('Authentication failed — please sign in again', 'error');
                setInviting(false);
                setInvitePhase('idle');
                return;
            }

            // ── Phase 3: Send token invite (server API) ──
            setInvitePhase('sending');
            // showToast(`Sending email to ${capturedEmail}...`, 'info'); // Reduce noise

            const evtStart = event.startTime?.toDate ? event.startTime.toDate() : new Date();
            const result = await createTokenInvite({
                eventId,
                eventTitle: event.title,
                inviteeEmail: capturedEmail,
                role: capturedRole,
                inviterName: user.displayName,
                inviterEmail: user.email,
                eventTime: format(evtStart, 'EEE, MMM d \u00b7 h:mm a'),
                eventLocation: event.location || undefined,
                authToken,
            });

            if (result.success) {
                setInvitePhase('done');
                if (result.simulated) {
                    showToast(`[SIMULATION] Invite created for ${capturedEmail} (Email Bypassed)`, 'success');
                } else {
                    showToast(`\u2713 Invitation sent to ${capturedEmail}!`, 'success');
                }
            } else {
                // granular error handling
                if (result.errorCode === 'LOCKED') {
                    showToast(`System busy: Invite for ${capturedEmail} is already processing.`, 'error');
                } else if (result.errorCode === 'QUOTA_EXCEEDED') {
                    showToast(`Daily email quota exceeded. Try again later.`, 'error');
                } else if (result.errorCode === 'SUSPENDED') {
                    showToast(`Email service temporarily suspended. Please contact support.`, 'error');
                } else {
                    showToast(result.error || `Failed to send email to ${capturedEmail}`, 'error');
                }
            }
        } catch {
            showToast(`Network error — could not reach server. Try again.`, 'error');
        }

        // ── Fallback: Create in-app invitation (non-blocking, fire-and-forget) ──
        try {
            const idempotencyKey = `invite_${eventId}_${capturedEmail}_${capturedRole}_${new Date().toDateString()}`;
            createInvitation({
                eventId,
                eventTitle: event.title,
                fromUserId: user.uid,
                fromName: user.displayName,
                toEmail: capturedEmail,
                role: capturedRole,
                idempotencyKey,
            }).catch(() => { }); // Silently degrade — never blocks UI
        } catch {
            // In-app invite is best-effort, never surface errors
        }

        setInviting(false);
        setInvitePhase('idle');
    };

    const handleSetReminder = async (participantId: string) => {
        if (!event) return;

        if (isSystemHalted) {
            showToast('System Halted: Scheduling blocked.', 'error');
            // Optionally close modal or show visual error
            return;
        }

        try {
            await updateParticipant(eventId, participantId, {
                reminderEnabled: true,
                reminderOffset,
                reminderBase,
            });

            const baseTime = reminderBase === 'start'
                ? event.startTime.toDate()
                : event.endTime.toDate();
            const scheduledTime = new Date(baseTime.getTime() - reminderOffset * 60 * 1000);

            if (scheduledTime > new Date()) {
                // Deterministic Idempotency Key:
                // Prevents duplicate reminders for the same event/participant/offset combination.
                // If the user clicks 5 times, all 5 will have the same key, and only one will be created.
                const idempotencyKey = `rem_${eventId}_${participantId}_${reminderBase}_${reminderOffset}`;

                await createScheduledReminder({
                    eventId,
                    eventTitle: event.title,
                    participantId,
                    userId: user!.uid,
                    email: user!.email,
                    scheduledTime,
                    templateId: selectedTemplateId || undefined,
                    themeId: selectedThemeId || undefined,
                    customMessage: customMessage || undefined,
                    idempotencyKey,
                });
            }

            showToast('Reminder set!', 'success');
            setShowReminder(null);
        } catch {
            showToast('Failed to set reminder', 'error');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingTop: 'var(--space-8)' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: i === 1 ? 40 : 80, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="page-container">
                <div className={styles.notFound}>
                    <h2>Event not found</h2>
                    <Link href="/" className="btn-primary">Go Home</Link>
                </div>
            </div>
        );
    }

    const startDate = event.startTime?.toDate ? event.startTime.toDate() : new Date();
    const endDate = event.endTime?.toDate ? event.endTime.toDate() : new Date();

    return (
        <div className="page-container">
            {/* Header */}
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Link href="/" className={styles.backBtn}>
                    <ArrowLeft size={20} />
                </Link>
                {isOwner && (
                    <div className={styles.headerActions}>
                        {editing ? (
                            <>
                                <button className={styles.actionBtn} onClick={handleSaveEdit}><Save size={18} /></button>
                                <button className={styles.actionBtn} onClick={() => setEditing(false)}><X size={18} /></button>
                            </>
                        ) : (
                            <>
                                <button className={styles.actionBtn} onClick={() => setEditing(true)}><Edit3 size={18} /></button>
                                <button className={`${styles.actionBtn} ${styles.danger}`} onClick={handleDelete}><Trash2 size={18} /></button>
                            </>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Event Info */}
            <motion.div
                className={styles.eventInfo}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {editing ? (
                    <input className={`input-field ${styles.editTitle}`} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                ) : (
                    <h1 className={styles.title}>{event.title}</h1>
                )}

                {(event.participantCount ?? 0) > 1 && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: '0.72rem', fontWeight: 600, color: '#a78bfa',
                        background: 'rgba(167,139,250,0.1)', padding: '3px 10px',
                        borderRadius: 99, width: 'fit-content', marginBottom: 4,
                    }}>
                        <Users size={13} /> Collaborative Event · {event.participantCount} members
                    </div>
                )}

                <div className={styles.metaList}>
                    <div className={styles.metaItem}>
                        <Clock size={16} />
                        <span>{format(startDate, 'EEE, MMM d · h:mm a')} — {format(endDate, 'h:mm a')}</span>
                    </div>
                    {(editing ? editLocation : event.location) && (
                        <div className={styles.metaItem}>
                            <MapPin size={16} />
                            {editing ? (
                                <input className="input-field" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} style={{ padding: '4px 8px', fontSize: 'var(--text-sm)' }} />
                            ) : (
                                <span>{event.location}</span>
                            )}
                        </div>
                    )}
                </div>

                {(editing ? editDescription : event.description) && (
                    editing ? (
                        <textarea className={`input-field ${styles.editDesc}`} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                    ) : (
                        <p className={styles.description}>{event.description}</p>
                    )
                )}
            </motion.div>

            {/* Participants */}
            <motion.section
                className={styles.section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Users size={16} /> Participants ({participants.length})
                    </h2>
                    {isOwner && (
                        <button className={styles.addBtn} onClick={() => setShowInvite(true)}>
                            <Plus size={16} /> Invite
                        </button>
                    )}
                </div>

                <div className={styles.participantList}>
                    {participants.map((p) => (
                        <div key={p.id} className={styles.participantCard}>
                            <div className={styles.pInfo}>
                                <span className={styles.pName}>{p.displayName || p.email}</span>
                                <span className={styles.pRole}>{p.role}</span>
                            </div>
                            <div className={styles.pActions}>
                                <button
                                    className={`${styles.reminderBtn} ${p.reminderEnabled ? styles.reminderActive : ''}`}
                                    onClick={() => setShowReminder(p.id)}
                                    title="Set reminder"
                                >
                                    <Bell size={14} />
                                    {p.reminderEnabled && <span className={styles.reminderDot} />}
                                </button>
                                {isOwner && p.userId !== user?.uid && (
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => removeParticipant(eventId, p.id)}
                                        title="Remove"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Token Invite Status List */}
                {tokenInvites.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email Invites</div>
                        {tokenInvites.map((inv) => {
                            const statusColors: Record<string, { bg: string; color: string }> = {
                                pending: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
                                email_sent: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
                                email_failed: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
                                accepted: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
                                expired: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
                                revoked: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
                            };
                            const sc = statusColors[inv.status] || statusColors.pending;
                            return (
                                <div key={inv.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 8, marginBottom: 4,
                                }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inv.inviteeEmail}</span>
                                    <span style={{
                                        fontSize: '0.62rem', fontWeight: 600,
                                        background: sc.bg, color: sc.color,
                                        padding: '2px 8px', borderRadius: 99,
                                    }}>
                                        {inv.status.replace('_', ' ')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.section>

            {/* ── Email Execution Log ── */}
            <motion.section
                className={styles.section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div
                    className={styles.sectionHeader}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExecutionLogExpanded(p => !p)}
                >
                    <h2 className={styles.sectionTitle}>
                        <Mail size={16} /> Email Execution Log ({eventReminders.length})
                    </h2>
                    {executionLogExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                <AnimatePresence>
                    {executionLogExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                        >
                            {remindersLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                                    {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
                                </div>
                            ) : remindersError ? (
                                <div style={{ padding: 12, fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertTriangle size={14} /> Unable to load execution log. Showing last known state.
                                </div>
                            ) : eventReminders.length === 0 ? (
                                <div style={{ padding: 16, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                    No emails scheduled for this event yet.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
                                    {eventReminders.map((r) => {
                                        const st = getStatusConfig(r.status);
                                        const isExpanded = expandedReminderId === r.id;
                                        const active = isActiveStatus(r.status);
                                        const schedTime = safeDate(r.scheduledTime);
                                        const procTime = safeDate(r.processedAt);
                                        const createTime = safeDate(r.createdAt);
                                        const countdown = active && schedTime && schedTime > new Date()
                                            ? formatDistanceToNow(schedTime, { addSuffix: true })
                                            : null;

                                        return (
                                            <div
                                                key={r.id}
                                                style={{
                                                    background: 'var(--bg-subtle)',
                                                    borderRadius: 8,
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s',
                                                }}
                                                onClick={() => setExpandedReminderId(isExpanded ? null : r.id)}
                                            >
                                                {/* Header Row */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{
                                                            fontSize: '0.62rem', fontWeight: 600,
                                                            color: st.color, background: st.bg,
                                                            padding: '2px 8px', borderRadius: 99,
                                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                                        }}>
                                                            {st.icon} {st.label}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                            {r.email || 'Unknown recipient'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {countdown && (
                                                            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#3b82f6' }}>
                                                                {countdown}
                                                            </span>
                                                        )}
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div style={{
                                                        marginTop: 10, paddingTop: 10,
                                                        borderTop: '1px solid var(--border)',
                                                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                                                        gap: '4px 12px', fontSize: '0.66rem',
                                                    }}>
                                                        {schedTime && (
                                                            <DetailRow icon={<Clock size={11} />} label="Scheduled" value={format(schedTime, 'MMM d, h:mm a')} />
                                                        )}
                                                        {procTime && (
                                                            <DetailRow icon={<Clock size={11} />} label="Executed" value={format(procTime, 'MMM d, h:mm:ss a')} />
                                                        )}
                                                        {r.providerUsed && (
                                                            <DetailRow icon={<Server size={11} />} label="Provider" value={r.providerUsed} />
                                                        )}
                                                        {r.attempts > 0 && (
                                                            <DetailRow icon={<RefreshCw size={11} />} label="Attempts" value={String(r.attempts)} />
                                                        )}
                                                        {r.lastError && (
                                                            <div style={{ gridColumn: '1/-1', color: '#ef4444', display: 'flex', gap: 4, alignItems: 'baseline' }}>
                                                                <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 2 }} />
                                                                <span><strong>Error:</strong> {r.lastError}</span>
                                                            </div>
                                                        )}
                                                        {r.customMessage && (
                                                            <div style={{ gridColumn: '1/-1', color: 'var(--text-secondary)' }}>
                                                                <strong>Message:</strong> {r.customMessage.length > 120 ? r.customMessage.slice(0, 120) + '…' : r.customMessage}
                                                            </div>
                                                        )}
                                                        {createTime && (
                                                            <DetailRow icon={<Clock size={11} />} label="Created" value={format(createTime, 'MMM d, h:mm a')} />
                                                        )}

                                                        {/* Links */}
                                                        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                                                            <Link href="/settings/audit" style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                                <ExternalLink size={11} /> Audit Trail
                                                            </Link>
                                                            <Link href="/settings/providers" style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                                <Server size={11} /> Providers
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.section>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)}>
                        <motion.div className={styles.modal} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>Delete Event?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                This action cannot be undone. All reminders will be cancelled.
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button className="btn-primary" onClick={confirmDelete} style={{ flex: 1, background: 'var(--accent-danger)' }}>
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invitation Modal - kept as is */}
            <AnimatePresence>
                {showInvite && (
                    <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInvite(false)}>
                        <motion.div className={styles.modal} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: '30px' }}>
                            <h3 className={styles.modalTitle}>Invite Participant</h3>
                            <div className={styles.field}>
                                <label className="label">Email</label>
                                <input className="input-field" type="email" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className="label">Role</label>
                                <select className="input-field" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}>
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                            </div>
                            <button className="btn-primary" onClick={handleInvite} disabled={inviting || !inviteEmail} style={{ width: '100%', marginTop: 12 }}>
                                {invitePhase === 'preparing' ? '⏳ Preparing...' :
                                    invitePhase === 'sending' ? '📧 Sending...' :
                                        <><Send size={16} /> Send Invitation</>}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reminder Modal */}
            <AnimatePresence>
                {showReminder && (
                    <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReminder(null)}>
                        <motion.div className={styles.modal} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>Set Reminder</h3>
                            <div className={styles.field}>
                                <label className="label">Minutes Before</label>
                                <input className="input-field" type="number" min={1} value={reminderOffset} onChange={(e) => setReminderOffset(Number(e.target.value))} />
                            </div>
                            <div className={styles.field}>
                                <label className="label">Relative To</label>
                                <select className="input-field" value={reminderBase} onChange={(e) => setReminderBase(e.target.value as 'start' | 'end')}>
                                    <option value="start">Event Start</option>
                                    <option value="end">Event End</option>
                                </select>
                            </div>

                            {/* Template & Theme Selection (New Gallery UI) */}
                            <div className={styles.field}>
                                <label className="label">Design & Style</label>
                                <div
                                    className={`card ${styles.designSelector}`}
                                    onClick={() => setShowGallery(true)}
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 8,
                                            background: selectedThemeObj ? selectedThemeObj.primaryColor : 'var(--bg-subtle)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: selectedThemeObj ? '#fff' : 'var(--text-tertiary)'
                                        }}>
                                            {selectedTemplate?.layoutType === 'minimal' ? '📝' :
                                                selectedTemplate?.layoutType === 'card' ? '🃏' : '✨'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{selectedTemplate?.name || 'Default Template'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {selectedThemeObj?.name || 'Default Theme'}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }}>
                                        Change
                                    </button>
                                </div>
                            </div>

                            <TemplateGallery
                                isOpen={showGallery}
                                onClose={() => setShowGallery(false)}
                                currentTemplateId={selectedTemplateId}
                                currentThemeId={selectedThemeId}
                                onSelect={(tplId, thmId, body) => {
                                    setSelectedTemplateId(tplId);
                                    setSelectedThemeId(thmId);
                                    if (body) setCustomMessage(body);
                                }}
                            />

                            {/* Custom Message (Editable) */}

                            {/* Custom Message */}
                            <div className={styles.field}>
                                <label className="label">Email Message</label>
                                <textarea
                                    className={`input-field ${styles.reminderMessage}`}
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    rows={4}
                                    placeholder="Write the email message..."
                                />
                                <span className={styles.messageHint}>
                                    Use {'{{eventTitle}}'}, {'{{eventTime}}'}, {'{{recipientName}}'} as placeholders
                                </span>
                            </div>

                            {/* Live Email Preview */}
                            <div className={styles.reminderPreview}>
                                <EmailPreview
                                    layout={previewLayout}
                                    theme={previewTheme}
                                    data={previewData}
                                    height={260}
                                />
                            </div>

                            <button className="btn-primary" onClick={() => handleSetReminder(showReminder)} style={{ width: '100%', marginTop: 12 }}>
                                <Bell size={16} /> Set Reminder
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Helpers for Email Execution Log ──
function safeDate(ts: { toDate: () => Date } | null | undefined): Date | null {
    try {
        if (!ts) return null;
        if (typeof ts.toDate === 'function') return ts.toDate();
        return null;
    } catch {
        return null;
    }
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, color: 'var(--text-secondary)' }}>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.6 }}>{icon}</span>
            <span style={{ fontWeight: 600, opacity: 0.7 }}>{label}:</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        </div>
    );
}
