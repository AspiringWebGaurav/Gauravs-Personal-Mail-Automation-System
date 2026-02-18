// ── Shared Status Configuration ──
// Reusable across EventCard, EventDetailPage, Audit page.
// Covers all 14 ReminderStatus types + legacy aliases + unknown fallback.

export interface StatusInfo {
    color: string;
    bg: string;
    label: string;
    tooltip: string;
    /** Unicode icon for lightweight rendering (no React import) */
    icon: string;
}

const STATUS_MAP: Record<string, StatusInfo> = {
    // ── Active / Success ──
    scheduled: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'SCHEDULED', tooltip: 'Email is scheduled and waiting', icon: '📅' },
    pending: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'PENDING', tooltip: 'Email is pending processing', icon: '📅' },
    queued: { color: '#6366f1', bg: 'rgba(99,102,241,0.10)', label: 'QUEUED', tooltip: 'Queued for delivery', icon: '📤' },
    processing: { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'PROCESSING', tooltip: 'Currently being processed', icon: '⚙️' },
    sent: { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'SENT', tooltip: 'Email was sent successfully', icon: '✅' },
    delivered: { color: '#059669', bg: 'rgba(5,150,105,0.10)', label: 'DELIVERED', tooltip: 'Email confirmed delivered', icon: '📬' },

    // ── Failure ──
    failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'FAILED', tooltip: 'Email sending failed', icon: '❌' },
    aborted: { color: '#dc2626', bg: 'rgba(220,38,38,0.10)', label: 'ABORTED', tooltip: 'Sending was aborted', icon: '🛑' },

    // ── Retry ──
    retry_pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'RETRY PENDING', tooltip: 'Waiting for retry attempt', icon: '🔄' },
    retrying: { color: '#d97706', bg: 'rgba(217,119,6,0.10)', label: 'RETRYING', tooltip: 'Retry in progress', icon: '🔁' },

    // ── Terminal / Cancelled ──
    cancelled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', label: 'CANCELLED', tooltip: 'Reminder was cancelled', icon: '🚫' },
    expired: { color: '#64748b', bg: 'rgba(100,116,139,0.10)', label: 'EXPIRED', tooltip: 'Reminder expired (past due)', icon: '⏰' },
    expired_late: { color: '#64748b', bg: 'rgba(100,116,139,0.10)', label: 'EXPIRED', tooltip: 'Reminder expired (too late)', icon: '⏰' },

    // ── Special ──
    partial_success: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'PARTIAL', tooltip: 'Some recipients received, others failed', icon: '⚠️' },
    disaster_escalated: { color: '#e11d48', bg: 'rgba(225,29,72,0.10)', label: 'ESCALATED', tooltip: 'Escalated to disaster recovery', icon: '🚨' },
    simulation: { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', label: 'SIMULATION', tooltip: 'Sent in simulation mode (not real)', icon: '🧪' },
};

const UNKNOWN_STATUS: StatusInfo = {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    label: 'UNKNOWN',
    tooltip: 'Status not recognized',
    icon: '❓',
};

/**
 * Get status configuration by status string. Never crashes — returns safe fallback for unknown.
 */
export function getStatusConfig(status: string | null | undefined): StatusInfo {
    if (!status) return UNKNOWN_STATUS;
    return STATUS_MAP[status.toLowerCase()] || { ...UNKNOWN_STATUS, label: status.toUpperCase() };
}

/**
 * Check if a status represents a terminal (final) state.
 */
export function isTerminalStatus(status: string): boolean {
    return ['sent', 'delivered', 'failed', 'aborted', 'cancelled', 'expired', 'expired_late'].includes(status);
}

/**
 * Check if a status represents an active (in-progress) state.
 */
export function isActiveStatus(status: string): boolean {
    return ['pending', 'scheduled', 'queued', 'processing', 'retrying', 'retry_pending'].includes(status);
}

/**
 * Get all known status keys (for filter dropdowns).
 */
export function getAllStatusKeys(): string[] {
    return Object.keys(STATUS_MAP).filter(k => k !== 'expired_late' && k !== 'pending'); // Exclude aliases
}
