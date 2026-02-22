import { Timestamp } from 'firebase/firestore';

// ── User ─────────────────────────────────────────────────────
export interface GPMASUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ── Event ────────────────────────────────────────────────────
export type EventStatus = 'active' | 'cancelled' | 'completed';

export interface GPMASEvent {
    id: string;
    title: string;
    description: string;
    location: string;
    startTime: Timestamp;
    endTime: Timestamp;
    categoryId: string;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: EventStatus;
    /** Atomic counter — maintained by addParticipant/removeParticipant */
    participantCount?: number;
}

// ── Participant ──────────────────────────────────────────────
export type ParticipantRole = 'owner' | 'editor' | 'viewer';
export type ReminderBase = 'start' | 'end';

export interface Participant {
    id: string;
    userId: string;
    email: string;
    displayName: string;
    role: ParticipantRole;
    reminderEnabled: boolean;
    reminderOffset: number; // minutes before/after
    reminderBase: ReminderBase;
    templateId: string;
    themeId: string;
    addedAt: Timestamp;
}

// ── Scheduled Reminder ───────────────────────────────────────
export type ReminderStatus =
    | 'pending' | 'scheduled' | 'queued' | 'processing'
    | 'sent' | 'delivered'
    | 'failed' | 'retry_pending' | 'retrying'
    | 'cancelled' | 'expired' | 'expired_late' | 'aborted'
    | 'partial_success' | 'disaster_escalated' | 'simulation';

export interface ScheduledReminder {
    id: string;
    eventId: string;
    eventTitle: string;
    participantId: string;
    userId: string;
    email: string;
    scheduledTime: Timestamp;
    status: ReminderStatus;
    attempts: number;
    lastAttemptAt: Timestamp | null;
    failureReason?: string;
    lastError?: string;
    // Financial-Grade Idempotency
    idempotencyKey?: string;
    workerId?: string;
    lockedAt?: Timestamp;
    leaseExpiresAt?: Timestamp;
    providerUsed: string;
    createdAt: Timestamp;
    processedAt: Timestamp | null;
}

// ── Invitation ───────────────────────────────────────────────
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Invitation {
    id: string;
    eventId: string;
    eventTitle: string;
    fromUserId: string;
    fromName: string;
    toEmail: string;
    role: ParticipantRole;
    status: InvitationStatus;
    createdAt: Timestamp;
    respondedAt: Timestamp | null;
    idempotencyKey?: string;
}

// ── Email Template ───────────────────────────────────────────
export type LayoutType = 'dynamic' | 'minimal' | 'card' | 'banner' | 'elegant';

export interface EmailTemplate {
    id: string;
    name: string;
    subjectFormat: string;
    layoutType: LayoutType; /* soon to be exclusively 'dynamic' */
    messageBody: string;
    variables: string[];
    isSystem?: boolean;
    createdBy: string;
    createdAt: Timestamp;
    category?: string;
    tags?: string[];
}

// ── Email Theme ──────────────────────────────────────────────
export interface EmailTheme {
    id: string;
    name: string;
    layoutType: LayoutType;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    createdBy: string;
    createdAt: Timestamp;
    category?: string;
}

// ── Category ─────────────────────────────────────────────────
export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    createdBy: string;
    createdAt: Timestamp;
}

// ── Email Provider ───────────────────────────────────────────
export type ProviderStatus = 'active' | 'disabled' | 'error';

export interface EmailProvider {
    id: string;
    name: string;
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    status: ProviderStatus;
    dailyQuota: number;        // Max emails per day for this provider
    priority: number;          // Lower = higher priority (for sorting)
    isDefault: boolean;        // True for the 2 seed providers
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ── Provider Usage ───────────────────────────────────────────
export interface ProviderUsage {
    id: string;
    providerId: string;
    date: string; // YYYY-MM-DD
    usedToday: number;
    lastResetAt: Timestamp;
}

// ── Auth Context ─────────────────────────────────────────────
export interface AuthContextType {
    user: GPMASUser | null;
    firebaseUser: import('firebase/auth').User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

// ── Disaster Bank ────────────────────────────────────────────
export type DisasterBankStatus = 'pending_recovery' | 'recovering' | 'recovered' | 'disaster_failed';

export interface DisasterBankEntry {
    id: string;
    reminderId: string;
    status: DisasterBankStatus;
    activationReason: string;
    failureChain: string[];
    originalAttempts: number;
    recoveryAttempts: number;
    capturedAt: Timestamp;
    lastRecoveryAt: Timestamp | null;
    recoveredAt: Timestamp | null;
    recoveryProviderUsed: string;
}

// ── System Health ────────────────────────────────────────────
export interface SystemHealthStatus {
    providersHealthy: boolean;
    providerDetails: { id: string; name: string; status: string; remainingQuota: number }[];
    quotaAccurate: boolean;
    schedulerDrift: number;
    staleRecordsFound: number;
    staleRecordsRepaired: number;
    disasterQueueSize: number;
    overallStatus: 'healthy' | 'degraded' | 'critical';
    timestamp: Timestamp;
}

// ── Disaster Log ─────────────────────────────────────────────
export interface DisasterLogEntry {
    id: string;
    type: string;
    reminderId: string;
    message: string;
    timestamp: Timestamp;
}

// ── Token Invite (Email Link System) ─────────────────────────
export type TokenInviteStatus = 'pending' | 'email_sent' | 'email_failed' | 'accepted' | 'expired' | 'revoked';

export interface TokenInvite {
    id: string;
    eventId: string;
    eventTitle: string;
    inviterId: string;
    inviterName: string;
    inviterEmail: string;
    inviteeEmail: string;
    tokenHash: string;            // SHA-256 hash (raw token never stored)
    status: TokenInviteStatus;
    expiresAt: Timestamp;
    role: ParticipantRole;
    version: number;              // Optimistic locking
    providerAttemptCount: number;
    emailSentAt: Timestamp | null;
    acceptedAt: Timestamp | null;
    acceptedByUid: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    idempotencyKey: string;
}

// ── Invite Execution Log ─────────────────────────────────────
export type InviteLogAction =
    | 'CREATED' | 'EMAIL_QUEUED' | 'EMAIL_SENT' | 'EMAIL_FAILED'
    | 'ACCEPTED' | 'REJECTED_EXPIRED' | 'REJECTED_CLAIMED' | 'REJECTED_INVALID';

export interface InviteExecutionLog {
    id: string;
    inviteId: string;
    action: InviteLogAction;
    provider?: string;
    durationMs?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    timestamp: Timestamp;
}
