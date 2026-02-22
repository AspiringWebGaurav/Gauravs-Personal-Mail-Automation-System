import { adminDb } from "@/lib/firebase/admin";
import crypto from "crypto";
import AcceptButton from "@/components/AcceptButton";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
    const { token } = await params;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const snapshot = await adminDb.collection("invites")
        .where("tokenHash", "==", tokenHash)
        .limit(1)
        .get();

    if (snapshot.empty) return <ErrorState message="Invalid or deleted invitation link." />;

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();

    if (invite.status === "accepted") return <SuccessState message="You have already accepted this invitation!" />;
    if (invite.status === "revoked") return <ErrorState message="This invitation has been revoked." />;

    const expiresAt = invite.expiresAt.toDate();
    if (expiresAt < new Date()) return <ErrorState message="This invitation has expired." />;

    const eventSnap = await adminDb.collection("events").doc(invite.eventId).get();
    const event = eventSnap.exists ? eventSnap.data() : null;

    if (!event) return <ErrorState message="The associated event no longer exists." />;

    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg-main)' }}>
            <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Invitation</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2.5rem' }}>You&apos;ve been invited to participate.</p>

                <div style={{ padding: '1.5rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2.5rem', textAlign: 'left' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.25rem' }}>Event Name</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)' }}>{event.title}</div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.25rem' }}>Invited As</div>
                        <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{invite.inviteeEmail}</div>
                    </div>
                </div>

                <AcceptButton token={token} email={invite.inviteeEmail} />
            </div>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg-main)' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Link Invalid</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{message}</p>
            </div>
        </div>
    );
}

function SuccessState({ message }: { message: string }) {
    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg-main)' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Confirmed</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{message}</p>
            </div>
        </div>
    );
}
