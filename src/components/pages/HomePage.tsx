'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { subscribeToUserEvents } from '@/services/eventService';
import { getBatchEventReminders, type EventReminderDoc } from '@/services/reminderService';
import { EventCard } from '@/components/events/EventCard';
import { SkeletonList } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import type { GPMASEvent } from '@/types';
import styles from './HomePage.module.css';
import { ProviderSetupBanner } from '@/components/ui/ProviderSetupBanner';

export default function HomePage() {
    const { user } = useAuthStore();
    const [events, setEvents] = useState<GPMASEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [remindersMap, setRemindersMap] = useState<Record<string, EventReminderDoc[]>>({});
    const [remindersLoading, setRemindersLoading] = useState(false);

    // ── Real-time events subscription ──
    useEffect(() => {
        if (!user) return;

        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        const unsub = subscribeToUserEvents(user.uid, (evts) => {
            clearTimeout(safetyTimer);
            setEvents(evts);
            setLoading(false);
        });
        return () => {
            clearTimeout(safetyTimer);
            unsub();
        };
    }, [user]);

    // ── Batch fetch reminders for all events (cost-safe) ──
    useEffect(() => {
        if (events.length === 0) {
            setRemindersMap({});
            return;
        }

        let cancelled = false;
        setRemindersLoading(true);

        const eventIds = events.map(e => e.id);

        getBatchEventReminders(eventIds)
            .then((map) => {
                if (!cancelled) {
                    setRemindersMap(map);
                    setRemindersLoading(false);
                }
            })
            .catch((err) => {
                console.warn('[HomePage] Failed to fetch reminders:', err);
                if (!cancelled) {
                    setRemindersLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [events]);

    const { upcoming, past } = useMemo(() => {
        const now = Date.now();
        const up: GPMASEvent[] = [];
        const pa: GPMASEvent[] = [];
        for (const e of events) {
            const t = e.startTime?.toDate ? e.startTime.toDate().getTime() : 0;
            if (t >= now) up.push(e);
            else pa.push(e);
        }
        return { upcoming: up, past: pa };
    }, [events]);

    return (
        <div className="page-container">
            <ProviderSetupBanner />
            <motion.div
                className="page-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <p className={styles.greeting}>
                    Hello, <span className={styles.name}>{user?.displayName?.split(' ')[0]}</span>
                </p>
                <h1 className="page-title">Your Schedule</h1>
            </motion.div>

            {loading ? (
                <SkeletonList count={4} />
            ) : events.length === 0 ? (
                <motion.div
                    className={styles.empty}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className={styles.emptyIcon}>📅</div>
                    <h3>No events yet</h3>
                    <p>Tap the + button to create your first event</p>
                </motion.div>
            ) : (
                <>
                    {upcoming.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Upcoming</h2>
                            <div className={styles.eventList}>
                                {upcoming.map((event, i) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                    >
                                        <EventCard
                                            event={event}
                                            reminders={remindersMap[event.id]}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {past.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Past</h2>
                            <div className={styles.eventList}>
                                {past.map((event, i) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                    >
                                        <EventCard
                                            event={event}
                                            reminders={remindersMap[event.id]}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
