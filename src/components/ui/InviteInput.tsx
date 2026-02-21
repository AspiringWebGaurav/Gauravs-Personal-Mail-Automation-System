import React, { useState, KeyboardEvent } from 'react';
import { X, Users, UserPlus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './InviteInput.module.css';

interface InviteInputProps {
    emails: string[];
    onEmailsChange: (emails: string[]) => void;
    maxInvites?: number;
    currentUserEmail?: string | null;
}

export function InviteInput({ emails, onEmailsChange, maxInvites = 50, currentUserEmail }: InviteInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addEmail();
        } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
            removeEmail(emails.length - 1);
        }
    };

    const addEmail = () => {
        const email = inputValue.trim().replace(/,$/, '');

        if (!email) return;

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Invalid email format');
            return;
        }

        if (emails.includes(email)) {
            setError('Email already added');
            return;
        }

        if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
            setError('You cannot invite yourself');
            return;
        }

        if (emails.length >= maxInvites) {
            setError(`Maximum ${maxInvites} invites allowed`);
            return;
        }

        onEmailsChange([...emails, email]);
        setInputValue('');
        setError(null);
    };

    const removeEmail = (index: number) => {
        onEmailsChange(emails.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.container}>
            <label className={styles.label}>
                <Users size={16} />
                Invite Keepers
                <span className={styles.counter}>
                    {emails.length} / {maxInvites}
                </span>
            </label>

            <div className={styles.inputWrapper}>
                <AnimatePresence>
                    {emails.map((email, index) => (
                        <motion.span
                            key={email}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={styles.chip}
                        >
                            {email}
                            <button
                                type="button"
                                onClick={() => removeEmail(index)}
                                className={styles.chipRemove}
                            >
                                <X size={12} />
                            </button>
                        </motion.span>
                    ))}
                </AnimatePresence>

                <input
                    type="email"
                    className={styles.input}
                    placeholder={emails.length === 0 ? "Enter email addresses..." : "Add another..."}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={addEmail}
                />
            </div>

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.error}
                >
                    <AlertCircle size={12} /> {error}
                </motion.p>
            )}

            <p className={styles.hint}>
                <UserPlus size={12} />
                Invites are auto-sent on creation.
            </p>
        </div>
    );
}
