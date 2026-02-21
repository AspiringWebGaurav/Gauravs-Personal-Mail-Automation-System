'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore as useAuth } from '@/store/authStore';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Dev-mode scheduler that polls the process-reminders API
 * at a regular interval to pick up any pending reminders
 * whose scheduledTime has now passed.
 *
 * Also fires immediately on mount and whenever a new reminder
 * is likely created (via the 'reminder:created' custom event).
 */
export function useDevScheduler() {
    const { user } = useAuth();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development' || !user) return;

        console.log('[DevScheduler] Active for user:', user.email);

        const triggerProcessing = async () => {
            try {
                const res = await fetch('/api/dev/process-reminders');
                const data = await res.json();
                if (data.processed > 0) {
                    console.log(`[DevScheduler] Processed ${data.processed} reminders`, data.results);
                } else if (data.message) {
                    // Only log non-empty queue messages to reduce noise
                    if (!data.message.includes('No pending')) {
                        console.log(`[DevScheduler] ${data.message}`);
                    }
                }
            } catch (err) {
                console.warn('[DevScheduler] Poll failed:', err);
            }
        };

        // Fire immediately on mount
        triggerProcessing();

        // Set up polling interval
        timerRef.current = setInterval(triggerProcessing, POLL_INTERVAL_MS);

        // Also listen for custom events dispatched when a new reminder is created
        const handleNewReminder = () => {
            console.log('[DevScheduler] New reminder detected, triggering processing...');
            triggerProcessing();
        };
        window.addEventListener('reminder:created', handleNewReminder);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            window.removeEventListener('reminder:created', handleNewReminder);
        };
    }, [user]);
}
