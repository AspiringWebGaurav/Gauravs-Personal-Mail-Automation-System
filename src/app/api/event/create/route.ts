import 'server-only';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { apiWrapper, AppError } from '@/lib/api-framework';
import { rateLimit } from '@/lib/rate-limiter';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { sendInviteEmail } from '@/lib/server/email';

export const dynamic = 'force-dynamic';

// ── Constants ──
const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 10;
const EVENTS_COL = 'events';
const PARTICIPANTS_COL = 'participants';
const REMINDERS_COL = 'scheduledReminders';
const TOKEN_INVITES_COL = 'tokenInvites';
const USERS_COL = 'users';

// ── Validation Schema ──
const createEventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().datetime(), // Expect ISO string
    endTime: z.string().datetime(),   // Expect ISO string
    timeZone: z.string().optional(), // e.g. "Asia/Kolkata" - for future use
    inviteEmails: z.array(z.string().email()).optional().default([]),
    // For "Custom Send Mode" / Mail types
    isMailType: z.boolean().optional().default(false),
    messageBody: z.string().optional(), // For mail description
    subject: z.string().optional(), // For mail title override
    // Smart scheduling
    recipientEmail: z.string().email().optional(), // For direct mail types
    reminderTiming: z.number().optional().default(10), // minutes before
});

export const POST = (req: NextRequest) => apiWrapper(async () => {
    // 1. Auth & Rate Limit
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = await rateLimit(`ip_${ip}_create_event`, 20, 60);
    if (!limitResult.success) throw new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429);

    let uid: string;
    let userEmail: string = '';
    let userName: string = 'Organizer';

    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
        userEmail = decoded.email || '';
        userName = decoded.name || 'Organizer';
    } catch (error) {
        throw new AppError('UNAUTHORIZED', 'Invalid auth token', 401, error);
    }

    // 2. Parse & Validate
    const body = await req.json();
    const validation = createEventSchema.safeParse(body);
    if (!validation.success) {
        throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, validation.error.format());
    }

    const {
        title, description, location, startTime, endTime,
        inviteEmails, isMailType, messageBody, subject, recipientEmail,
        reminderTiming
    } = validation.data;

    // Logic for Mail Type vs Event Type
    const finalTitle = isMailType ? (subject || title) : title;
    const finalDescription = isMailType ? (messageBody || description) : description;

    // 3. Prepare Data
    const eventId = adminDb.collection(EVENTS_COL).doc().id;
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 4. Transaction: Event + Owner + Invites + Usage
    const invitesToSend: { email: string; token: string; inviteId: string }[] = [];

    await adminDb.runTransaction(async (t) => {
        // A. Create Event
        const eventRef = adminDb.collection(EVENTS_COL).doc(eventId);
        t.set(eventRef, {
            title: finalTitle,
            description: finalDescription || '',
            location: location || '',
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
            categoryId: '', // Default
            createdBy: uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            status: 'active',
            participantCount: 1 + inviteEmails.length, // Owner + Invites
            inviteCount: inviteEmails.length,
            isMailType: isMailType || false
        });

        // B. Add Owner as Participant
        const ownerRef = eventRef.collection(PARTICIPANTS_COL).doc();
        t.set(ownerRef, {
            userId: uid,
            email: userEmail,
            displayName: userName,
            role: 'owner',
            reminderEnabled: true, // Owner always gets reminder? Or toggleable? Default true.
            reminderOffset: reminderTiming, // Default 10 min
            reminderBase: 'start',
            addedAt: FieldValue.serverTimestamp(),
        });

        // C. Create Scheduled Reminder for Owner (if applicable)
        // If it's a "Send Mail" type, we treat the recipient as the target of the reminder usually?
        // But for "Event", the owner gets a reminder.
        // Let's stick to: Owner ALWAYS gets a confirmation/reminder if enabled.
        // For "Mail Mode", the user essentially schedules a message to themselves or others?
        // Existing logic: "Mail types: create a minimal event + scheduled reminder"
        // If recipientEmail is present (Mail Mode), we add THEM as a participant too/instead?
        // Replicating existing logic:
        // Mail Mode: Owner is participant. Reminder is created for recipientEmail (which might not be the owner).

        if (isMailType && recipientEmail) {
            // Create Reminder for the "Target" (Recipient)
            // In "Send Mail" mode, the event is just a container.
            // The scheduled reminder IS the mail being sent.
            const reminderId = `rem_${eventId}_${recipientEmail}_${now.getTime()}`;
            const reminderRef = adminDb.collection(REMINDERS_COL).doc(reminderId);

            // Calculate scheduled time
            // If start is in past, send NOW (handled by scheduler picking it up immediately)
            // But we store the intended time.

            t.set(reminderRef, {
                eventId,
                eventTitle: finalTitle,
                participantId: ownerRef.id, // Linked to owner for now? 
                userId: uid,
                userEmail,
                senderName: userName,
                senderEmail: userEmail,
                email: recipientEmail,
                scheduledTime: Timestamp.fromDate(start), // Mail mode typically uses start time as send time
                status: 'pending',
                attempts: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                createdBy: 'user',
                idempotencyKey: `auto_${eventId}_${recipientEmail}`
            });
        } else {
            // Standard Event Mode - Owner Reminder
            // (Optional: User preference check could go here, but defaulting to YES for now)
            const reminderId = `rem_${eventId}_${userEmail}_${now.getTime()}`;
            const reminderRef = adminDb.collection(REMINDERS_COL).doc(reminderId);

            // Calculate reminder time (e.g. 10 mins before start)
            const reminderTime = new Date(start.getTime() - (reminderTiming * 60000));

            t.set(reminderRef, {
                eventId,
                eventTitle: finalTitle,
                participantId: ownerRef.id,
                userId: uid,
                email: userEmail, // Self reminder
                scheduledTime: Timestamp.fromDate(reminderTime),
                status: 'pending',
                attempts: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                createdBy: 'user',
                idempotencyKey: `auto_${eventId}_${userEmail}`
            });
        }

        // D. Process Invites (Inline)
        // Deduplicate: Remove duplicates AND prevent self-inviting.
        const uniqueInviteEmails = [...new Set(inviteEmails)].filter(email =>
            email !== userEmail && email !== recipientEmail
        );

        console.log(`[CreateAPI] Processing invites for: ${uniqueInviteEmails.join(', ')}`);

        for (const email of uniqueInviteEmails) {
            // 1. Generate Token
            const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const inviteId = adminDb.collection(TOKEN_INVITES_COL).doc().id;

            // 2. Add to list for post-transaction sending
            invitesToSend.push({ email, token: rawToken, inviteId });

            // 3. Create Invite Doc
            const inviteRef = adminDb.collection(TOKEN_INVITES_COL).doc(inviteId);
            const inviteExpires = new Date();
            inviteExpires.setTime(inviteExpires.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

            t.set(inviteRef, {
                tokenHash,
                eventId,
                eventTitle: finalTitle,
                inviterId: uid,
                inviterName: userName,
                inviterEmail: userEmail,
                inviteeEmail: email,
                role: 'viewer', // Default
                status: 'pending',
                createdAt: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromDate(inviteExpires),
                eventTime: start.toISOString(), // Storing as string or timestamp? standardizing on string for display
                eventLocation: location || '',
                version: 1
            });
        }

        // E. Update Usage
        const today = now.toISOString().split('T')[0];
        const usageRef = adminDb.collection(USERS_COL).doc(uid).collection('usage').doc(today);
        t.set(usageRef, {
            eventCount: FieldValue.increment(1),
            inviteCount: FieldValue.increment(inviteEmails.length),
            lastActive: FieldValue.serverTimestamp()
        }, { merge: true });
    });

    // 5. Post-Transaction: Send Emails (Fire & Forget / Background)
    // We don't block the response on this, but we do trigger it.
    // Ideally we use a queue, but here we await concurrently to ensure reliability before responding?
    // User wants "No freezing". So likely fire-and-forget or fast await.
    // "Hang tight. GMSS is securely dispatching invites." implies we wait a bit.

    // We will await them to return status, but catch errors so we don't fail the request.
    const emailPromises = invitesToSend.map(async (invite) => {
        try {
            const result = await sendInviteEmail({
                toEmail: invite.email,
                inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/invite/${invite.token}`,
                eventName: finalTitle,
                inviterName: userName,
                eventDate: start.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
                location: location || 'Online'
            });

            // Update status
            const status = result.success ? 'email_sent' : 'email_failed';

            if (!result.success) {
                logger.error(`Email dispatch failed for ${invite.email}`, { error: result.error, provider: result.provider });
            }

            await adminDb.collection(TOKEN_INVITES_COL).doc(invite.inviteId).update({
                status,
                emailSentAt: result.success ? FieldValue.serverTimestamp() : null,
                lastProvider: result.provider
            });
        } catch (err) {
            logger.error(`Failed to dispatch invite to ${invite.email}`, { error: err instanceof Error ? err.message : String(err) });
            await adminDb.collection(TOKEN_INVITES_COL).doc(invite.inviteId).update({
                status: 'email_failed'
            });
        }
    });

    await Promise.all(emailPromises);

    return {
        success: true,
        eventId,
        invitesSent: invitesToSend.length,
        message: 'Event created and invites dispatched'
    };
});
