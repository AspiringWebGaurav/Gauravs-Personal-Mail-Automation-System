'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore as useAuth } from '@/store/authStore';
import { subscribeToUserEvents } from '@/services/eventService';
import { EventCard } from '@/components/events/EventCard';
import { SkeletonList } from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GPMASEvent } from '@/types';
import styles from './CalendarPage.module.css';

export default function CalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState<GPMASEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToUserEvents(user.uid, (evts) => {
            setEvents(evts);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const weekDays = useMemo(() => {
        return eachDayOfInterval({
            start: weekStart,
            end: endOfWeek(weekStart, { weekStartsOn: 1 }),
        });
    }, [weekStart]);

    const selectedEvents = useMemo(() => {
        return events.filter((e) => {
            const d = e.startTime?.toDate ? e.startTime.toDate() : null;
            return d && isSameDay(d, selectedDate);
        });
    }, [events, selectedDate]);

    const eventsOnDay = (day: Date) => {
        return events.some((e) => {
            const d = e.startTime?.toDate ? e.startTime.toDate() : null;
            return d && isSameDay(d, day);
        });
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Calendar</h1>
                <p className="page-subtitle">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
            </div>

            {/* Week Navigation */}
            <motion.div
                className={styles.weekNav}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <button className={styles.navBtn} onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                    <ChevronLeft size={18} />
                </button>
                <span className={styles.weekLabel}>{format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d')}</span>
                <button className={styles.navBtn} onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                    <ChevronRight size={18} />
                </button>
            </motion.div>

            {/* Week Strip */}
            <div className={styles.weekStrip}>
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const hasEvents = eventsOnDay(day);

                    return (
                        <button
                            key={day.toISOString()}
                            className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
                            onClick={() => setSelectedDate(day)}
                        >
                            <span className={styles.dayName}>{format(day, 'EEE')}</span>
                            <span className={styles.dayNum}>{format(day, 'd')}</span>
                            {hasEvents && <div className={styles.dot} />}
                        </button>
                    );
                })}
            </div>

            {/* Events for Selected Day */}
            <div className={styles.dayEvents}>
                <h2 className={styles.dayTitle}>{format(selectedDate, 'EEEE')}</h2>
                {loading ? (
                    <SkeletonList count={2} />
                ) : selectedEvents.length === 0 ? (
                    <p className={styles.noEvents}>No events on this day</p>
                ) : (
                    <div className={styles.eventList}>
                        {selectedEvents.map((event, i) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                            >
                                <EventCard event={event} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
