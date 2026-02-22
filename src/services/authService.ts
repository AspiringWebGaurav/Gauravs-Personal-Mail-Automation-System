import { auth } from '@/lib/firebase/client';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const ALLOWED_EMAIL = 'gauravpatil9262@gmail.com';

export const AuthService = {
    async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user.email !== ALLOWED_EMAIL) {
                await signOut(auth);
                return { success: false, error: 'unauthorized', user: null };
            }
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    async logout() {
        await signOut(auth);
    }
};
