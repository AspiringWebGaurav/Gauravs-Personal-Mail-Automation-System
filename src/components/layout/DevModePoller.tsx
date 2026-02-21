'use client';

import { useEffect } from 'react';

export function DevModePoller() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            const poll = () => {
                fetch('/api/dev/process-reminders').catch(err =>
                    console.debug('[DevPoller] Failed to poll:', err)
                );
            };

            // Poll every 60 seconds
            const interval = setInterval(poll, 60000);

            // Initial poll
            poll();

            return () => clearInterval(interval);
        }
    }, []);

    return null;
}
