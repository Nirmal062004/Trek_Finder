'use client';
import React, { useEffect, useState } from 'react';
import { backendAPI, type CommunityRecord, type ProfileRecord, type StoryRecord, type TrekRecord } from '@/shared/services/api';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, Map, MessageSquare, Plus, Trash2, Edit, X, ArrowLeft, Menu, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import styles from '@/styles/Admin.module.css';
import designStyles from '@/styles/DesignSystem.module.css';

type AdminTab = 'users' | 'treks' | 'communities' | 'stories';
type AdminRow = { id: string;[key: string]: unknown };
type RealtimePayload = {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: { id: string };
    old: { id: string };
};

function applyRealtimeUpdate<T extends { id: string }>(
    previous: T[],
    eventType: RealtimePayload['eventType'],
    newRecord: T,
    oldRecord: { id: string }
): T[] {
    if (eventType === 'INSERT') return [newRecord, ...previous];
    if (eventType === 'DELETE') return previous.filter((item) => item.id !== oldRecord.id);
    return previous.map((item) => item.id === newRecord.id ? newRecord : item);
}

function renderCell(value: unknown): React.ReactNode {
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (React.isValidElement(value)) return value;
    return null;
}

function getFormValue(value: unknown): string | number {
    return typeof value === 'string' || typeof value === 'number' ? value : '';
}

const AdminPage: React.FC = () => {
    const router = useRouter();
    const { user, isAdmin } = useAuth();

    // State
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [users, setUsers] = useState<ProfileRecord[]>([]);
    const [treks, setTreks] = useState<TrekRecord[]>([]);
    const [communities, setCommunities] = useState<CommunityRecord[]>([]);
    const [stories, setStories] = useState<StoryRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    // Form State
    const [newItem, setNewItem] = useState<Record<string, unknown>>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !isAdmin) {
            if (user && !isAdmin) router.push('/');
            return;
        }

        // Helper for Realtime Updates
        const handleRtUpdate = (type: string, payload: unknown) => {
            const { eventType, new: newRecord, old: oldRecord } = payload as RealtimePayload;
            if (type === 'profiles') setUsers((previous) => applyRealtimeUpdate(previous, eventType, newRecord as ProfileRecord, oldRecord));
            if (type === 'treks') setTreks((previous) => applyRealtimeUpdate(previous, eventType, newRecord as TrekRecord, oldRecord));
            if (type === 'communities') setCommunities((previous) => applyRealtimeUpdate(previous, eventType, newRecord as CommunityRecord, oldRecord));
            if (type === 'stories') setStories((previous) => applyRealtimeUpdate(previous, eventType, newRecord as StoryRecord, oldRecord));
        };

        const loadData = async () => {
            try {
                const [u, t, c, s] = await Promise.all([
                    backendAPI.getUsers(),
                    backendAPI.getTreks(),
                    backendAPI.getCommunities(),
                    backendAPI.getStories()
                ]);
                setUsers(u);
                setTreks(t);
                setCommunities(c);
                setStories(s);
            } catch (e) {
                console.error("Failed to load admin data", e);
            }
        };
        loadData();

        // Realtime Subscriptions
        const channel = supabase.channel('admin_dashboard_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (p) => handleRtUpdate('profiles', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'treks' }, (p) => handleRtUpdate('treks', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, (p) => handleRtUpdate('communities', p))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, (p) => handleRtUpdate('stories', p))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isAdmin, router]);

    if (!user || !isAdmin) return null;

    // Handlers
    const selectTab = (tab: AdminTab) => {
        setActiveTab(tab);
        setSelectedIds([]);
    };

    const containerClass = `${styles.container} ${designStyles['dark-luxury']} ${designStyles['noise']}`;

    const deleteItem = async (id: string, type: 'user' | 'trek' | 'community' | 'review' | 'story') => {
        try {
            if (type === 'user') await backendAPI.deleteUser(id);
            if (type === 'trek') await backendAPI.deleteTrek(id);
            if (type === 'community') await backendAPI.deleteCommunity(id);
            if (type === 'review') await backendAPI.deleteReview(id);
            if (type === 'story') await backendAPI.deleteStory(id);

            // Refresh local state
            if (type === 'user') setUsers(prev => prev.filter(u => u.id !== id));
            if (type === 'trek') setTreks(prev => prev.filter(t => t.id !== id));
            if (type === 'community') setCommunities(prev => prev.filter(c => c.id !== id));
            if (type === 'story') setStories(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error("Delete failed", error);
            alert(`Failed to delete ${type}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleDelete = (id: string, type: 'user' | 'trek' | 'community' | 'story') => {
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

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        const count = selectedIds.length;
        const type = activeTab.slice(0, -1); // user, trek, community, review, story (rough)
        if (!confirm(`Are you sure you want to delete ${count} selected ${type}s?`)) return;

        try {
            for (const id of selectedIds) {
                // Determine actual type for deleteItem helper
                const actualType = activeTab === 'stories' ? 'story' : activeTab === 'communities' ? 'community' : activeTab.slice(0, -1) as 'user' | 'trek';
                await deleteItem(id, actualType);
            }
            setSelectedIds([]);
        } catch (error) {
            console.error("Bulk delete failed", error);
        }
    };

    const toggleSelectAll = (data: AdminRow[]) => {
        if (selectedIds.length === data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(data.map(item => item.id));
        }
    };

    const toggleSelectItem = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleEdit = (row: AdminRow) => {
        setNewItem(row);
        setEditingId(row.id);
        setIsAddModalOpen(true);
    };

    const handleSaveItem = async () => {
        if (Object.keys(newItem).length === 0) return;

        try {
            const updates = Object.fromEntries(Object.entries(newItem).filter(([key]) => key !== 'id' && key !== 'created_at'));

            if (activeTab === 'users') {
                if (editingId) {
                    const res = await backendAPI.updateUser(editingId, updates);
                    // Realtime will update list, or we update locally:
                    if (res) setUsers(prev => prev.map(u => u.id === editingId ? res : u));
                } else {
                    const profile = { role: 'user', status: 'Active', joined: new Date().toISOString(), ...newItem };
                    const res = await backendAPI.createUser(profile);
                    setUsers((previous) => [res, ...previous]);
                }
            } else if (activeTab === 'treks') {
                if (editingId) {
                    const res = await backendAPI.updateTrek(editingId, updates);
                    if (res) setTreks(prev => prev.map(t => t.id === editingId ? res : t));
                } else {
                    const trek = { rating: 0, created_at: new Date().toISOString(), ...newItem };
                    const res = await backendAPI.createTrek(trek);
                    setTreks((previous) => [res, ...previous]);
                }
            } else if (activeTab === 'communities') {
                if (editingId) {
                    const res = await backendAPI.updateCommunity(editingId, updates);
                    if (res) setCommunities(prev => prev.map(c => c.id === editingId ? res : c));
                } else {
                    const comm = { members: 1, active: 1, created_at: new Date().toISOString(), ...newItem };
                    const res = await backendAPI.createCommunity(comm);
                    setCommunities((previous) => [...previous, res]);
                }
            }
            // Reviews edit logic omitted/not requested, can extend later.

            setIsAddModalOpen(false);
            setNewItem({});
            setEditingId(null);
        } catch (error) {
            console.error("Save failed", error);
            alert(`Failed to save item: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    // Render Helpers
    const renderSidebar = () => (
        <div className={`${styles.sidebar} ${isMenuOpen ? styles.open : ''}`}>
            <div className={styles.brand}>
                <span>TREK</span>ADMIN
            </div>
            <nav className={styles.nav}>
                <button
                    onClick={() => selectTab('users')}
                    className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
                >
                    <Users size={20} /> Users Database
                </button>
                <button
                    onClick={() => selectTab('treks')}
                    className={`${styles.navItem} ${activeTab === 'treks' ? styles.active : ''}`}
                >
                    <Map size={20} /> Trek Management
                </button>
                <button
                    onClick={() => selectTab('communities')}
                    className={`${styles.navItem} ${activeTab === 'communities' ? styles.active : ''}`}
                >
                    <MessageSquare size={20} /> Community Groups
                </button>
                <button
                    onClick={() => selectTab('stories')}
                    className={`${styles.navItem} ${activeTab === 'stories' ? styles.active : ''}`}
                >
                    <ImageIcon size={20} /> Stories & Media
                </button>
            </nav>
            <button onClick={() => router.push('/')} className={styles.backBtn}>
                <ArrowLeft size={20} /> Back to Site
            </button>
        </div>
    );

    const renderHeader = () => (
        <header className={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                    className={styles.menuToggle}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className={styles.headerTitle}>Dashboard Overview</div>
            </div>
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
            { label: 'Total Stories', value: stories.length },
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
        let data: AdminRow[] = [];
        let type: 'user' | 'trek' | 'community' | 'story' = 'user';

        if (activeTab === 'users') {
            columns = ['Name', 'Email', 'Role', 'Status', 'Joined'];
            data = users.map(u => ({
                ...u,
                joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'
            }));
            type = 'user';
        } else if (activeTab === 'treks') {
            columns = ['Title', 'Location', 'Difficulty', 'Length', 'Created'];
            data = treks.map(t => ({
                ...t,
                length: `${t.length_km || 0} km`,
                created: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'
            }));
            type = 'trek';
        } else if (activeTab === 'communities') {
            columns = ['Name', 'Topic', 'Type', 'Members', 'Active'];
            data = communities;
            type = 'community';
        } else if (activeTab === 'stories') {
            columns = ['Title', 'Media', 'User', 'State', 'District', 'Date'];
            data = stories.map(s => ({
                ...s,
                media: s.media_url ? <Image src={s.media_url} alt={s.title} width={40} height={40} unoptimized style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} /> : 'No image',
                user: s.user_name || s.user_email || 'Anon',
                date: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'
            }));
            type = 'story';
        }

        return (
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={data.length > 0 && selectedIds.length === data.length}
                                    onChange={() => toggleSelectAll(data)}
                                />
                            </th>
                            {columns.map((c) => <th key={c}>{c}</th>)}
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id} className={selectedIds.includes(row.id) ? styles.selectedRow : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={selectedIds.includes(row.id)}
                                        onChange={() => toggleSelectItem(row.id)}
                                    />
                                </td>
                                {columns.map((col) => {
                                    const key = col.toLowerCase();
                                    const val = row[key];
                                    if (col === 'Difficulty') {
                                        let color = '#10b981';
                                        if (val === 'Moderate') color = '#f59e0b';
                                        if (val === 'Hard' || val === 'Expert') color = '#ef4444';
                                        return <td key={col} style={{ color, fontWeight: 'bold' }}>{renderCell(val)}</td>;
                                    }
                                    return <td key={col}>{renderCell(row[key] || val)}</td>
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
                                    value={getFormValue(newItem[f.key])}
                                    onChange={e => setNewItem({ ...newItem, [f.key]: e.target.value })}
                                >
                                    <option value="">Select {f.label}</option>
                                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input
                                    className={styles.input}
                                    type={f.type || 'text'}
                                    value={getFormValue(newItem[f.key])}
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
        <div className={containerClass}>
            {renderSidebar()}
            <main className={`${styles.main} ${designStyles['glass']}`}>
                {renderHeader()}
                <div className={`${styles.content} ${designStyles['frosted']}`}>
                    {renderStats()}

                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
                        </h2>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {selectedIds.length > 0 && (
                                <button onClick={handleBulkDelete} className={`${styles.addButton} ${styles.danger}`} style={{ backgroundColor: '#ef4444' }}>
                                    <Trash2 size={18} /> Delete ({selectedIds.length})
                                </button>
                            )}
                            <button onClick={() => { setIsAddModalOpen(true); setNewItem({}); setEditingId(null); }} className={styles.addButton}>
                                <Plus size={18} /> Add New
                            </button>
                        </div>
                    </div>

                    {renderTable()}
                </div>
            </main>
            {renderAddModal()}
        </div>
    );
};

export default AdminPage;
