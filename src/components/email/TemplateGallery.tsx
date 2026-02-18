'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, Palette, Layout, Sparkles } from 'lucide-react';
import type { EmailTemplate, EmailTheme } from '@/types';
import { getTemplates } from '@/services/templateService';
import { getThemes } from '@/services/themeService';
import { useAuth } from '@/providers/AuthProvider';
import { EmailPreview } from './EmailPreview';
import { resolveMessagePlaceholders } from '@/lib/messagePresets';
import styles from './TemplateGallery.module.css';

interface TemplateGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (templateId: string, themeId: string, body: string) => void;
    currentTemplateId?: string;
    currentThemeId?: string;
}

const CATEGORIES = ['All', 'Professional', 'Casual', 'Urgent', 'Holiday', 'My Templates'];

export function TemplateGallery({ isOpen, onClose, onSelect, currentTemplateId, currentThemeId }: TemplateGalleryProps) {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [themes, setThemes] = useState<EmailTheme[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Selection state - derived from props initially, then local
    const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId || '');
    const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId || '');

    // Load Data
    useEffect(() => {
        if (!user || !isOpen) return;
        Promise.all([
            getTemplates(user.uid),
            getThemes(user.uid)
        ]).then(([tpls, thms]) => {
            setTemplates(tpls);
            setThemes(thms);

            // If no theme selected, pick first system theme or first available
            if (!currentThemeId && thms.length > 0) {
                // Try to find a neutral one
                const defaultTheme = thms.find(t => t.id.includes('modern_blue')) || thms[0];
                setSelectedThemeId(defaultTheme.id);
            }
            setLoading(false);
        });
    }, [user, isOpen, currentThemeId]);

    // Derived Selection
    const selectedTemplate = useMemo(() =>
        templates.find(t => t.id === selectedTemplateId),
        [templates, selectedTemplateId]);

    const selectedTheme = useMemo(() =>
        themes.find(t => t.id === selectedThemeId),
        [themes, selectedThemeId]);

    // Filtering
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (activeCategory === 'All') return true;
            if (activeCategory === 'My Templates') return !t.id.startsWith('sys_');

            // System templates have 'category' field
            return t.category === activeCategory;
        });
    }, [templates, activeCategory, searchQuery]);

    // Preview Message
    const previewMessage = useMemo(() => {
        if (!selectedTemplate) return 'Select a template to preview...';
        return resolveMessagePlaceholders(selectedTemplate.messageBody, {
            eventTitle: 'Product Launch',
            eventTime: 'Tomorrow at 10:00 AM',
            location: 'Main Hall',
            recipientName: 'Alex',
        });
    }, [selectedTemplate]);

    // Handle Confirm
    const handleApply = () => {
        if (!selectedTemplateId) return;
        onSelect(
            selectedTemplateId,
            selectedThemeId || themes[0]?.id || '',
            selectedTemplate?.messageBody || ''
        );
        onClose();
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Mobile Tab State
    const [activeMobileTab, setActiveMobileTab] = useState<'edit' | 'preview'>('edit');

    if (!isOpen || !mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ zIndex: 'var(--z-modal-backdrop)' }}
            >
                <motion.div
                    className={styles.modal}
                    onClick={e => e.stopPropagation()}
                    style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column', zIndex: 'var(--z-modal)' }}
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.title}>
                            <h2><Layout size={20} /> Template Gallery</h2>
                        </div>
                        {/* Mobile Tabs */}
                        <div className={styles.mobileTabs}>
                            <button
                                className={`${styles.mobileTabBtn} ${activeMobileTab === 'edit' ? styles.mobileTabActive : ''}`}
                                onClick={() => setActiveMobileTab('edit')}
                            >
                                Browse
                            </button>
                            <button
                                className={`${styles.mobileTabBtn} ${activeMobileTab === 'preview' ? styles.mobileTabActive : ''}`}
                                onClick={() => setActiveMobileTab('preview')}
                            >
                                Preview
                            </button>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                    </div>

                    {/* Search Bar (Mobile only visible in Browse tab or Desktop always) */}
                    <div className={styles.searchBarContainer}>
                        <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }} />
                        <input
                            className="input-field"
                            style={{ paddingLeft: 32, width: '100%' }} // Full width
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Body */}
                    <div className={styles.body} data-mobile-tab={activeMobileTab}>
                        {/* LEFT: Config Panel */}
                        <div className={`${styles.configPanel} ${activeMobileTab === 'preview' ? styles.hiddenOnMobile : ''}`}>
                            {/* Categories */}
                            <div className={styles.filterBar}>
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        className={`${styles.filterChip} ${activeCategory === cat ? styles.activeFilter : ''}`}
                                        onClick={() => setActiveCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Templates Grid */}
                            <div className={styles.grid}>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : filteredTemplates.map(t => (
                                    <div
                                        key={t.id}
                                        className={`${styles.card} ${selectedTemplateId === t.id ? styles.cardActive : ''}`}
                                        onClick={() => {
                                            setSelectedTemplateId(t.id);
                                            // Optional: Auto-switch to preview on mobile selection?
                                            // setActiveMobileTab('preview'); 
                                        }}
                                    >
                                        <span className={styles.cardEmoji}>
                                            {t.layoutType === 'minimal' ? '📝' :
                                                t.layoutType === 'card' ? '🃏' :
                                                    t.layoutType === 'banner' ? '🎨' : '✨'}
                                        </span>
                                        <div className={styles.cardName}>{t.name}</div>
                                        <div className={styles.cardMeta}>
                                            <span>{t.category || 'Custom'}</span>
                                        </div>
                                    </div>
                                ))}
                                {filteredTemplates.length === 0 && !loading && (
                                    <p style={{ color: 'var(--text-tertiary)', gridColumn: 'span 3' }}>No templates found.</p>
                                )}
                            </div>

                            {/* Theme Selector (Only loops if template selected) */}
                            {selectedTemplateId && (
                                <motion.div className={styles.themeSection} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                                    <div className={styles.sectionTitle}><Palette size={14} style={{ display: 'inline', marginRight: 6 }} /> Select Theme Style</div>
                                    <div className={styles.themeGrid}>
                                        {themes.map(th => (
                                            <button
                                                key={th.id}
                                                className={`${styles.themeBtn} ${selectedThemeId === th.id ? styles.themeActive : ''}`}
                                                style={{ background: `linear-gradient(135deg, ${th.primaryColor} 50%, ${th.backgroundColor} 50%)` }}
                                                onClick={() => setSelectedThemeId(th.id)}
                                                title={th.name}
                                            />
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-tertiary)' }}>
                                        Selected: <strong>{selectedTheme?.name}</strong>
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* RIGHT: Preview Panel */}
                        <div className={`${styles.previewPanel} ${activeMobileTab === 'edit' ? styles.hiddenOnMobile : ''}`}>
                            {selectedTemplate ? (
                                <div className={styles.mobilePreviewContainer}>
                                    <EmailPreview
                                        layout={selectedTemplate.layoutType}
                                        data={{
                                            eventTitle: 'Product Launch',
                                            eventTime: 'Tomorrow at 10:00 AM',
                                            eventLocation: 'Main Hall',
                                            message: previewMessage,
                                            recipientName: 'Alex'
                                        }}
                                        theme={selectedTheme ? {
                                            primaryColor: selectedTheme.primaryColor,
                                            secondaryColor: selectedTheme.secondaryColor,
                                            backgroundColor: selectedTheme.backgroundColor,
                                            textColor: selectedTheme.textColor,
                                            borderRadius: selectedTheme.borderRadius
                                        } : undefined}
                                        height={600} // This might need to be responsive or '100%'
                                    />
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <Sparkles size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                                    <p>Select a template to view preview</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.footer}>
                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            className="btn-primary"
                            disabled={!selectedTemplateId}
                            onClick={handleApply}
                            style={{ minWidth: 120 }}
                        >
                            <Check size={16} /> Apply Style
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
