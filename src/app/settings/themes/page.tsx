'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getThemes, createTheme, deleteTheme } from '@/services/themeService';
import { useAppStore } from '@/stores/appStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Palette } from 'lucide-react';
import Link from 'next/link';
import type { EmailTheme, LayoutType } from '@/types';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import styles from './themes.module.css';

function ThemesContent() {
    const { user } = useAuth();
    const showToast = useAppStore((s) => s.showToast);
    const [themes, setThemesState] = useState<EmailTheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const [name, setName] = useState('');
    const [layoutType, setLayoutType] = useState<LayoutType>('minimal');
    const [primaryColor, setPrimaryColor] = useState('#6c5ce7');
    const [secondaryColor, setSecondaryColor] = useState('#00d2ff');
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#1a1a2e');
    const [borderRadius, setBorderRadius] = useState(12);

    const load = useCallback(async () => {
        if (!user) return;
        const items = await getThemes(user.uid);
        setThemesState(items);
        setLoading(false);
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!user || !name) return;
        try {
            await createTheme({ name, layoutType, primaryColor, secondaryColor, backgroundColor, textColor, borderRadius, createdBy: user.uid });
            showToast('Theme created', 'success');
            setShowCreate(false);
            setName('');
            load();
        } catch {
            showToast('Failed to create theme', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTheme(id);
            showToast('Theme deleted', 'success');
            load();
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    return (
        <div className="page-container">
            <div className={styles.topBar}>
                <Link href="/settings" className={styles.backBtn}><ArrowLeft size={20} /></Link>
                <h1 className="page-title">Email Themes</h1>
            </div>

            <button className={`btn-primary ${styles.createBtn}`} onClick={() => setShowCreate(!showCreate)}>
                <Plus size={16} /> New Theme
            </button>

            {showCreate && (
                <motion.div className={`card ${styles.createForm}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className={styles.field}>
                        <label className="label">Name</label>
                        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ocean Blue" />
                    </div>
                    <div className={styles.field}>
                        <label className="label">Layout Type</label>
                        <select className="input-field" value={layoutType} onChange={(e) => setLayoutType(e.target.value as LayoutType)}>
                            <option value="minimal">Minimal</option>
                            <option value="card">Card</option>
                            <option value="banner">Banner</option>
                            <option value="elegant">Elegant</option>
                        </select>
                    </div>
                    <div className={styles.colorRow}>
                        <div className={styles.colorField}>
                            <label className="label">Primary</label>
                            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={styles.colorInput} />
                        </div>
                        <div className={styles.colorField}>
                            <label className="label">Secondary</label>
                            <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className={styles.colorInput} />
                        </div>
                        <div className={styles.colorField}>
                            <label className="label">Background</label>
                            <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className={styles.colorInput} />
                        </div>
                        <div className={styles.colorField}>
                            <label className="label">Text</label>
                            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className={styles.colorInput} />
                        </div>
                    </div>
                    <div className={styles.field}>
                        <label className="label">Border Radius: {borderRadius}px</label>
                        <input type="range" min={0} max={24} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className={styles.range} />
                    </div>

                    {/* Live Preview */}
                    <div className={styles.preview} style={{ backgroundColor, color: textColor, borderRadius: `${borderRadius}px` }}>
                        <div className={styles.previewHeader} style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                            <h4 style={{ color: '#fff' }}>Reminder Preview</h4>
                        </div>
                        <div className={styles.previewBody}>
                            <p><strong>Event:</strong> Team Meeting</p>
                            <p><strong>Time:</strong> 3:00 PM Today</p>
                            <p style={{ marginTop: 8, fontSize: '0.85em', opacity: 0.7 }}>This is a preview of how your themed email will look.</p>
                        </div>
                    </div>

                    <button className="btn-primary" onClick={handleCreate} style={{ width: '100%' }}>Create Theme</button>
                </motion.div>
            )}

            {loading ? (
                <div className="skeleton" style={{ height: 200, marginTop: 16, borderRadius: 'var(--radius-lg)' }} />
            ) : themes.length === 0 ? (
                <div className={styles.empty}>
                    <Palette size={32} strokeWidth={1.5} />
                    <p>No themes yet</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {themes.map((t) => (
                        <div key={t.id} className={`card ${styles.themeCard}`}>
                            <div className={styles.themeColors}>
                                <div className={styles.colorDot} style={{ background: t.primaryColor }} />
                                <div className={styles.colorDot} style={{ background: t.secondaryColor }} />
                                <div className={styles.colorDot} style={{ background: t.backgroundColor, border: '1px solid var(--border-default)' }} />
                            </div>
                            <div>
                                <h3 className={styles.themeName}>{t.name}</h3>
                                <span className={styles.layoutBadge}>{t.layoutType}</span>
                            </div>
                            <button className={styles.deleteBtn} onClick={() => handleDelete(t.id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ThemesPage() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <ThemesContent />
            </AppShell>
        </AuthGuard>
    );
}
