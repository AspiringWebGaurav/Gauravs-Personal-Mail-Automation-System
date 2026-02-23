'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LogOut, ChevronRight, AlertOctagon, Server, Activity, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { AuthService } from '@/services/authService';
import { useSystemControl } from '@/providers/SystemControlProvider';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import styles from './SettingsPage.module.css';

export default function SettingsPageFixed() {
    const { user } = useAuthStore();
    const { isSystemHalted } = useSystemControl();

    const [toggling, setToggling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleLogout = async () => {
        await AuthService.logout();
    };

    const handleConfirmToggle = async () => {
        setShowConfirm(false);
        setToggling(true);
        try {
            const mod = await import('@/services/participantServiceFixed');
            await mod.toggleEmergencyStop(!isSystemHalted);
        } catch (e) {
            console.error('Failed to toggle emergency stop:', e);
            alert('Failed to toggle system state.');
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className={styles.container}>
            <motion.div className={styles.header} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                    <ArrowLeft size={18} />
                </Link>
                <h1 className="page-title" style={{ margin: 0 }}>Settings</h1>
            </motion.div>

            <motion.div
                className={styles.systemsGrid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
                {/* User Profile Summary */}
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{user?.displayName || 'Admin User'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
                    </div>
                </div>

                {/* System Controls */}
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        System Control
                    </div>

                    <Link href="/providers" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }} className="settings-row-hover">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.6rem', borderRadius: '8px' }}>
                                    <Server size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>Email Providers</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manage sending capabilities</div>
                                </div>
                            </div>
                            <ChevronRight size={18} color="var(--text-tertiary)" />
                        </div>
                    </Link>

                    <Link href="/tracker" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }} className="settings-row-hover">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.6rem', borderRadius: '8px' }}>
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>Transaction Tracker</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System execution logs</div>
                                </div>
                            </div>
                            <ChevronRight size={18} color="var(--text-tertiary)" />
                        </div>
                    </Link>

                    {/* Emergency Stop (Danger Zone) */}
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', fontWeight: 600, fontSize: '0.9rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertOctagon size={16} /> Danger Zone
                    </div>
                    <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSystemHalted ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.02)', border: isSystemHalted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent', transition: 'all 0.3s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ background: isSystemHalted ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: isSystemHalted ? '#fff' : '#ef4444', padding: '0.75rem', borderRadius: '12px', transition: 'all 0.3s ease', boxShadow: isSystemHalted ? '0 0 15px rgba(239,68,68,0.4)' : 'none' }}>
                                <AlertOctagon size={24} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isSystemHalted ? '#ef4444' : 'var(--text-primary)', marginBottom: '4px' }}>HALT SYSTEM</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: 1.4 }}>
                                    {isSystemHalted ? 'System is currently HALTED. No automated emails are being sent.' : 'Globally suspend all automated email dispatches immediately.'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                            {isSystemHalted && (
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '6px', letterSpacing: '0.1em' }}>
                                    CRITICAL HALT ACTIVE
                                </div>
                            )}
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={toggling}
                                style={{
                                    appearance: 'none',
                                    position: 'relative',
                                    width: '64px',
                                    height: '32px',
                                    borderRadius: '99px',
                                    background: isSystemHalted ? '#ef4444' : 'var(--bg-tertiary)',
                                    border: isSystemHalted ? '2px solid transparent' : '2px solid var(--border)',
                                    cursor: toggling ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: toggling ? 0.7 : 1,
                                    outline: 'none',
                                    boxShadow: isSystemHalted ? '0 0 10px rgba(239,68,68,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: isSystemHalted ? 'calc(100% - 26px)' : '2px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: '#fff',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                <motion.button
                    className="card"
                    onClick={handleLogout}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    whileTap={{ scale: 0.97, backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.5)' }}
                    transition={{ duration: 0.2 }}
                    style={{ padding: '1.25rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'transparent', cursor: 'pointer', marginTop: '1rem', fontWeight: 600, outline: 'none' }}
                >
                    <LogOut size={18} />
                    Sign Out
                </motion.button>
            </motion.div>

            <ConfirmModal
                isOpen={showConfirm}
                title={isSystemHalted ? 'Resume System?' : 'EMERGENCY STOP'}
                message={isSystemHalted
                    ? 'This will instantly resume all automated email sending globally. Are you sure?'
                    : 'This will INSTANTLY HALT all automated email sending globally. Use only in actual emergencies. Proceed?'
                }
                confirmText={isSystemHalted ? 'Resume System' : 'HALT SYSTEM'}
                onConfirm={handleConfirmToggle}
                onClose={() => setShowConfirm(false)}
                isDanger={!isSystemHalted}
            />

            <style jsx>{`
                .settings-row-hover {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @media (hover: hover) {
                    .settings-row-hover:hover {
                        background-color: var(--bg-tertiary);
                    }
                }
                .settings-row-hover:active {
                    background-color: var(--bg-elevated);
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
}
