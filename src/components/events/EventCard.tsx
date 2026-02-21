'use client';

import { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Clock, MapPin, ChevronDown, ChevronUp, Mail, User, Users, Server,
    RefreshCw, AlertTriangle, ExternalLink, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GPMASEvent } from '@/types';
import { getStatusConfig, isActiveStatus } from '@/lib/statusConfig';
import type { EventReminderDoc } from '@/services/reminderService';
import styles from './EventCard.module.css';

interface EventCardProps {
    event: GPMASEvent;
    /** Reminders for this event (optional — renders basic card if absent) */
    reminders?: EventReminderDoc[];
}

export const EventCard = memo(function EventCard({ event, reminders }: EventCardProps) {
    const [expanded, setExpanded] = useState(false);

    const startDate = event.startTime?.toDate ? event.startTime.toDate() : new Date();
    const endDate = event.endTime?.toDate ? event.endTime.toDate() : new Date();
    const isToday = format(startDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isPast = startDate < new Date();

    // Determine aggregate status from reminders
    const aggregateStatus = reminders && reminders.length > 0
        ? getAggregateStatus(reminders)
        : null;

    const toggleExpand = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(prev => !prev);
    }, []);

    return (
        <div className={`card ${styles.card} ${isPast ? styles.past : ''} ${expanded ? styles.expanded : ''}`}>
            {/* ── Collapsed View (always visible) ── */}
            <Link href={`/events/${event.id}`} className={styles.cardLink}>
                <div className={styles.dateStrip}>
                    <span className={styles.day}>{format(startDate, 'd')}</span>
                    <span className={styles.month}>{format(startDate, 'MMM')}</span>
                </div>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>{event.title}</h3>
                        {isToday && <span className={styles.todayBadge}>Today</span>}
                        {aggregateStatus && (
                            <span
                                className={styles.statusBadge}
                                style={{ color: aggregateStatus.color, background: aggregateStatus.bg }}
                                title={aggregateStatus.tooltip}
                            >
                                <span className={styles.statusIcon}>{aggregateStatus.icon}</span>
                                {aggregateStatus.label}
                            </span>
                        )}
                    </div>

                    {event.description && (
                        <p className={styles.description}>{event.description}</p>
                    )}

                    <div className={styles.meta}>
                        <div className={styles.metaItem}>
                            <Clock size={13} />
                            <span>{format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')}</span>
                        </div>
                        {event.location && (
                            <div className={styles.metaItem}>
                                <MapPin size={13} />
                                <span>{event.location}</span>
                            </div>
                        )}
                        {reminders && reminders.length > 0 && (
                            <div className={styles.metaItem}>
                                <Mail size={13} />
                                <span>{reminders.length} email{reminders.length !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {(event.participantCount ?? 0) > 1 && (
                            <div className={`${styles.metaItem} ${styles.collabBadge}`}>
                                <Users size={13} />
                                <span>{event.participantCount}+</span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            {/* Expand Toggle */}
            {reminders && reminders.length > 0 && (
                <button className={styles.expandBtn} onClick={toggleExpand} title={expanded ? 'Collapse' : 'Show execution details'}>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            )}

            {/* ── Expanded View (lazy, click to show) ── */}
            <AnimatePresence>
                {expanded && reminders && reminders.length > 0 && (
                    <motion.div
                        className={styles.expandedPanel}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                        <div className={styles.expandedInner}>
                            <div className={styles.expandedHeader}>
                                <Mail size={14} />
                                <span>Email Execution Log</span>
                            </div>

                            {reminders.map((r) => (
                                <ReminderRow key={r.id} reminder={r} eventId={event.id} isPast={isPast} />
                            ))}

                            <div className={styles.expandedFooter}>
                                <Link href={`/events/${event.id}`} className={styles.footerLink}>
                                    <Calendar size={12} /> Event Details
                                </Link>
                                <Link href="/settings/audit" className={styles.footerLink}>
                                    <ExternalLink size={12} /> Audit Trail
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// ── Individual Reminder Row ──
function ReminderRow({ reminder, eventId, isPast }: { reminder: EventReminderDoc; eventId: string; isPast: boolean }) {
    const status = getStatusConfig(reminder.status);
    const active = isActiveStatus(reminder.status);

    // Safe date extraction
    const scheduledTime = safeDate(reminder.scheduledTime);
    const processedAt = safeDate(reminder.processedAt);
    const createdAt = safeDate(reminder.createdAt);

    // Countdown for upcoming
    const countdown = active && scheduledTime && scheduledTime > new Date()
        ? formatDistanceToNow(scheduledTime, { addSuffix: true })
        : null;

    return (
        <div className={styles.reminderRow}>
            {/* Status + Recipient */}
            <div className={styles.reminderHeader}>
                <span
                    className={styles.reminderStatus}
                    style={{ color: status.color, background: status.bg }}
                    title={status.tooltip}
                >
                    <span>{status.icon}</span> {status.label}
                </span>
                <span className={styles.reminderRecipient}>
                    <User size={11} /> {reminder.email || 'Unknown'}
                </span>
            </div>

            {/* Details Grid */}
            <div className={styles.detailsGrid}>
                {scheduledTime && (
                    <DetailItem icon={<Clock size={11} />} label="Scheduled" value={format(scheduledTime, 'MMM d, h:mm a')} />
                )}
                {countdown && (
                    <DetailItem icon={<Clock size={11} />} label="Sends" value={countdown} highlight />
                )}
                {processedAt && (
                    <DetailItem icon={<Clock size={11} />} label="Executed" value={format(processedAt, 'MMM d, h:mm:ss a')} />
                )}
                {reminder.providerUsed && (
                    <DetailItem icon={<Server size={11} />} label="Provider" value={reminder.providerUsed} />
                )}
                {reminder.attempts > 0 && (
                    <DetailItem icon={<RefreshCw size={11} />} label="Attempts" value={String(reminder.attempts)} />
                )}
                {reminder.lastError && (
                    <DetailItem icon={<AlertTriangle size={11} />} label="Error" value={reminder.lastError} error />
                )}
                {reminder.customMessage && (
                    <DetailItem icon={<Mail size={11} />} label="Message" value={truncate(reminder.customMessage, 80)} />
                )}
                {createdAt && (
                    <DetailItem icon={<Calendar size={11} />} label="Created" value={format(createdAt, 'MMM d, h:mm a')} />
                )}
            </div>
        </div>
    );
}

// ── Small Detail Item ──
function DetailItem({ icon, label, value, error, highlight }: {
    icon: React.ReactNode; label: string; value: string; error?: boolean; highlight?: boolean;
}) {
    return (
        <div className={`${styles.detailItem} ${error ? styles.detailError : ''} ${highlight ? styles.detailHighlight : ''}`}>
            <span className={styles.detailIcon}>{icon}</span>
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.detailValue}>{value}</span>
        </div>
    );
}

// ── Helpers ──
function safeDate(ts: { toDate: () => Date } | null | undefined): Date | null {
    try {
        if (!ts) return null;
        if (typeof ts.toDate === 'function') return ts.toDate();
        return null;
    } catch {
        return null;
    }
}

function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

function getAggregateStatus(reminders: EventReminderDoc[]) {
    // Priority: failed > processing > pending > sent
    const statuses = reminders.map(r => r.status);
    if (statuses.some(s => s === 'failed' || s === 'aborted' || s === 'disaster_escalated')) {
        return getStatusConfig('failed');
    }
    if (statuses.some(s => s === 'processing' || s === 'retrying')) {
        return getStatusConfig('processing');
    }
    if (statuses.some(s => s === 'pending' || s === 'scheduled' || s === 'queued' || s === 'retry_pending')) {
        return getStatusConfig('scheduled');
    }
    if (statuses.every(s => s === 'sent' || s === 'delivered')) {
        return getStatusConfig('sent');
    }
    if (statuses.every(s => s === 'cancelled')) {
        return getStatusConfig('cancelled');
    }
    // Mixed or unknown
    return getStatusConfig(statuses[0]);
}
