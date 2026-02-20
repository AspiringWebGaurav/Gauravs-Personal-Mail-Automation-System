'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import {
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    User,
    signOut
} from 'firebase/auth';

const ALLOWED_EMAIL = 'gauravpatil9262@gmail.com';

export function useRequireAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                if (currentUser.email !== ALLOWED_EMAIL) {
                    signOut(auth).then(() => {
                        setError('Unauthorized: Only gauravpatil9262@gmail.com is allowed access.');
                        setUser(null);
                    });
                } else {
                    setUser(currentUser);
                    setError('');
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        try {
            setLoading(true);
            setError('');
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account',
            });
            const result = await signInWithPopup(auth, provider);

            if (result.user.email !== ALLOWED_EMAIL) {
                await signOut(auth);
                setError('Unauthorized account. Access denied.');
                return null;
            }
            return result.user;
        } catch (err: unknown) {
            console.error('Login error:', err);
            setError(err instanceof Error ? err.message : 'Failed to sign in');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    return {
        user,
        loading,
        error,
        loginWithGoogle,
        logout,
    };
}
