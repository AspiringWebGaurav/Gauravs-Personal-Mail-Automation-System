'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore as useAuth } from '@/store/authStore';

import { useAppStore } from '@/stores/appStore';
import { getTemplates } from '@/services/templateService';

import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, ArrowLeft, ArrowRight, Palette, Clock, MapPin, AlignLeft, User, Users, Mail, AlertTriangle, Zap, Send } from 'lucide-react';
import Link from 'next/link';
import type { EmailTemplate } from '@/types';
import { getVariableUILabel, extractTemplateVariables } from '@/utils/templateUtils';
import styles from './CreatePage.module.css';



/* ── Type definitions for the modular create flow ── */
type CreateType = 'event' | 'send_mail' | 'important_mail' | 'custom_send';

interface CreateTypeConfig {
    id: CreateType;
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
}

const CREATE_TYPES: CreateTypeConfig[] = [
    {
        id: 'event',
        icon: <CalendarPlus size={24} />,
        label: 'Event',
        description: 'Schedule an event with reminders',
        color: '#6c5ce7',
    },
    {
        id: 'send_mail',
        icon: <Mail size={24} />,
        label: 'Send Mail',
        description: 'Quick email with scheduling',
        color: '#00d2ff',
    },
    {
        id: 'important_mail',
        icon: <Zap size={24} />,
        label: 'Important Mail',
        description: 'Priority email with urgent templates',
        color: '#ff4757',
    },
    {
        id: 'custom_send',
        icon: <Users size={24} />,
        label: 'Custom Send Mode',
        description: 'Flexible sends with granular control',
        color: '#fdcb6e', // Gold/Orange
    },
];

/* ── Scheduling mode types ── */
type ScheduleMode = 'before_event' | 'exact_time';

export default function CreatePage() {
    const { user } = useAuth();
    const router = useRouter();
    const showToast = useAppStore((s) => s.showToast);

    // Type Selection
    const [selectedType, setSelectedType] = useState<CreateType | null>(null);

    // Steps: 1 = Details, 2 = Communication & Design
    const [step, setStep] = useState(1);

    // Form State — Event
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');


    // Form State — Mail
    const [subject, setSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');

    // Comm State
    const [recipientEmail, setRecipientEmail] = useState('');

    // Scheduling State (refactored — no hard 10-min restriction)
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('before_event');
    const [reminderTiming, setReminderTiming] = useState(10);
    const [exactDate, setExactDate] = useState('');
    const [exactTime, setExactTime] = useState('');
    const [pastTimeWarning, setPastTimeWarning] = useState(false);

    // Design State
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const [reminderVars, setReminderVars] = useState<Record<string, string>>({});

    // Data for lookup
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [saving, setSaving] = useState(false);
    const submitLockRef = useRef(false); // Hard lock — survives React re-renders

    // Pre-fill email
    useEffect(() => {
        if (user && !recipientEmail) setRecipientEmail(user.email || '');
    }, [user, recipientEmail]);

    // Auto-fill variables when template changes
    useEffect(() => {
        if (!selectedTemplateId) {
            setReminderVars({});
            return;
        }

        const template = templates.find(t => t.id === selectedTemplateId);
        if (template?.messageBody) {
            const vars = extractTemplateVariables(template.messageBody);
            const initialVars: Record<string, string> = {};
            vars.forEach(v => { initialVars[v] = ''; });
            setReminderVars(initialVars);
        } else {
            setReminderVars({});
        }
    }, [selectedTemplateId, templates]);

    // Load templates for names
    useEffect(() => {
        if (!user) return;
        getTemplates(user.uid).then(tpls => {
            const userTpls = tpls.filter(t => !t.id.startsWith('sys_'));
            setTemplates(userTpls);
            if (userTpls.length > 0) setSelectedTemplateId(userTpls[0].id);
        });
    }, [user]);

    // Auto-select urgent template if applicable
    useEffect(() => {
        if (selectedType === 'important_mail' && templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
        } else if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [selectedType, templates]);

    // Past-time validation for exact scheduling
    useEffect(() => {
        if (scheduleMode !== 'exact_time' || !exactDate || !exactTime) {
            setPastTimeWarning(false);
            return;
        }
        const scheduled = new Date(`${exactDate}T${exactTime}`);
        setPastTimeWarning(scheduled < new Date());
    }, [scheduleMode, exactDate, exactTime]);

    // Derived Selection Display


    const isMailType = selectedType === 'send_mail' || selectedType === 'important_mail' || selectedType === 'custom_send';

    const handleNext = () => {
        if (isMailType) {
            if (!subject) {
                showToast('Please enter a subject.', 'error');
                return;
            }
        } else {
            if (!title || !startDate || !startTime || !endDate || !endTime) {
                showToast('Please fill in all required fields.', 'error');
                return;
            }
            const start = new Date(`${startDate}T${startTime}`);
            const end = new Date(`${endDate}T${endTime}`);
            if (end <= start) {
                showToast('End time must be after start time', 'error');
                return;
            }
        }
        setStep(2);
    };

    const computeScheduledTime = useCallback((): Date => {
        if (isMailType) {
            if (scheduleMode === 'exact_time' && exactDate && exactTime) {
                return new Date(`${exactDate}T${exactTime}`);
            }
            // For mail types with "before_event" mode, send immediately
            return new Date(Date.now() + reminderTiming * 60000);
        }
        // Event type
        const start = new Date(`${startDate}T${startTime}`);
        if (scheduleMode === 'exact_time' && exactDate && exactTime) {
            return new Date(`${exactDate}T${exactTime}`);
        }
        return new Date(start.getTime() - reminderTiming * 60000);
    }, [isMailType, scheduleMode, exactDate, exactTime, startDate, startTime, reminderTiming]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user || saving) return;

        // ── Hard submit lock — survives React re-renders ──
        if (submitLockRef.current) return;
        submitLockRef.current = true;

        // ── Email validation (Only if explicit recipient is set) ──
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (recipientEmail && !emailRegex.test(recipientEmail)) {
            showToast('Please enter a valid email address', 'error');
            submitLockRef.current = false;
            return;
        }

        setSaving(true);

        try {
            const scheduledTime = computeScheduledTime();
            // Prepare Payload
            const payload = {
                title: isMailType ? (subject || 'Mail') : title,
                description: isMailType ? (messageBody || '') : description,
                location: location || '',
                startTime: isMailType ? scheduledTime.toISOString() : `${startDate}T${startTime}:00`,
                endTime: isMailType ? new Date(scheduledTime.getTime() + 60000).toISOString() : `${endDate}T${endTime}:00`,
                isMailType: isMailType,
                messageBody: messageBody,
                subject: subject,
                recipientEmail: recipientEmail,
                reminderTiming: reminderTiming,
                customMessage: Object.keys(reminderVars).length > 0 ? JSON.stringify(reminderVars) : undefined,
                // Timezone could be passed here if collected
            };

            const token = await user?.getIdToken();
            const res = await fetch('/api/event/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to create event');
            }

            showToast('Created successfully! Hang tight, dispatching invites...', 'success');

            // Redirect
            router.push(`/events/${data.eventId}`);

        } catch (err) {
            console.error(err);
            showToast(err instanceof Error ? err.message : 'Failed to create event', 'error');
        } finally {
            setSaving(false);
            submitLockRef.current = false;
        }
    };

    /* ── Step 0: Type Selector ── */
    if (!selectedType) {
        return (
            <div className="page-container">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={styles.topBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}><ArrowLeft size={18} /></Link>
                        <h1 className="page-title">Create New</h1>
                    </div>
                </motion.div>

                <motion.p
                    className={styles.typeSubtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    What would you like to create?
                </motion.p>

                <div className={styles.typeGrid}>
                    {CREATE_TYPES.map((type, i) => (
                        <motion.button
                            key={type.id}
                            className={styles.typeCard}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.08 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedType(type.id)}
                        >
                            <div className={styles.typeCardIcon} style={{ background: `${type.color}18`, color: type.color }}>
                                {type.icon}
                            </div>
                            <div className={styles.typeCardContent}>
                                <span className={styles.typeCardLabel}>{type.label}</span>
                                <span className={styles.typeCardDesc}>{type.description}</span>
                            </div>
                            <ArrowRight size={16} className={styles.typeCardChevron} />
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    /* ── Step 1 & 2: Form ── */
    const currentTypeConfig = CREATE_TYPES.find(t => t.id === selectedType)!;
    const totalSteps = 2;

    return (
        <div className="page-container">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={styles.topBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', flexShrink: 0, padding: 0 }}
                        onClick={() => step === 1 ? setSelectedType(null) : setStep(1)}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ fontSize: 'var(--text-lg)' }}>{currentTypeConfig.label}</h1>
                    </div>
                </div>
                {/* Stepper Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {i > 0 && <div style={{ width: 20, height: 2, background: 'var(--border-color)' }} />}
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: step >= i + 1 ? 'var(--primary-color)' : 'var(--border-color)' }} />
                        </div>
                    ))}
                </div>
            </motion.div>

            <AnimatePresence mode='wait'>
                {step === 1 ? (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={styles.form}
                    >
                        {/* ── Event Details ── */}
                        {!isMailType && (
                            <>
                                <h2 className={styles.sectionTitle}><AlignLeft size={18} /> Event Details</h2>

                                <div className={styles.field}>
                                    <label className="label">Event Title</label>
                                    <input className="input-field" placeholder="e.g. Q4 Strategy Meeting" value={title} onChange={e => setTitle(e.target.value)} autoFocus required />
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label className="label"><Clock size={14} /> Start</label>
                                        <div className={styles.inputGroup}>
                                            <input className="input-field" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} onClick={(e) => e.currentTarget.showPicker()} required />
                                            <input className="input-field" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label className="label">End</label>
                                        <div className={styles.inputGroup}>
                                            <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
                                            <input className="input-field" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label className="label"><MapPin size={14} /> Location (Optional)</label>
                                    <input className="input-field" placeholder="e.g. Conference Room A" value={location} onChange={e => setLocation(e.target.value)} />
                                </div>

                                <div className={styles.field}>
                                    <label className="label">Description (Optional)</label>
                                    <textarea className={`input-field ${styles.textarea}`} placeholder="Add agenda or details..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                                </div>

                            </>
                        )}

                        {/* ── Mail Details ── */}
                        {isMailType && (
                            <>
                                <h2 className={styles.sectionTitle}>
                                    {selectedType === 'important_mail' ? <><Zap size={18} /> Priority Mail</> :
                                        selectedType === 'custom_send' ? <><Users size={18} /> Custom Send Mode</> :
                                            <><Send size={18} /> Compose Mail</>}
                                </h2>

                                <div className={styles.field}>
                                    <label className="label">Subject</label>
                                    <input className="input-field" placeholder="e.g. Monthly Report Reminder" value={subject} onChange={e => setSubject(e.target.value)} autoFocus required />
                                </div>

                                <div className={styles.field}>
                                    <label className="label">Message (Optional)</label>
                                    <textarea className={`input-field ${styles.textarea}`} placeholder="Write your message..." value={messageBody} onChange={e => setMessageBody(e.target.value)} rows={4} />
                                </div>

                            </>
                        )}

                        <div className={styles.actions}>
                            <button className="btn-primary" onClick={handleNext} style={{ width: '100%' }}>
                                Next: Schedule & Design <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={styles.form}
                    >
                        <h2 className={styles.sectionTitle}><User size={18} /> Recipients & Schedule</h2>

                        <div className={styles.field}>
                            <label className="label">Sending To</label>
                            <input className="input-field" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} required />
                            <span className={styles.hint}>Currently limited to single recipient</span>
                        </div>

                        {/* ── Scheduling Section ── */}
                        <div className={styles.scheduleSection}>
                            <label className="label"><Clock size={14} /> Schedule</label>
                            <div className={styles.scheduleToggle}>
                                <button
                                    className={`${styles.scheduleBtn} ${scheduleMode === 'before_event' ? styles.scheduleBtnActive : ''}`}
                                    onClick={() => setScheduleMode('before_event')}
                                >
                                    {isMailType ? 'Delay' : 'Before Event'}
                                </button>
                                <button
                                    className={`${styles.scheduleBtn} ${scheduleMode === 'exact_time' ? styles.scheduleBtnActive : ''}`}
                                    onClick={() => setScheduleMode('exact_time')}
                                >
                                    Exact Time
                                </button>
                            </div>

                            {scheduleMode === 'before_event' ? (
                                <select className="input-field" value={reminderTiming} onChange={e => setReminderTiming(Number(e.target.value))}>
                                    <option value={0}>Immediately / At event start</option>
                                    <option value={5}>5 minutes {isMailType ? 'delay' : 'before start'}</option>
                                    <option value={10}>10 minutes {isMailType ? 'delay' : 'before start'}</option>
                                    <option value={15}>15 minutes {isMailType ? 'delay' : 'before start'}</option>
                                    <option value={30}>30 minutes {isMailType ? 'delay' : 'before start'}</option>
                                    <option value={60}>1 hour {isMailType ? 'delay' : 'before start'}</option>
                                    <option value={1440}>1 day {isMailType ? 'delay' : 'before start'}</option>
                                </select>
                            ) : (
                                <div className={styles.inputGroup}>
                                    <input className="input-field" type="date" value={exactDate} onChange={e => setExactDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} />
                                    <input className="input-field" type="time" value={exactTime} onChange={e => setExactTime(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} />
                                </div>
                            )}

                            {/* Soft past-time warning */}
                            {pastTimeWarning && (
                                <motion.div
                                    className={styles.warningBanner}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                >
                                    <AlertTriangle size={14} />
                                    <span>This time is in the past — the email will be sent immediately</span>
                                </motion.div>
                            )}
                        </div>

                        {/* Template Selection */}
                        <div className={styles.field}>
                            <label className="label"><Palette size={14} /> Email Template</label>
                            <select className="input-field" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.category || 'Custom'})</option>
                                ))}
                            </select>
                        </div>

                        {/* Dynamic Variables (Mode A) */}
                        {Object.keys(reminderVars).length > 0 && (
                            <div style={{ marginTop: '1.25rem', background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Template Variables
                                </h4>
                                {Object.keys(reminderVars).map(key => (
                                    <div key={key} className={styles.field} style={{ marginBottom: '12px' }}>
                                        <label className="label">{getVariableUILabel(key)} <span style={{ color: '#ef4444' }}>*</span></label>
                                        {key === 'custom_message' || key === 'custom_note' ? (
                                            <textarea
                                                className="input-field"
                                                value={reminderVars[key]}
                                                onChange={e => setReminderVars(prev => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={`Enter ${getVariableUILabel(key).toLowerCase()}...`}
                                                rows={3}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={reminderVars[key]}
                                                onChange={e => setReminderVars(prev => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={`Enter ${getVariableUILabel(key).toLowerCase()}...`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.actions} style={{ display: 'flex', gap: 12 }}>
                            <button className="btn-secondary" onClick={() => setStep(1)} disabled={saving}>
                                Back
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => handleSubmit()}
                                disabled={saving || Object.values(reminderVars).some(v => !v.trim())}
                                style={{ flex: 1 }}
                            >
                                {saving ? 'Creating...' : (
                                    <>
                                        {isMailType ? <Send size={18} /> : <CalendarPlus size={18} />}
                                        {isMailType ? ' Schedule Mail' : ' Create Event'}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
