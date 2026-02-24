'use client';

import { useEffect, useRef } from 'react';

/**
 * DevModePoller — Fires a single initial poll on mount in development mode.
 * Recurring polling is handled by useDevScheduler (30s interval with auth gating).
 * This component only provides the immediate first poll for fast feedback on page load.
 */
export function DevModePoller() {
    const polled = useRef(false);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && !polled.current) {
            polled.current = true;
            fetch('/api/dev/process-reminders').catch(() => { });
        }
    }, []);

    return null;
}
