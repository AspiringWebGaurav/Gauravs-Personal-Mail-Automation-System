/**
 * Structured Logger for GMSS
 * Ensures all logs are JSON formatted for Cloud Logging compatibility.
 * Supports: INFO, WARN, ERROR levels with metadata.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    severity: string;  // GCP uses 'severity' instead of 'level'
    message: string;
    timestamp: string;
    traceId?: string;
    [key: string]: unknown; // Extra metadata
}

function formatLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}): string {
    const entry: LogEntry = {
        severity: level.toUpperCase(),
        message,
        timestamp: new Date().toISOString(),
        ...meta
    };
    return JSON.stringify(entry);
}

export const logger = {
    info: (message: string, meta?: Record<string, unknown>) => {
        console.log(formatLog('info', message, meta));
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
        console.warn(formatLog('warn', message, meta));
    },
    error: (message: string, meta?: Record<string, unknown>) => {
        console.error(formatLog('error', message, meta));
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatLog('debug', message, meta));
        }
    }
};
