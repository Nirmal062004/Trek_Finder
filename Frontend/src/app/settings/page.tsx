'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '@/styles/Settings.module.css';
import { Settings as SettingsIcon, User, Lock, Bell, HelpCircle, X, LogOut, Database, Download, Speaker } from 'lucide-react';
import { authAPI } from '@/shared/services/api';
import { useAuth } from '@/context/AuthContext';

type SettingsSection = 'general' | 'account' | 'privacy' | 'notifications' | 'data' | 'help';

const SETTINGS_STORAGE_KEY = 'trek_finder_settings';

function SettingsComponent({ onClose, initialSection = 'general' }: { onClose: () => void; initialSection?: SettingsSection }) {
    const { user, updateUser, logout } = useAuth();
    const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
    const [editName, setEditName] = useState(user?.name || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');

    useEffect(() => {
        if (user) {
            setEditName(user.name || '');
            setEditEmail(user.email || '');
        }
    }, [user]);
    const [nameSaved, setNameSaved] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Default Settings
    const defaultSettings = {
        general: { soundEffects: true, autoPlayVideos: true },
        privacy: { profileVisibility: 'public', showActivityStatus: true },
        notifications: { pushNotifications: true, emailUpdates: true },
    };

    const [settings, setSettings] = useState(() => {
        if (typeof window === 'undefined') return defaultSettings;

        try {
            const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Deep merge with defaults to ensure no keys are missing (undefined)
                return {
                    general: { ...defaultSettings.general, ...parsed.general },
                    privacy: { ...defaultSettings.privacy, ...parsed.privacy },
                    notifications: { ...defaultSettings.notifications, ...parsed.notifications },
                };
            }
        } catch (e) {
            console.error('Error parsing settings:', e);
        }
        return defaultSettings;
    });

    useEffect(() => { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); }, [settings]);

    const handleToggle = (section: keyof typeof settings, key: string) => {
        setSettings((prev: any) => ({ ...prev, [section]: { ...prev[section], [key]: !prev[section][key] } }));
    };

    const handleChange = (section: keyof typeof settings, key: string, value: string) => {
        setSettings((prev: any) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    };

    const handleSaveName = async () => {
        if (editName.trim() && editName !== user?.name) {
            setLoading(true);
            try {
                await authAPI.updateUser({ data: { name: editName.trim() } });
                if (updateUser) updateUser({ name: editName.trim() });
                setNameSaved(true); setTimeout(() => setNameSaved(false), 2000);
            } catch (error) { console.error('Error updating name:', error); alert('Failed to update name.'); } finally { setLoading(false); }
        }
    };

    const handleSaveEmail = async () => {
        if (editEmail.trim() && editEmail !== user?.email) {
            setLoading(true);
            try {
                await authAPI.updateUser({ email: editEmail.trim() });
                if (updateUser) updateUser({ email: editEmail.trim() });
                setEmailSaved(true);
                alert('Email update confirmation sent.');
                setTimeout(() => setEmailSaved(false), 2000);
            } catch (error) { console.error('Error updating email:', error); alert('Failed to update email.'); } finally { setLoading(false); }
        }
    };

    const handleDeleteAccount = async () => {
        if (!deleteConfirm) { setDeleteConfirm(true); return; }
        try { await authAPI.logout(); } catch (e) { }
        localStorage.clear();
        if (logout) logout();
        alert('Account deactivated locally.');
    };

    const handleClearCache = () => {
        if (confirm('This will clear local storage data (settings, recent chats, theme). You will be logged out.')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleSignOut = async () => {
        try { await authAPI.logout(); } catch (e) { }
        localStorage.removeItem('supabase.auth.token');
        if (logout) logout();
        window.location.href = '/login';
    };

    const renderSidebar = () => (
        <div className={styles['sidebar']}>
            <div className={styles['sidebar-header']}><h2>Settings</h2></div>
            <div className={styles['sidebar-menu']}>
                {[
                    { id: 'general', label: 'General', icon: SettingsIcon },
                    { id: 'account', label: 'Account', icon: User },
                    { id: 'privacy', label: 'Privacy', icon: Lock },
                    { id: 'notifications', label: 'Notifications', icon: Bell },
                    { id: 'data', label: 'Data & Storage', icon: Database },
                    { id: 'help', label: 'Help', icon: HelpCircle },
                ].map((item) => (
                    <button key={item.id} className={`${styles['menu-item']} ${activeSection === item.id ? styles['active'] : ''}`} onClick={() => setActiveSection(item.id as SettingsSection)}>
                        <span className={styles['menu-icon']}><item.icon size={18} /></span>
                        {item.label}
                    </button>
                ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button className={styles['menu-item']} onClick={handleSignOut} style={{ color: '#ff4444' }}>
                    <span className={styles['menu-icon']}><LogOut size={18} /></span>
                    Sign Out
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <>
                        <h2 className={styles['section-title']}>General</h2>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Preferences</h3>

                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Sound Effects</label>
                                    <span className={styles['item-desc']}>Play sounds for interactions.</span>
                                </div>
                                <label className={styles['toggle-switch']}>
                                    <input type="checkbox" checked={!!settings.general?.soundEffects} onChange={() => handleToggle('general', 'soundEffects')} />
                                    <span className={styles['slider']}></span>
                                </label>
                            </div>

                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Autoplay Videos</label>
                                    <span className={styles['item-desc']}>Play videos automatically in feed.</span>
                                </div>
                                <label className={styles['toggle-switch']}>
                                    <input type="checkbox" checked={!!settings.general?.autoPlayVideos} onChange={() => handleToggle('general', 'autoPlayVideos')} />
                                    <span className={styles['slider']}></span>
                                </label>
                            </div>
                        </div>
                    </>
                );

            case 'account':
                return (
                    <>
                        <h2 className={styles['section-title']}>Account</h2>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Personal Information</h3>
                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Display Name</label>
                                    <span className={styles['item-desc']}>Visible to other trekkers.</span>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input type="text" className={styles['text-input']} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your Name" />
                                    <button className={styles['btn-primary']} onClick={handleSaveName} disabled={!editName.trim() || editName === user?.name || loading}>{nameSaved ? 'Saved' : 'Save'}</button>
                                </div>
                            </div>

                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Email Address</label>
                                    <span className={styles['item-desc']}>Used for login and notifications.</span>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input type="email" className={styles['text-input']} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="your@email.com" />
                                    <button className={styles['btn-primary']} onClick={handleSaveEmail} disabled={!editEmail.trim() || editEmail === user?.email || loading}>{emailSaved ? 'Saved' : 'Save'}</button>
                                </div>
                            </div>
                        </div>

                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Security</h3>
                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']} style={{ color: '#ff4444' }}>Delete Account</label>
                                    <span className={styles['item-desc']}>{deleteConfirm ? 'Are you sure? This action is irreversible.' : 'Permanently remove your account and data.'}</span>
                                </div>
                                <button className={styles['btn-danger']} onClick={handleDeleteAccount} onBlur={() => setDeleteConfirm(false)}>{deleteConfirm ? 'Confirm Delete' : 'Delete Account'}</button>
                            </div>
                        </div>
                    </>
                );

            case 'privacy':
                return (
                    <>
                        <h2 className={styles['section-title']}>Privacy</h2>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Visibility</h3>
                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Profile Visibility</label>
                                    <span className={styles['item-desc']}>Control who can see your treks and stats.</span>
                                </div>
                                <select className={styles['select-input']} value={settings.privacy.profileVisibility} onChange={(e) => handleChange('privacy', 'profileVisibility', e.target.value)}>
                                    <option value="public">Everyone</option>
                                    <option value="friends">Friends Only</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>

                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Activity Status</label>
                                    <span className={styles['item-desc']}>Let friends know when you're active.</span>
                                </div>
                                <label className={styles['toggle-switch']}>
                                    <input type="checkbox" checked={!!settings.privacy?.showActivityStatus} onChange={() => handleToggle('privacy', 'showActivityStatus')} />
                                    <span className={styles['slider']}></span>
                                </label>
                            </div>
                        </div>
                    </>
                );

            case 'data':
                return (
                    <>
                        <h2 className={styles['section-title']}>Data & Storage</h2>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Local Data</h3>
                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Clear Cache</label>
                                    <span className={styles['item-desc']}>Fix issues by clearing local storage data.</span>
                                </div>
                                <button className={styles['btn-primary']} onClick={handleClearCache} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>Clear Data</button>
                            </div>
                        </div>
                    </>
                );

            case 'notifications':
                return (
                    <>
                        <h2 className={styles['section-title']}>Notifications</h2>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Alerts</h3>
                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Push Notifications</label>
                                    <span className={styles['item-desc']}>Receive alerts on your device.</span>
                                </div>
                                <label className={styles['toggle-switch']}>
                                    <input type="checkbox" checked={!!settings.notifications?.pushNotifications} onChange={() => handleToggle('notifications', 'pushNotifications')} />
                                    <span className={styles['slider']}></span>
                                </label>
                            </div>

                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Email Updates</label>
                                    <span className={styles['item-desc']}>Receive important updates via email.</span>
                                </div>
                                <label className={styles['toggle-switch']}>
                                    <input type="checkbox" checked={!!settings.notifications?.emailUpdates} onChange={() => handleToggle('notifications', 'emailUpdates')} />
                                    <span className={styles['slider']}></span>
                                </label>
                            </div>
                        </div>
                    </>
                );

            case 'help':
                return (
                    <>
                        <h2 className={styles['section-title']}>Help & Support</h2>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>Contact</h3>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: 16 }}>Having trouble? Our support team is here to help.</p>
                            <button className={styles['btn-primary']} style={{ width: '100%' }}>Contact Support</button>
                        </div>
                        <div className={styles['setting-group']}>
                            <h3 className={styles['group-title']}>About</h3>
                            <div className={styles['setting-item']}>
                                <div className={styles['item-info']}>
                                    <label className={styles['item-label']}>Version</label>
                                    <span className={styles['item-desc']}>1.2.0 (Beta)</span>
                                </div>
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 900, pointerEvents: 'auto' }}>
            <div className={styles['settings-page']}>
                {renderSidebar()}
                <div className={styles['content']}>
                    <button className={styles['close-top']} onClick={onClose} aria-label="Close settings"><X size={20} /></button>
                    <div className={styles['content-wrapper']}>{renderContent()}</div>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') as SettingsSection;
    const initialSection = tab || 'general';
    const handleClose = () => { router.push('/'); };
    return <SettingsComponent onClose={handleClose} initialSection={initialSection} />;
}
