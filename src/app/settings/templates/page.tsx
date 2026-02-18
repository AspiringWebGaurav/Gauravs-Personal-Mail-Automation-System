'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getTemplates, createTemplate, deleteTemplate } from '@/services/templateService';
import { getThemes } from '@/services/themeService';
import { useAppStore } from '@/stores/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, FileText, Eye, X, Copy, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { EmailTemplate, EmailTheme, LayoutType } from '@/types';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import { EmailPreview } from '@/components/email/EmailPreview';
import { MESSAGE_PRESETS, resolveMessagePlaceholders } from '@/lib/messagePresets';
import styles from './templates.module.css';

function TemplatesContent() {
    const { user } = useAuth();
    const showToast = useAppStore((s) => s.showToast);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [themes, setThemes] = useState<EmailTheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [previewLayout, setPreviewLayout] = useState<LayoutType | null>(null);
    const [previewThemeId, setPreviewThemeId] = useState('');
    const [previewMessage, setPreviewMessage] = useState('');

    // Create form state
    const [name, setName] = useState('');
    const [subjectFormat, setSubjectFormat] = useState('Reminder: {{eventTitle}}');
    const [layoutType, setLayoutType] = useState<LayoutType>('card');
    const [messageBody, setMessageBody] = useState('');
    const [activePreset, setActivePreset] = useState('friendly');

    const load = useCallback(async () => {
        if (!user) return;
        const [items, th] = await Promise.all([getTemplates(user.uid), getThemes(user.uid)]);
        setTemplates(items);
        setThemes(th);
        setLoading(false);
    }, [user]);

    useEffect(() => { load(); }, [load]);

    // Set initial message from preset
    useEffect(() => {
        const preset = MESSAGE_PRESETS.find(p => p.id === activePreset);
        if (preset) setMessageBody(preset.body);
    }, [activePreset]);

    const handleCreate = async () => {
        if (!user || !name || !messageBody) return;
        try {
            await createTemplate({ name, subjectFormat, layoutType, messageBody, createdBy: user.uid });
            showToast('Template created!', 'success');
            setShowCreate(false);
            setName('');
            setMessageBody('');
            setActivePreset('friendly');
            load();
        } catch {
            showToast('Failed to create template', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTemplate(id);
            showToast('Template deleted', 'success');
            load();
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    const selectedTheme = useMemo(() => {
        if (!previewThemeId) return undefined;
        const t = themes.find(th => th.id === previewThemeId);
        if (!t) return undefined;
        return {
            primaryColor: t.primaryColor,
            secondaryColor: t.secondaryColor,
            backgroundColor: t.backgroundColor,
            textColor: t.textColor,
            borderRadius: t.borderRadius,
        };
    }, [previewThemeId, themes]);

    // Resolve placeholders for preview
    const resolvedMessage = useMemo(() =>
        resolveMessagePlaceholders(messageBody || previewMessage, {
            eventTitle: 'Team Meeting',
            eventTime: 'Today at 3:00 PM',
            location: 'Zoom Meeting Room',
            recipientName: user?.displayName || 'Gaurav',
        }),
        [messageBody, previewMessage, user]
    );

    const openPreview = (layout: LayoutType, msg?: string) => {
        setPreviewLayout(layout);
        setPreviewMessage(msg || '');
    };

    return (
        <div className="page-container">
            <div className={styles.topBar}>
                <Link href="/settings" className={styles.backBtn}><ArrowLeft size={20} /></Link>
                <h1 className="page-title">Email Templates</h1>
            </div>

            <button className={`btn-primary ${styles.createBtn}`} onClick={() => setShowCreate(!showCreate)}>
                <Plus size={16} /> Create Template
            </button>

            {showCreate && (
                <motion.div className={`card ${styles.createForm}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>

                    {/* Template Name */}
                    <div className={styles.field}>
                        <label className="label">Template Name</label>
                        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meeting Reminder" />
                    </div>

                    {/* Subject Format */}
                    <div className={styles.field}>
                        <label className="label">Email Subject</label>
                        <input className="input-field" value={subjectFormat} onChange={(e) => setSubjectFormat(e.target.value)} />
                        <span className={styles.hint}>Use {'{{eventTitle}}'} and {'{{eventTime}}'} as placeholders</span>
                    </div>

                    {/* Layout Type */}
                    <div className={styles.field}>
                        <label className="label">Layout Style</label>
                        <div className={styles.layoutPicker}>
                            {(['minimal', 'card', 'banner', 'elegant'] as LayoutType[]).map((l) => (
                                <button
                                    key={l}
                                    className={`${styles.layoutOption} ${layoutType === l ? styles.layoutActive : ''}`}
                                    onClick={() => setLayoutType(l)}
                                >
                                    <span className={styles.layoutEmoji}>
                                        {l === 'minimal' && '📝'}{l === 'card' && '🃏'}{l === 'banner' && '🎨'}{l === 'elegant' && '✨'}
                                    </span>
                                    <span className={styles.layoutLabel}>{l}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Presets */}
                    <div className={styles.field}>
                        <label className="label"><Sparkles size={14} /> Message Template</label>
                        <div className={styles.presetGrid}>
                            {MESSAGE_PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    className={`${styles.presetCard} ${activePreset === p.id ? styles.presetActive : ''}`}
                                    onClick={() => setActivePreset(p.id)}
                                >
                                    <span className={styles.presetEmoji}>{p.emoji}</span>
                                    <span className={styles.presetName}>{p.name}</span>
                                    <span className={styles.presetDesc}>{p.description}</span>
                                </button>
                            ))}
                            <button
                                className={`${styles.presetCard} ${activePreset === 'custom' ? styles.presetActive : ''}`}
                                onClick={() => { setActivePreset('custom'); setMessageBody(''); }}
                            >
                                <span className={styles.presetEmoji}>✏️</span>
                                <span className={styles.presetName}>Custom</span>
                                <span className={styles.presetDesc}>Write your own</span>
                            </button>
                        </div>
                    </div>

                    {/* Message Body Editor */}
                    <div className={styles.field}>
                        <label className="label">Email Message</label>
                        <textarea
                            className={`input-field ${styles.messageEditor}`}
                            value={messageBody}
                            onChange={(e) => { setMessageBody(e.target.value); setActivePreset('custom'); }}
                            rows={6}
                            placeholder="Write your email message here..."
                        />
                        <div className={styles.placeholderGuide}>
                            <span className={styles.guideTitle}>Available placeholders:</span>
                            <div className={styles.placeholderTags}>
                                {['{{eventTitle}}', '{{eventTime}}', '{{location}}', '{{recipientName}}'].map(tag => (
                                    <button
                                        key={tag}
                                        className={styles.placeholderTag}
                                        onClick={() => setMessageBody(prev => prev + ' ' + tag)}
                                        title={`Insert ${tag}`}
                                    >
                                        <Copy size={10} /> {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className={styles.field}>
                        <label className="label"><Eye size={14} /> Email Preview — What recipient will see</label>
                        <EmailPreview
                            layout={layoutType}
                            data={{
                                eventTitle: 'Team Meeting',
                                eventTime: 'Today at 3:00 PM',
                                eventLocation: 'Zoom Meeting Room',
                                message: resolvedMessage,
                                recipientName: user?.displayName || 'Gaurav',
                            }}
                            height={320}
                        />
                    </div>

                    <button className="btn-primary" onClick={handleCreate} disabled={!name || !messageBody} style={{ width: '100%' }}>
                        Create Template
                    </button>
                </motion.div>
            )}

            {/* Existing Templates */}
            {loading ? (
                <div className="skeleton" style={{ height: 200, marginTop: 16, borderRadius: 'var(--radius-lg)' }} />
            ) : templates.length === 0 ? (
                <div className={styles.empty}>
                    <FileText size={32} strokeWidth={1.5} />
                    <p>No templates yet</p>
                    <p className={styles.emptyHint}>Create a template to customize your email reminders</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {templates.map((t) => (
                        <div key={t.id} className={`card ${styles.templateCard}`}>
                            <div className={styles.templateInfo}>
                                <h3 className={styles.templateName}>{t.name}</h3>
                                <p className={styles.templateSubject}>{t.subjectFormat}</p>
                                <div className={styles.templateMeta}>
                                    <span className={styles.layoutBadge}>{t.layoutType}</span>
                                    {t.messageBody && (
                                        <span className={styles.messageBadge}>
                                            {t.messageBody.length > 40 ? t.messageBody.slice(0, 40) + '…' : t.messageBody}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.previewBtn}
                                    onClick={() => openPreview(t.layoutType, t.messageBody)}
                                    title="Preview"
                                >
                                    <Eye size={14} />
                                </button>
                                {!t.id.startsWith('sys_') && (
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(t.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Layout Gallery */}
            <div className={styles.gallerySection}>
                <h2 className={styles.galleryTitle}>Layout Gallery</h2>
                <p className={styles.galleryDesc}>Click to preview each layout style</p>
                <div className={styles.layoutGrid}>
                    {(['minimal', 'card', 'banner', 'elegant'] as LayoutType[]).map((layout) => (
                        <button key={layout} className={styles.layoutCard} onClick={() => openPreview(layout)}>
                            <div className={styles.layoutIcon}>
                                {layout === 'minimal' && '📝'}{layout === 'card' && '🃏'}{layout === 'banner' && '🎨'}{layout === 'elegant' && '✨'}
                            </div>
                            <span className={styles.layoutName}>{layout}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Full Preview Modal */}
            <AnimatePresence>
                {previewLayout && (
                    <motion.div className={styles.previewOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewLayout(null)}>
                        <motion.div className={styles.previewModal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3>Preview: {previewLayout}</h3>
                                <div className={styles.modalControls}>
                                    {themes.length > 0 && (
                                        <select className="input-field" value={previewThemeId} onChange={(e) => setPreviewThemeId(e.target.value)} style={{ width: 'auto', fontSize: 13 }}>
                                            <option value="">Default Theme</option>
                                            {themes.map(th => (<option key={th.id} value={th.id}>{th.name}</option>))}
                                        </select>
                                    )}
                                    <button className={styles.closeBtn} onClick={() => setPreviewLayout(null)}><X size={18} /></button>
                                </div>
                            </div>
                            <EmailPreview
                                layout={previewLayout}
                                theme={selectedTheme}
                                data={{
                                    eventTitle: 'Team Meeting',
                                    eventTime: 'Today at 3:00 PM',
                                    eventLocation: 'Zoom Meeting Room',
                                    message: previewMessage ? resolveMessagePlaceholders(previewMessage, {
                                        eventTitle: 'Team Meeting',
                                        eventTime: 'Today at 3:00 PM',
                                        location: 'Zoom Meeting Room',
                                        recipientName: user?.displayName || 'Gaurav',
                                    }) : 'Your event is coming up! Don\'t forget to prepare.',
                                    recipientName: user?.displayName || 'Gaurav',
                                }}
                                height={450}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TemplatesPage() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <TemplatesContent />
            </AppShell>
        </AuthGuard>
    );
}
