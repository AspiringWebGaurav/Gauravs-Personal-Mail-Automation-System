

import {
    collection, doc, updateDoc, getDocs,
    query, where, orderBy, serverTimestamp, onSnapshot,
    type Unsubscribe, runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { trackRead, trackWrite } from '@/lib/burnTracker';
import type { Invitation, InvitationStatus } from '@/types';
import { logMailAction } from './auditService';

const INVITATIONS_COL = 'invitations';

export async function createInvitation(data: {
    eventId: string;
    eventTitle: string;
    fromUserId: string;
    fromName: string;
    toEmail: string;
    role: Invitation['role'];
    idempotencyKey?: string;
}): Promise<string> {
    const { idempotencyKey } = data;
    // Auto-generate if missing: one invite per email per event (per day at least?)
    // Actually, allowing multiple invites to same email for same event is weird.
    // Let's make it event_email_role specific? Or just event_email?
    // Let's stick to the provided key or a safe default.
    const finalIdempotencyKey = idempotencyKey || `invite_${data.eventId}_${data.toEmail}_${Date.now()}`;

    try {
        const docId = await runTransaction(db, async (transaction) => {
            const deterministicId = `inv_${finalIdempotencyKey}`; // Use key-based ID
            // Or if we can't control ID easily (addDoc doesn't), we use doc() with generated ID.
            const docRef = doc(db, INVITATIONS_COL, deterministicId);
            const docSnap = await transaction.get(docRef);

            if (docSnap.exists()) {
                // console.log(`[Idempotency] Skipped duplicate invitation ${deterministicId}`);
                return deterministicId;
            }

            transaction.set(docRef, {
                ...data,
                status: 'pending' as InvitationStatus,
                createdAt: serverTimestamp(),
                respondedAt: null,
                idempotencyKey: finalIdempotencyKey,
            });
            trackWrite();
            return deterministicId;
        });

        // Audit Log
        logMailAction({
            action: 'INVITE',
            status: 'PENDING',
            reminderId: docId, // Reusing field for ID
            eventId: data.eventId,
            eventTitle: data.eventTitle,
            userId: data.fromUserId,
            recipientEmail: data.toEmail,
            idempotencyKey: finalIdempotencyKey,
            metadata: { role: data.role }
        });

        return docId;
    } catch (error) {
        console.error('Failed to create invitation:', error);
        throw error;
    }
}

export async function respondToInvitation(
    invitationId: string,
    status: 'accepted' | 'declined'
): Promise<void> {
    await updateDoc(doc(db, INVITATIONS_COL, invitationId), {
        status,
        respondedAt: serverTimestamp(),
    });
    trackWrite();
}

export async function getInvitationsForUser(email: string): Promise<Invitation[]> {
    const q = query(
        collection(db, INVITATIONS_COL),
        where('toEmail', '==', email),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    trackRead(snap.docs.length || 1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invitation));
}

export function subscribeToInvitations(
    email: string,
    callback: (invitations: Invitation[]) => void
): Unsubscribe {
    const q = query(
        collection(db, INVITATIONS_COL),
        where('toEmail', '==', email),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        trackRead(snap.docs.length || 1);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invitation));
        callback(items);
    }, (error) => {
        console.warn('[Invitations] Snapshot error:', error.code);
        callback([]);
    });
}

// ══════════════════════════════════════════════════════════════
// TOKEN INVITE SYSTEM (Email Link)
// These functions work with the separate `tokenInvites` collection
// and the server-side API routes. Existing invitation flow above
// is completely untouched.
// ══════════════════════════════════════════════════════════════

import type { TokenInvite } from '@/types';
import { limit } from 'firebase/firestore';

const TOKEN_INVITES_COL = 'tokenInvites';

/**
 * Client-side wrapper to create a token invite via server API.
 * The server handles token generation, Firestore write, and email sending.
 */
export interface TokenInviteResponse {
    success: boolean;
    inviteId?: string;
    error?: string;
    errorCode?: string; // New: for UI mapping (LOCKED, QUOTA)
    simulated?: boolean;
    provider?: string;
    emailStatus?: string;
    message?: string;
}

/**
 * Client-side wrapper to create a token invite via server API.
 * The server handles token generation, Firestore write, and email sending.
 */
export async function createTokenInvite(data: {
    eventId: string;
    eventTitle: string;
    inviteeEmail: string;
    role: string;
    inviterName: string;
    inviterEmail: string;
    eventTime?: string;
    eventLocation?: string;
    authToken: string;
}): Promise<TokenInviteResponse> {
    try {
        const res = await fetch('/api/invite/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.authToken}`,
            },
            body: JSON.stringify({
                eventId: data.eventId,
                eventTitle: data.eventTitle,
                inviteeEmail: data.inviteeEmail,
                role: data.role,
                inviterName: data.inviterName,
                inviterEmail: data.inviterEmail,
                eventTime: data.eventTime,
                eventLocation: data.eventLocation,
            }),
        });

        const json = await res.json();

        // Pass through all relevant fields
        return {
            success: json.success,
            inviteId: json.inviteId,
            error: json.error?.message || json.error, // Handle both object and string errors
            errorCode: json.error?.code,
            simulated: json.simulated,
            provider: json.provider,
            emailStatus: json.emailStatus,
            message: json.message
        };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Network error', errorCode: 'NETWORK_ERROR' };
    }
}

/**
 * Real-time subscription to token invites for a specific event.
 * Used on EventDetailPage to show invite statuses.
 */
export function subscribeToTokenInvites(
    eventId: string,
    callback: (invites: TokenInvite[]) => void
): Unsubscribe {
    const q = query(
        collection(db, TOKEN_INVITES_COL),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
    return onSnapshot(q, (snap) => {
        trackRead(snap.docs.length || 1);
        const now = new Date();
        const items = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as TokenInvite))
            // Layer 4: Client-side filter — exclude expired invites
            .filter((inv) => {
                if (!inv.expiresAt) return true;
                const exp = inv.expiresAt instanceof Date ? inv.expiresAt : new Date(inv.expiresAt as unknown as string);
                return exp > now;
            });
        callback(items);
    }, (error) => {
        console.warn('[TokenInvites] Snapshot error:', error.code);
        callback([]);
    });
}

