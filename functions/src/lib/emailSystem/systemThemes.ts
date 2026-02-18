import type { EmailTheme } from '../../types';
import { Timestamp } from 'firebase-admin/firestore';

const createSysTheme = (
    id: string,
    name: string,
    layoutType: EmailTheme['layoutType'],
    colors: { primary: string; secondary: string; background: string; text: string },
    borderRadius: number,
    category: string
): EmailTheme & { category: string } => ({
    id: `sys_theme_${id}`,
    name,
    layoutType,
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    backgroundColor: colors.background,
    textColor: colors.text,
    borderRadius,
    category,
    createdBy: 'system',
    createdAt: Timestamp.now(),
});

export const systemThemes = [
    // ── Modern / Clean ──────────────────────────────────────────────
    createSysTheme(
        'modern_blue', 'Modern Blue', 'card',
        { primary: '#3b82f6', secondary: '#eff6ff', background: '#ffffff', text: '#1f2937' },
        12, 'Modern'
    ),
    createSysTheme(
        'modern_dark', 'Midnight Dark', 'card',
        { primary: '#8b5cf6', secondary: '#1f2937', background: '#111827', text: '#f3f4f6' },
        16, 'Modern'
    ),
    createSysTheme(
        'clean_slate', 'Clean Slate', 'minimal',
        { primary: '#475569', secondary: '#f1f5f9', background: '#ffffff', text: '#334155' },
        4, 'Modern'
    ),

    // ── Vibrant / Fun ───────────────────────────────────────────────
    createSysTheme(
        'vibrant_sunset', 'Sunset Vibes', 'banner',
        { primary: '#f43f5e', secondary: '#fff1f2', background: '#fafafa', text: '#881337' },
        24, 'Vibrant'
    ),
    createSysTheme(
        'vibrant_mint', 'Fresh Mint', 'banner',
        { primary: '#10b981', secondary: '#ecfdf5', background: '#ffffff', text: '#064e3b' },
        20, 'Vibrant'
    ),
    createSysTheme(
        'electric_purple', 'Electric Purple', 'card',
        { primary: '#d946ef', secondary: '#fdf4ff', background: '#faf5ff', text: '#701a75' },
        16, 'Vibrant'
    ),

    // ── Elegant / Formal ────────────────────────────────────────────
    createSysTheme(
        'elegant_gold', 'Gold & Black', 'elegant',
        { primary: '#d97706', secondary: '#fffbeb', background: '#ffffff', text: '#451a03' },
        8, 'Elegant'
    ),
    createSysTheme(
        'elegant_navy', 'Navy Executive', 'elegant',
        { primary: '#1e3a8a', secondary: '#eff6ff', background: '#ffffff', text: '#1e293b' },
        6, 'Elegant'
    ),
    createSysTheme(
        'classic_serif', 'Classic Serif', 'minimal',
        { primary: '#000000', secondary: '#e5e5e5', background: '#ffffff', text: '#000000' },
        0, 'Elegant'
    ),

    // ── Seasonal ────────────────────────────────────────────────────
    createSysTheme(
        'season_winter', 'Winter Chill', 'banner',
        { primary: '#0ea5e9', secondary: '#f0f9ff', background: '#ffffff', text: '#0c4a6e' },
        12, 'Seasonal'
    ),
    createSysTheme(
        'season_autumn', 'Autumn Leaves', 'card',
        { primary: '#ea580c', secondary: '#fff7ed', background: '#fffaf0', text: '#7c2d12' },
        12, 'Seasonal'
    ),
];
