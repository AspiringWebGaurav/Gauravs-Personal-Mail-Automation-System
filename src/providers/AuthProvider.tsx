'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { GMSSUser, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

async function getOrCreateUser(firebaseUser: User): Promise<GMSSUser> {
    const ref = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const data = snap.data();
        // Update profile if changed
        if (
            data.displayName !== firebaseUser.displayName ||
            data.email !== firebaseUser.email ||
            data.photoURL !== firebaseUser.photoURL
        ) {
            await setDoc(ref, {
                displayName: firebaseUser.displayName ?? '',
                email: firebaseUser.email ?? '',
                photoURL: firebaseUser.photoURL ?? '',
                updatedAt: serverTimestamp(),
            }, { merge: true });
        }
        return { uid: firebaseUser.uid, ...data } as GMSSUser;
    }

    const newUser = {
        displayName: firebaseUser.displayName ?? '',
        email: firebaseUser.email ?? '',
        photoURL: firebaseUser.photoURL ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    await setDoc(ref, newUser);
    return { uid: firebaseUser.uid, ...newUser } as unknown as GMSSUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<GMSSUser | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                try {
                    // Timeout race to prevent infinite loading if Firestore hangs (e.g. offline/persistence issues)
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Auth profile fetch timed out')), 10000)
                    );

                    const gmssUser = await Promise.race([
                        getOrCreateUser(fbUser),
                        timeoutPromise
                    ]);

                    setFirebaseUser(fbUser);
                    setUser(gmssUser);
                } catch (err) {
                    console.warn('Auth profile fetch failed/timed out, using fallback:', err);

                    // Fallback: Use basic Firebase user data so the app loads
                    const fallbackUser: GMSSUser = {
                        uid: fbUser.uid,
                        displayName: fbUser.displayName || 'User',
                        email: fbUser.email || '',
                        photoURL: fbUser.photoURL || '',
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };

                    setFirebaseUser(fbUser);
                    setUser(fallbackUser);
                }
            } else {
                setFirebaseUser(null);
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const signInWithGoogle = useCallback(async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error('Sign-in error:', err);
            throw err;
        }
    }, []);

    const signOutUser = useCallback(async () => {
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signOut: signOutUser }}>
            {children}
        </AuthContext.Provider>
    );
}
