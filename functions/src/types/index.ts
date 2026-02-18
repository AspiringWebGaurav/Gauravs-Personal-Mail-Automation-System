import { Timestamp } from 'firebase-admin/firestore';

// ── User ─────────────────────────────────────────────────────
export interface GMSSUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ── Event ────────────────────────────────────────────────────
export type EventStatus = 'active' | 'cancelled' | 'completed';

export interface GMSSEvent {
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
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'expired_late';

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
    failureReason: string;
    providerUsed: string;
    createdAt: Timestamp;
    processedAt: Timestamp | null;
    idempotencyKey: string;
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
}

// ── Email Template ───────────────────────────────────────────
export type LayoutType = 'minimal' | 'card' | 'banner' | 'elegant';

export interface EmailTemplate {
    id: string;
    name: string;
    subjectFormat: string;
    layoutType: LayoutType;
    messageBody: string;
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

// ── Provider Usage ───────────────────────────────────────────
export interface ProviderUsage {
    id: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    usedToday: number;
    lastResetAt: Timestamp;
}

// ── Auth Context ─────────────────────────────────────────────
export interface AuthContextType {
    user: GMSSUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}
