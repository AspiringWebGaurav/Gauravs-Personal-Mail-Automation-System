'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeMode;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

const STORAGE_KEY = 'gpmas_theme';

function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
    if (mode === 'system') return getSystemTheme();
    return mode;
}

function applyTheme(resolved: ResolvedTheme) {
    const root = document.documentElement;
    if (resolved === 'light') {
        root.setAttribute('data-theme', 'light');
    } else {
        root.removeAttribute('data-theme');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolved === 'light' ? '#f5f5f7' : '#0a0a0f');
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        if (typeof window === 'undefined') return 'dark';
        return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
    });
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

    const setTheme = useCallback((mode: ThemeMode) => {
        setThemeState(mode);
        localStorage.setItem(STORAGE_KEY, mode);
    }, []);

    useEffect(() => {
        const resolved = resolveTheme(theme);
        const _t = setTimeout(() => setResolvedTheme(resolved), 0);
        applyTheme(resolved);
        return () => clearTimeout(_t);
    }, [theme]);

    useEffect(() => {
        if (theme !== 'system') return;

        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => {
            const resolved = resolveTheme('system');
            setResolvedTheme(resolved);
            applyTheme(resolved);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
