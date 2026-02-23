'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Edit3, Trash2, LayoutTemplate, AlertCircle, Send, X, Eye } from 'lucide-react';
import Link from 'next/link';
import type { EmailTemplate } from '@/types';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/services/templateService';
import { useAuthStore as useAuth } from '@/store/authStore';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { extractTemplateVariables, renderEmailTemplate } from '@/lib/emailTemplateRenderer';
import { getVariableUILabel } from '@/utils/templateUtils';
import { useAppStore } from '@/stores/appStore';
import styles from './TemplatesPage.module.css';

export default function TemplatesPage() {
    const { user } = useAuth();
    const showToast = useAppStore(s => s.showToast);

    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState<'list' | 'edit'>('list');
    const [editId, setEditId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [isSystem, setIsSystem] = useState(false);

    // Quick Send State (Mode B)
    const [quickSendTpl, setQuickSendTpl] = useState<EmailTemplate | null>(null);
    const [quickSendVars, setQuickSendVars] = useState<Record<string, string>>({});
    const [targetEmail, setTargetEmail] = useState('');
    const [sendingQuick, setSendingQuick] = useState(false);

    const loadTemplates = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const tpls = await getTemplates(user.uid);
            // Filter out old sys_templates if any stuck around, we only want user templates now
            setTemplates(tpls.filter(t => !t.id.startsWith('sys_')));
        } catch (e) {
            console.error(e);
            showToast('Failed to load templates', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        if (!user) return;
        loadTemplates();
    }, [user, loadTemplates]);

    const handleCreateNew = () => {
        setEditId(null);
        setName('');
        setCategory('General');
        setSubject('{{event_title}}');
        setBody('Hello {{recipient_name}},\n\nYour event "{{event_title}}" is happening at {{event_time}}.\n\n{{custom_message}}\n\nRegards,\nTeam');
        setPreviewMode(false);
        setIsSystem(false);
        setView('edit');
    };

    const handleEdit = (tpl: EmailTemplate) => {
        setEditId(tpl.id);
        setName(tpl.name);
        setCategory(tpl.category || 'General');
        setSubject(tpl.subjectFormat);
        setBody(tpl.messageBody);
        setIsSystem(tpl.isSystem || false);
        setPreviewMode(tpl.isSystem || false); // Force preview mode initially for system templates
        setView('edit');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await deleteTemplate(id);
            showToast('Template deleted', 'success');
            loadTemplates();
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    const handleOpenQuickSend = (tpl: EmailTemplate) => {
        setQuickSendTpl(tpl);
        const vars = extractTemplateVariables(tpl.messageBody);
        const initialVars: Record<string, string> = {};
        vars.forEach(v => initialVars[v] = '');
        setQuickSendVars(initialVars);
        setTargetEmail('');
    };

    const handleExecuteQuickSend = async () => {
        if (!targetEmail) return showToast('Recipient email is required', 'error');
        const varsObj = Object.entries(quickSendVars);
        for (const [key, val] of varsObj) {
            if (!val.trim()) return showToast(`Field "${getVariableUILabel(key)}" is required.`, 'error');
        }

        setSendingQuick(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch('/api/email/quick-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    toEmail: targetEmail,
                    subjectFormat: quickSendTpl!.subjectFormat,
                    messageBody: quickSendTpl!.messageBody,
                    variables: quickSendVars
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to send');
            }

            showToast('Email sent successfully!', 'success');
            setQuickSendTpl(null);
        } catch (e: unknown) {
            // The original code had `e.message` directly.
            // To be faithful to the instruction and handle `unknown` type,
            // we need to safely extract the message.
            // The instruction's `setError` is not defined in this context, so it's omitted.
            // The instruction's `Error applying theme` is not relevant to this context,
            // so we derive the message from the error itself.
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error(e); // Keep original console.error
            showToast(`Error: ${errorMessage}`, 'error');
        } finally {
            setSendingQuick(false);
        }
    };

    const handleSave = async () => {
        if (!name || !subject || !body) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        const requiredVars = extractTemplateVariables(body);
        if (requiredVars.length === 0) {
            showToast('Template must contain at least one dynamic variable (e.g. {{name}})', 'error');
            return;
        }

        setSaving(true);
        try {
            if (editId) {
                await updateTemplate(editId, {
                    name,
                    category,
                    subjectFormat: subject,
                    messageBody: body,
                    layoutType: 'dynamic', // fallback type
                });
                showToast('Template updated', 'success');
            } else {
                await createTemplate({
                    name,
                    category,
                    subjectFormat: subject,
                    messageBody: body,
                    layoutType: 'dynamic',
                    createdBy: user!.uid,
                });
                showToast('Template created', 'success');
            }
            setView('list');
            loadTemplates();
        } catch (e) {
            console.error(e);
            showToast('Failed to save template', 'error');
        } finally {
            setSaving(false);
        }
    };

    const detectedVars = useMemo(() => extractTemplateVariables(body), [body]);

    if (loading) return <GlobalLoader variant="overlay" />;

    return (
        <div className={styles.container}>
            <motion.div className={styles.header} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className={styles.headerRow}>
                    <Link href="/" className={styles.backBtn}>
                        <ArrowLeft size={18} />
                    </Link>
                    <h1 className={styles.title}>Templates</h1>
                </div>
                <p className={styles.subtitle}>
                    Manage dynamic email templates.
                </p>
            </motion.div>

            <AnimatePresence mode="wait">
                {view === 'list' ? (
                    <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={styles.body}>
                        {templates.length === 0 ? (
                            <div className={styles.emptyState}>
                                <LayoutTemplate size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                                <p>No Templates Yet — Create Your First Template</p>
                                <button className="btn-primary" onClick={handleCreateNew}>
                                    <Plus size={18} /> Create Template
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={styles.listHeader}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Your Templates</h2>
                                    <button className="btn-primary" onClick={handleCreateNew} style={{ padding: '6px 16px', fontSize: '0.9rem' }}>
                                        <Plus size={16} /> New Template
                                    </button>
                                </div>
                                <div className={styles.grid}>
                                    {templates.map(t => (
                                        <div key={t.id} className={styles.card}>
                                            <div className={styles.cardInfo}>
                                                <div className={styles.cardName}>{t.name}</div>
                                                <div className={styles.cardMeta}>
                                                    <span>{t.category || 'General'}</span>
                                                    <span>•</span>
                                                    <span>{new Date(t.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className={styles.cardActions}>
                                                <button className={styles.actionBtn} onClick={() => handleOpenQuickSend(t)} title="Quick Send">
                                                    <Send size={18} />
                                                </button>
                                                {!t.isSystem ? (
                                                    <button className={styles.actionBtn} onClick={() => handleEdit(t)} title="Edit">
                                                        <Edit3 size={18} />
                                                    </button>
                                                ) : (
                                                    <button className={styles.actionBtn} onClick={() => handleEdit(t)} title="Preview Template">
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                                {!t.isSystem && (
                                                    <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(t.id)} title="Delete">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.editForm}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                            {isSystem ? 'Preview System Template' : editId ? 'Edit Template' : 'Create Template'}
                        </h2>

                        <div className={styles.fieldGroup}>
                            <label>Template Name</label>
                            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Newsletter" required disabled={isSystem} />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label>Category</label>
                            <input className="input-field" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Marketing, Update" disabled={isSystem} />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label>Subject Format (Supports Variables)</label>
                            <input className="input-field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Update: {{event_title}}" required disabled={isSystem} />
                        </div>

                        <div className={styles.fieldGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>Body (HTML Supported)</label>
                                <div className={styles.tabToggle}>
                                    <button onClick={() => setPreviewMode(false)} className={!previewMode ? styles.activeTab : styles.inactiveTab}>Logic</button>
                                    <button onClick={() => setPreviewMode(true)} className={previewMode ? styles.activeTab : styles.inactiveTab}>Preview</button>
                                </div>
                            </div>
                            {!previewMode ? (
                                <textarea className="input-field" style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '13px' }} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your dynamic email template here..." required disabled={isSystem} />
                            ) : (
                                <div className={styles.previewContainer}>
                                    <iframe
                                        title="Email Preview"
                                        srcDoc={renderEmailTemplate(body, detectedVars.reduce((acc, v) => ({ ...acc, [v]: `[${getVariableUILabel(v)}]` }), {}))}
                                        style={{ width: '100%', height: '400px', border: 'none', background: '#f1f5f9' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className={`${styles.variablesBox} ${detectedVars.length === 0 ? styles.error : ''}`}>
                            <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {detectedVars.length === 0 ? <AlertCircle size={14} color="#ef4444" /> : <LayoutTemplate size={14} />}
                                Detected Variables
                            </div>
                            {detectedVars.length > 0 ? (
                                <div>
                                    {detectedVars.map(v => (
                                        <span key={v} className={styles.varChip}>{`{{${v}}}`}</span>
                                    ))}
                                    <p style={{ marginTop: '8px', color: 'var(--text-tertiary)' }}>These fields will be required when scheduling emails with this template.</p>
                                </div>
                            ) : (
                                <p style={{ color: '#ef4444', margin: 0 }}>No variables detected. You must use at least one variable like {"{{name}}"} to make this dynamic.</p>
                            )}
                        </div>

                        <div className={styles.formActions}>
                            <button className="btn-secondary" onClick={() => setView('list')} disabled={saving}>
                                {isSystem ? 'Close' : 'Cancel'}
                            </button>
                            {!isSystem && (
                                <button className="btn-primary" onClick={handleSave} disabled={saving || detectedVars.length === 0}>
                                    {saving ? 'Saving...' : 'Save Template'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Send Modal (Mode B) */}
            <AnimatePresence>
                {quickSendTpl && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !sendingQuick && setQuickSendTpl(null)}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '500px', width: '90%' }}
                        >
                            <div className={styles.modalHeader}>
                                <h2>Quick Send: {quickSendTpl.name}</h2>
                                <button className={styles.closeBtn} onClick={() => setQuickSendTpl(null)} disabled={sendingQuick}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className={styles.fieldGroup}>
                                    <label>Recipient Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="e.g. john@example.com"
                                        value={targetEmail}
                                        onChange={e => setTargetEmail(e.target.value)}
                                        disabled={sendingQuick}
                                    />
                                </div>

                                <div style={{ margin: '1.5rem 0', height: '1px', background: 'var(--border)' }} />

                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Template Variables
                                </h3>

                                {Object.keys(quickSendVars).length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                        No dynamic variables required for this template.
                                    </p>
                                ) : (
                                    Object.keys(quickSendVars).map(key => (
                                        <div key={key} className={styles.fieldGroup} style={{ marginBottom: '1rem' }}>
                                            <label>{getVariableUILabel(key)} <span style={{ color: '#ef4444' }}>*</span></label>
                                            {key === 'custom_message' || key === 'custom_note' ? (
                                                <textarea
                                                    className="input-field"
                                                    value={quickSendVars[key]}
                                                    onChange={e => setQuickSendVars(prev => ({ ...prev, [key]: e.target.value }))}
                                                    placeholder={`Enter ${getVariableUILabel(key).toLowerCase()}...`}
                                                    disabled={sendingQuick}
                                                    style={{ minHeight: '80px' }}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={quickSendVars[key]}
                                                    onChange={e => setQuickSendVars(prev => ({ ...prev, [key]: e.target.value }))}
                                                    placeholder={`Enter ${getVariableUILabel(key).toLowerCase()}...`}
                                                    disabled={sendingQuick}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className={styles.modalFooter}>
                                <button className="btn-secondary" onClick={() => setQuickSendTpl(null)} disabled={sendingQuick}>
                                    Cancel
                                </button>
                                <button className="btn-primary" onClick={handleExecuteQuickSend} disabled={sendingQuick}>
                                    {sendingQuick ? 'Dispatching...' : 'Send Immediately'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
