"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AcceptButton({ token, email }: { token: string; email: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleAccept = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/invite/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, userEmail: email }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === "ALREADY_ACCEPTED") {
                    setSuccess(true);
                    return;
                }
                throw new Error(data.error || "Failed to accept invite");
            }

            setSuccess(true);
            router.refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error in acceptance';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ width: '100%', background: 'rgba(0,214,143,0.1)', color: 'var(--accent-success)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(0,214,143,0.2)', boxShadow: '0 0 16px rgba(0,214,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Invitation Accepted!
            </motion.div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8125rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 500, background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', padding: '0.625rem', borderRadius: 'var(--radius-sm)' }}>{error}</p>}

            <button
                onClick={handleAccept}
                disabled={isLoading}
                className="btn-primary"
                style={{ width: '100%' }}
            >
                <span>{isLoading ? "Confirming..." : "Accept Invitation"}</span>
            </button>
        </div>
    );
}
