'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { authAPI, backendAPI } from '@/shared/services/api';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, Map, MessageSquare, Star, BarChart2, LogOut, Search, Plus, Trash2, Edit, X } from 'lucide-react';
import styles from '@/styles/Admin.module.css';

const AdminPage: React.FC = () => {
    const router = useRouter();
    const { user, isAdmin, logout } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState<'users' | 'treks' | 'communities' | 'reviews'>('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [users, setUsers] = useState<any[]>([]);
    const [treks, setTreks] = useState<any[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState<any>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !isAdmin) {
            if (user && !isAdmin) router.push('/');
            return;
        }

        // Helper for Realtime Updates
        const handleRtUpdate = (type: string, payload: any) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            const updateFn = (prev: any[]) => {
                if (eventType === 'INSERT') return [newRecord, ...prev];
                if (eventType === 'DELETE') return prev.filter(i => i.id !== oldRecord.id);
                if (eventType === 'UPDATE') return prev.map(i => i.id === newRecord.id ? newRecord : i);
                return prev;
            };
            if (type === 'profiles') setUsers(updateFn);
            if (type === 'treks') setTreks(updateFn);
            if (type === 'communities') setCommunities(updateFn);
            if (type === 'reviews') setReviews(updateFn);
        };

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Parallel fetch for dashboard, or just fetch active tab if optimization needed
                // For this demo, we fetch all to populate stats instantly
                const [u, t, c, r] = await Promise.all([
                    (backendAPI as any).getUsers?.() || [],
                    (backendAPI as any).getTreks?.() || [],
                    (backendAPI as any).getCommunities?.() || [],
                    (backendAPI as any).getReviews?.() || []
                ]);
                setUsers(u);
                setTreks(t);
                setCommunities(c);
                setReviews(r);
            } catch (e) {
                console.error("Failed to load admin data", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();

        // Realtime Subscriptions
        const channel = supabase.channel('admin_dashboard_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (p) => handleRtUpdate('profiles', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'treks' }, (p) => handleRtUpdate('treks', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, (p) => handleRtUpdate('communities', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (p) => handleRtUpdate('reviews', p))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isAdmin]);

    if (!user || !isAdmin) return null;

    // Handlers
    const deleteItem = async (id: string, type: string) => {
        try {
            if (type === 'user') await backendAPI.deleteUser!(id);
            if (type === 'trek') await backendAPI.deleteTrek!(id);
            if (type === 'community') await backendAPI.deleteCommunity!(id);
            if (type === 'review') await backendAPI.deleteReview!(id);

            // Refresh local state
            if (type === 'user') setUsers(prev => prev.filter(u => u.id !== id));
            if (type === 'trek') setTreks(prev => prev.filter(t => t.id !== id));
            if (type === 'community') setCommunities(prev => prev.filter(c => c.id !== id));
            if (type === 'review') setReviews(prev => prev.filter(r => r.id !== id));
        } catch (e: any) {
            console.error("Delete failed", e);
            alert(`Failed to delete ${type}: ${e.message}`);
        }
    };

    const handleDelete = (id: string, type: string) => {
        if (type === 'user') {
            const userToDelete = users.find(u => u.id === id);
            // Check if user is an admin and if they are the last one
            if (userToDelete?.role === 'admin') {
                const adminCount = users.filter(u => u.role === 'admin').length;
                if (adminCount <= 1) {
                    alert("Cannot delete the last Admin account. At least one admin is mandatory.");
                    return;
                }
            }
        }

        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        deleteItem(id, type);
    };

    const handleEdit = (row: any) => {
        setNewItem(row);
        setEditingId(row.id);
        setIsAddModalOpen(true);
    };

    const handleSaveItem = async () => {
        if (Object.keys(newItem).length === 0) return;

        try {
            const { id, created_at, ...updates } = newItem; // Clean payload
            let res: any = null;

            if (activeTab === 'users') {
                if (editingId) {
                    res = await backendAPI.updateUser!(editingId, updates);
                    // Realtime will update list, or we update locally:
                    if (res) setUsers(prev => prev.map(u => u.id === editingId ? res : u));
                } else {
                    const profile = { role: 'user', status: 'Active', joined: new Date().toISOString(), ...newItem };
                    res = await backendAPI.createUser!(profile);
                    if (res) setUsers([res, ...users]);
                }
            } else if (activeTab === 'treks') {
                if (editingId) {
                    res = await backendAPI.updateTrek!(editingId, updates);
                    if (res) setTreks(prev => prev.map(t => t.id === editingId ? res : t));
                } else {
                    const trek = { rating: 0, created_at: new Date().toISOString(), ...newItem };
                    res = await backendAPI.createTrek!(trek);
                    if (res) setTreks([res, ...treks]);
                }
            } else if (activeTab === 'communities') {
                if (editingId) {
                    res = await backendAPI.updateCommunity!(editingId, updates);
                    if (res) setCommunities(prev => prev.map(c => c.id === editingId ? res : c));
                } else {
                    const comm = { members: 1, active: 1, created_at: new Date().toISOString(), ...newItem };
                    res = await backendAPI.createCommunity!(comm);
                    if (res) setCommunities([...communities, res]);
                }
            }
            // Reviews edit logic omitted/not requested, can extend later.

            setIsAddModalOpen(false);
            setNewItem({});
            setEditingId(null);
        } catch (e: any) {
            console.error("Save failed", e);
            alert(`Failed to save item: ${e.message}`);
        }
    };

    // Render Helpers
    const renderSidebar = () => (
        <div className={styles.sidebar}>
            <div className={styles.brand}>
                <span>TREK</span>ADMIN
            </div>
            <nav className={styles.nav}>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
                >
                    <Users size={20} /> Users Database
                </button>
                <button
                    onClick={() => setActiveTab('treks')}
                    className={`${styles.navItem} ${activeTab === 'treks' ? styles.active : ''}`}
                >
                    <Map size={20} /> Trek Management
                </button>
                <button
                    onClick={() => setActiveTab('communities')}
                    className={`${styles.navItem} ${activeTab === 'communities' ? styles.active : ''}`}
                >
                    <MessageSquare size={20} /> Community Groups
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`${styles.navItem} ${activeTab === 'reviews' ? styles.active : ''}`}
                >
                    <Star size={20} /> Reviews & Ratings
                </button>
            </nav>
            <button onClick={() => { logout(); router.push('/login'); }} className={styles.logoutBtn}>
                <LogOut size={20} /> Sign Out
            </button>
        </div>
    );

    const renderHeader = () => (
        <header className={styles.header}>
            <div className={styles.headerTitle}>Dashboard Overview</div>
            <div className={styles.userInfo}>
                <span className={styles.adminBadge}>SUPER ADMIN</span>
                <span>{user.email}</span>
            </div>
        </header>
    );

    const renderStats = () => {
        const stats = [
            { label: 'Total Users', value: users.length },
            { label: 'Active Treks', value: treks.length },
            { label: 'Communities', value: communities.length },
            { label: 'New Reviews', value: reviews.length },
        ];
        return (
            <div className={styles.statsGrid}>
                {stats.map((s, i) => (
                    <div key={i} className={styles.statCard}>
                        <div className={styles.statValue}>{s.value}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderTable = () => {
        let columns: string[] = [];
        let data: any[] = [];
        let type = '';

        if (activeTab === 'users') {
            columns = ['Name', 'Email', 'Role', 'Status', 'Joined'];
            data = users;
            type = 'user';
        } else if (activeTab === 'treks') {
            columns = ['Name', 'Location', 'Difficulty', 'Price', 'Rating'];
            data = treks;
            type = 'trek';
        } else if (activeTab === 'communities') {
            columns = ['Name', 'Topic', 'Type', 'Members', 'Active'];
            data = communities;
            type = 'community';
        } else if (activeTab === 'reviews') {
            columns = ['User', 'Trek', 'Rating', 'Comment', 'Date'];
            data = reviews;
            type = 'review';
        }

        return (
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {columns.map((c) => <th key={c}>{c}</th>)}
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id}>
                                {columns.map((col) => {
                                    const key = col.toLowerCase();
                                    const val = row[key];
                                    if (col === 'Difficulty') {
                                        let color = '#10b981';
                                        if (val === 'Moderate') color = '#f59e0b';
                                        if (val === 'Hard' || val === 'Expert') color = '#ef4444';
                                        return <td key={col} style={{ color, fontWeight: 'bold' }}>{val}</td>;
                                    }
                                    return <td key={col}>{row[key] || val}</td>
                                })}
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button onClick={() => handleEdit(row)} className={styles.actionButton} style={{ color: '#3b82f6' }} title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(row.id, type)} className={`${styles.actionButton} ${styles.danger}`} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderAddModal = () => {
        if (!isAddModalOpen) return null;

        let fields: { label: string, key: string, type?: string, options?: string[] }[] = [];

        if (activeTab === 'users') {
            fields = [
                { label: 'Full Name', key: 'name' },
                { label: 'Email Address', key: 'email', type: 'email' },
                { label: 'Role', key: 'role', type: 'select', options: ['user', 'admin'] }
            ];
        } else if (activeTab === 'treks') {
            fields = [
                { label: 'Trek Name', key: 'name' },
                { label: 'Location', key: 'location' },
                { label: 'Difficulty', key: 'difficulty', type: 'select', options: ['Easy', 'Moderate', 'Hard', 'Expert'] },
                { label: 'Price', key: 'price' }
            ];
        } else if (activeTab === 'communities') {
            fields = [
                { label: 'Community Name', key: 'name' },
                { label: 'Topic Category', key: 'topic' },
                { label: 'Type', key: 'type', type: 'select', options: ['Public', 'Private'] }
            ];
        }

        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                    <div className={styles.modalTitle}>{editingId ? 'Edit' : 'Add New'} {activeTab.slice(0, -1).toUpperCase()}</div>
                    {fields.map(f => (
                        <div key={f.key} className={styles.formGroup}>
                            <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8', fontSize: '0.9rem' }}>{f.label}</label>
                            {f.type === 'select' ? (
                                <select
                                    className={styles.select}
                                    value={newItem[f.key] || ''}
                                    onChange={e => setNewItem({ ...newItem, [f.key]: e.target.value })}
                                >
                                    <option value="">Select {f.label}</option>
                                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input
                                    className={styles.input}
                                    type={f.type || 'text'}
                                    value={newItem[f.key] || ''}
                                    placeholder={`Enter ${f.label}`}
                                    onChange={e => setNewItem({ ...newItem, [f.key]: e.target.value })}
                                />
                            )}
                        </div>
                    ))}
                    <div className={styles.modalActions}>
                        <button onClick={() => { setIsAddModalOpen(false); setNewItem({}); setEditingId(null); }} className={styles.cancelBtn}>Cancel</button>
                        <button onClick={handleSaveItem} className={styles.saveBtn}>{editingId ? 'Update' : 'Save'} Record</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {renderSidebar()}
            <main className={styles.main}>
                {renderHeader()}
                <div className={styles.content}>
                    {renderStats()}

                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
                        </h2>
                        {activeTab !== 'reviews' && (
                            <button onClick={() => { setIsAddModalOpen(true); setNewItem({}); setEditingId(null); }} className={styles.addButton}>
                                <Plus size={18} /> Add New
                            </button>
                        )}
                    </div>

                    {renderTable()}
                </div>
            </main>
            {renderAddModal()}
        </div>
    );
};

export default AdminPage;
