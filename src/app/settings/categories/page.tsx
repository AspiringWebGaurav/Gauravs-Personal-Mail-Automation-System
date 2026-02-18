'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getCategories, createCategory, deleteCategory } from '@/services/categoryService';
import { useAppStore } from '@/stores/appStore';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Tag } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/types';
import { AuthGuard } from '@/components/AuthGuard';
import LoginScreen from '@/components/LoginScreen';
import { AppShell } from '@/components/layout/AppShell';
import styles from './categories.module.css';

function CategoriesContent() {
    const { user } = useAuth();
    const showToast = useAppStore((s) => s.showToast);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6c5ce7');

    const load = useCallback(async () => {
        if (!user) return;
        const items = await getCategories(user.uid);
        setCategories(items);
        setLoading(false);
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!user || !name) return;
        try {
            await createCategory({ name, color, icon: '📌', createdBy: user.uid });
            showToast('Category created', 'success');
            setName('');
            load();
        } catch {
            showToast('Failed to create category', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCategory(id);
            showToast('Category deleted', 'success');
            load();
        } catch {
            showToast('Failed to delete', 'error');
        }
    };

    return (
        <div className="page-container">
            <div className={styles.topBar}>
                <Link href="/settings" className={styles.backBtn}><ArrowLeft size={20} /></Link>
                <h1 className="page-title">Categories</h1>
            </div>

            <div className={styles.createRow}>
                <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name..." style={{ flex: 1 }} />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className={styles.colorPick} />
                <button className="btn-primary" onClick={handleCreate} style={{ padding: '8px 16px' }}>
                    <Plus size={16} />
                </button>
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-lg)' }} />
            ) : categories.length === 0 ? (
                <div className={styles.empty}>
                    <Tag size={32} strokeWidth={1.5} />
                    <p>No categories yet</p>
                </div>
            ) : (
                <motion.div className={styles.list} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {categories.map((c) => (
                        <div key={c.id} className={`card ${styles.catCard}`}>
                            <div className={styles.catColor} style={{ background: c.color }} />
                            <span className={styles.catName}>{c.name}</span>
                            <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

export default function CategoriesPage() {
    return (
        <AuthGuard fallback={<LoginScreen />}>
            <AppShell>
                <CategoriesContent />
            </AppShell>
        </AuthGuard>
    );
}
