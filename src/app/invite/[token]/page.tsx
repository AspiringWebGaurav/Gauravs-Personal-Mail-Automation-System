import { adminDb } from "@/lib/firebase/admin";
import crypto from "crypto";
import AcceptButton from "@/components/AcceptButton";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
    const { token } = await params;

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Look up invite
    const snapshot = await adminDb.collection("invites")
        .where("tokenHash", "==", tokenHash)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return <ErrorState message="Invalid or deleted invitation link." />;
    }

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();

    if (invite.status === "accepted") {
        return <SuccessState message="You have already accepted this invitation!" />;
    }
    if (invite.status === "revoked") {
        return <ErrorState message="This invitation has been revoked by the organizer." />;
    }

    const expiresAt = invite.expiresAt.toDate();
    if (expiresAt < new Date()) {
        return <ErrorState message="This invitation has expired." />;
    }

    // Fetch Event Details
    const eventSnap = await adminDb.collection("events").doc(invite.eventId).get();
    const event = eventSnap.exists ? eventSnap.data() : null;

    if (!event) {
        return <ErrorState message="The associated event no longer exists." />;
    }

    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 9999 }}>
            {/* Animated background orbs */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'var(--accent-primary)', filter: 'blur(80px)', opacity: 0.3, top: '-80px', right: '-60px' }} />
                <div style={{ position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', background: 'var(--accent-secondary)', filter: 'blur(80px)', opacity: 0.3, bottom: '-40px', left: '-40px' }} />
            </div>

            <div className="glass-heavy" style={{ position: 'relative', zIndex: 1, padding: '2rem', borderRadius: '1.5rem', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Event Invitation</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>You've been invited by a member.</p>

                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.375rem' }}>Event Name</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>{event.title}</p>

                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.375rem' }}>Participant</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', background: 'var(--bg-card)', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)', display: 'inline-flex' }}>{invite.inviteeEmail}</p>
                </div>

                <AcceptButton token={token} email={invite.inviteeEmail} />
            </div>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,71,87,0.1)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,71,87,0.2)', boxShadow: '0 0 24px rgba(255,71,87,0.1)' }}>
                    <svg style={{ width: '32px', height: '32px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>{message}</p>
            </div>
        </div>
    );
}

function SuccessState({ message }: { message: string }) {
    return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,214,143,0.1)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(0,214,143,0.2)', boxShadow: '0 0 24px rgba(0,214,143,0.1)' }}>
                    <svg style={{ width: '32px', height: '32px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Confirmed</h2>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>{message}</p>
            </div>
        </div>
    );
}
