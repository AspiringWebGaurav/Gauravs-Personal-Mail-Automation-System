"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { GlobalLoader } from "./ui/GlobalLoader";

const ALLOWED_EMAIL = "gauravpatil9262@gmail.com";
const PUBLIC_ROUTES = ["/login", "/invite"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user, loading, setUser, setLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                if (firebaseUser.email === ALLOWED_EMAIL) {
                    setUser(firebaseUser);
                } else {
                    // Force log out unauthorized users
                    auth.signOut();
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            // Small delay to ensure glass loader experience is visible (min 500ms)
            setTimeout(() => setLoading(false), 500);
        });

        return () => unsubscribe();
    }, [setUser, setLoading]);

    useEffect(() => {
        if (!loading) {
            const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
            if (!user && !isPublicRoute) {
                router.push("/login");
            } else if (user && pathname === "/login") {
                router.push("/");
            }
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return <GlobalLoader variant="fullscreen" />;
    }

    // Still block render if not user and not public route (waiting for router push)
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (!user && !isPublicRoute) return null;

    return <>{children}</>;
}
