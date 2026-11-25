"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from '@/styles/Profile.module.css';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { authAPI } from '@/shared/services/api';
import { useRouter } from 'next/navigation';
import {
    Edit2, Mountain, Users, Star, Camera, Map as MapIcon, PenTool, Award, Globe, Flame,
    Clock, Check, Save, Trash2
} from 'lucide-react';
import { defaultCommunities, getIconByKey, Community } from '@/shared/services/communityData';
import MyStories from '@/components/MyStories';
import AvatarEditor from '@/components/AvatarEditor';
import type { TrekSummary } from '@/context/WishlistContext';

type Tab = 'overview' | 'travel-list' | 'community' | 'contributions' | 'achievements';

const COMPLETED_TREKS_KEY = 'trek_finder_completed_treks';

function readCompletedTreks(): (number | string)[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(COMPLETED_TREKS_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter((id): id is number | string => typeof id === 'number' || typeof id === 'string') : [];
    } catch {
        return [];
    }
}

function readUserCommunities(): Community[] {
    if (typeof window === 'undefined') return [];
    try {
        const customValue: unknown = JSON.parse(localStorage.getItem('trek_finder_custom_communities') || '[]');
        const joinedValue: unknown = JSON.parse(localStorage.getItem('trek_finder_joined_communities') || '[]');
        const customCommunities = Array.isArray(customValue) ? customValue as Community[] : [];
        const joinedIds = Array.isArray(joinedValue) ? joinedValue.filter((id): id is string => typeof id === 'string') : [];
        return [...defaultCommunities, ...customCommunities].filter((community) => joinedIds.includes(community.id));
    } catch {
        return [];
    }
}

export default function ProfilePage() {
    const { user, updateUser } = useAuth(); // Get updateUser from context
    const router = useRouter();
    const { savedTreks, removeTrek } = useWishlist();

    // -- Profile State --
    const [displayName, setDisplayName] = useState<string>(() =>
        user?.name || (typeof window !== 'undefined' ? localStorage.getItem('trek_finder_profile_name') : null) || user?.email?.split('@')[0] || 'Trekker'
    );


    // -- Modes --
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // -- Data State --
    const [userCommunities] = useState<Community[]>(readUserCommunities);
    const [completedTreks, setCompletedTreks] = useState<(number | string)[]>(readCompletedTreks);

    const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
    const [lastCompletedTrek, setLastCompletedTrek] = useState<TrekSummary | null>(null);
    const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

    // -- Avatar State --
    const [avatarSeed, setAvatarSeed] = useState<string>(() => {
        const owner = user?.id || user?.email || user?.name || 'anon';
        return typeof window !== 'undefined'
            ? localStorage.getItem(`trek_finder_avatar_seed_${owner}`) || user?.name || ''
            : user?.name || '';
    });
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [avatarOptions, setAvatarOptions] = useState<string[]>([]);

    useEffect(() => {
        if (!user) return;
        const owner = user.id || user.email || user.name || 'anon';
        const updateAvatar = () => setAvatarSeed(localStorage.getItem(`trek_finder_avatar_seed_${owner}`) || user.name);
        window.addEventListener('storage', updateAvatar);
        window.addEventListener('avatar-updated', updateAvatar);
        return () => {
            window.removeEventListener('storage', updateAvatar);
            window.removeEventListener('avatar-updated', updateAvatar);
        };
    }, [user]);

    // -- Handlers --

    const handleSaveProfile = async () => {
        // Save to LocalStorage (legacy/fallback)
        localStorage.setItem('trek_finder_profile_name', displayName);

        // Save to API/Context (Real Sync)
        if (user && updateUser) {
            try {
                await authAPI.updateUser({ data: { name: displayName } });
                updateUser({ name: displayName });
            } catch (e) {
                console.error("Failed to sync profile name", e);
            }
        }

        setIsEditing(false);
    };

    const toggleTrekCompletion = (trekId: number | string) => {
        let newCompleted;
        if (completedTreks.includes(trekId)) {
            newCompleted = completedTreks.filter(id => id !== trekId);
        } else {
            newCompleted = [...completedTreks, trekId];
            // Trigger completion overlay
            const trek = savedTreks.find(t => t.id === trekId);
            if (trek) {
                setLastCompletedTrek(trek);
                const colors = ['#2bff88', '#ffeb3b', '#42a5f5', '#ff4444'];
                setConfettiPieces(Array.from({ length: 20 }, (_, id) => ({
                    id,
                    left: Math.random() * 100,
                    delay: Math.random() * 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                })));
                setShowCompletionOverlay(true);
            }
        }
        setCompletedTreks(newCompleted);
        localStorage.setItem('trek_finder_completed_treks', JSON.stringify(newCompleted));
    };

    // -- Avatar Handlers --
    const openAvatarEditor = () => {
        setAvatarOptions([avatarSeed, ...Array.from({ length: 9 }, () => Math.random().toString(36).substring(7))]);
        setShowAvatarEditor(true);
    };

    const saveNewAvatar = (seed: string) => {
        setAvatarSeed(seed);
        const uid = user?.id || user?.email || user?.name || 'anon';
        const storageKey = `trek_finder_avatar_seed_${uid}`;
        localStorage.setItem(storageKey, seed);
        window.dispatchEvent(new Event('avatar-updated'));
        setShowAvatarEditor(false);
    };

    // -- Stats Calculation --
    // -- Stats Calculation --
    const xp = (completedTreks.length * 50) + (userCommunities.length * 20);
    const level = Math.floor(1 + (xp / 100)); // Simple level formula based on XP
    const nextLevelXp = level * 100;
    const progress = Math.min((xp / nextLevelXp) * 100, 100);

    // -- Renderers --

    const renderOverview = () => (
        <div className={styles.grid}>
            <div className={styles.card}>
                <div className={styles['card-icon']}><Mountain size={32} color="#2bff88" /></div>
                <h3 className={styles['card-title']}>Journey So Far</h3>
                <p className={styles['card-desc']}>You have <strong>{completedTreks.length}</strong> completed treks and <strong>{savedTreks.length}</strong> planned adventures.</p>
                <div className={styles['card-meta']}>
                    <span>{savedTreks.length > 0 ? 'Keep going!' : 'Start exploring!'}</span>
                </div>
            </div>
            <div className={styles.card}>
                <div className={styles['card-icon']}><Users size={32} color="#42a5f5" /></div>
                <h3 className={styles['card-title']}>Community</h3>
                <p className={styles['card-desc']}>Active member of <strong>{userCommunities.length}</strong> communities. Connected with fellow trekkers.</p>
                <div className={styles['card-meta']}>
                    <span>{userCommunities.length > 0 ? 'Network Active' : 'Join a tribe!'}</span>
                </div>
            </div>
            <div className={styles.card}>
                <div className={styles['card-icon']}><Star size={32} color="#ffeb3b" /></div>
                <h3 className={styles['card-title']}>Status</h3>
                <p className={styles['card-desc']}>Current Level: <strong>{level}</strong><br /> XP to next level: {((level + 1) * 100) - (completedTreks.length * 50)} XP</p>
                <div className={styles['card-meta']}>
                    <span>Top 10% Explorer</span>
                </div>
            </div>
        </div>
    );

    const renderTravelList = () => (
        <div className={styles.grid}>
            {savedTreks.length === 0 ? (
                <div className={styles.card} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                    <div className={styles['card-icon']} style={{ margin: '0 auto 16px' }}><Mountain size={40} /></div>
                    <h4 className={styles['card-title']}>No Planned Treks</h4>
                    <p className={styles['card-desc']}>Explore the map and save treks to your wishlist!</p>
                    <button
                        onClick={() => router.push('/finder')}
                        style={{
                            marginTop: '16px',
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #2bff88, #1aa355)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#000',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Find Treks
                    </button>
                </div>
            ) : (
                savedTreks.map((trek, i) => {
                    const isCompleted = completedTreks.includes(trek.id);
                    return (
                        <div key={i} className={styles.card} style={{ borderColor: isCompleted ? '#2bff88' : undefined }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h4 className={styles['card-title']}>{trek.tags?.name || trek.tags?.name_en || `Trek #${trek.id}`}</h4>
                                {isCompleted && <span className={`${styles.badge}`} style={{ background: '#2bff88', color: '#000' }}>Completed</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '13px', color: '#bbb' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Mountain size={14} /> {trek.difficulty || 'Moderate'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={14} /> {trek.duration || '2-3'}h
                                </span>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => toggleTrekCompletion(trek.id)}
                                    title={isCompleted ? "Mark Incomplete" : "Mark Complete"}
                                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid rgba(43,255,136,0.3)', background: isCompleted ? 'rgba(43,255,136,0.1)' : 'transparent', color: '#2bff88', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                    <Check size={16} />
                                </button>
                                <button
                                    onClick={() => removeTrek(trek.id)}
                                    title="Remove from List"
                                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid rgba(255,69,58,0.3)', background: 'transparent', color: '#ff4444', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderCommunity = () => (
        <div className={styles.grid}>
            {userCommunities.length === 0 ? (
                <div className={styles.card} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                    <div className={styles['card-icon']} style={{ margin: '0 auto 16px' }}><Users size={40} /></div>
                    <h4 className={styles['card-title']}>No Communities Joined</h4>
                    <p className={styles['card-desc']}>Join or create a community in the Chat Room to see them here!</p>
                    <button onClick={() => router.push('/chat')} style={{ marginTop: '16px', padding: '10px 24px', background: 'linear-gradient(135deg, #2bff88, #1aa355)', border: 'none', borderRadius: 8, color: '#000', fontWeight: 600, cursor: 'pointer' }}>Go to Chat Room</button>
                </div>
            ) : (
                userCommunities.map((comm, i) => (
                    <div key={i} className={styles.card}>
                        <div className={styles['card-icon']}>{getIconByKey(comm.iconKey)}</div>
                        <h4 className={styles['card-title']}>{comm.name}</h4>
                        <p className={styles['card-desc']}>{comm.description || `${comm.members} members`}</p>
                        <div className={styles['card-meta']}>
                            <span className={`${styles.badge} community`}>{comm.role || (comm.isCustom ? 'Creator' : 'Member')}</span>
                            <span style={{ fontSize: '12px', opacity: 0.7, marginLeft: 'auto' }}>{comm.members.toLocaleString()} Members</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderAchievements = () => (
        <div className={styles.grid}>
            <div className={styles.card} style={{ opacity: completedTreks.length > 0 ? 1 : 0.5 }}>
                <div className={styles['card-icon']}><Award size={32} color={completedTreks.length > 0 ? '#ffbf00' : '#fff'} /></div>
                <h4 className={styles['card-title']}>First Steps</h4>
                <p className={styles['card-desc']}>Complete your first trek.</p>
                <div className={styles['card-meta']}>{completedTreks.length > 0 ? 'Unlocked' : 'Locked'}</div>
            </div>
            <div className={styles.card} style={{ opacity: userCommunities.length > 0 ? 1 : 0.5 }}>
                <div className={styles['card-icon']}><Globe size={32} color={userCommunities.length > 0 ? '#2196f3' : '#fff'} /></div>
                <h4 className={styles['card-title']}>Social Butterfly</h4>
                <p className={styles['card-desc']}>Join at least one community.</p>
                <div className={styles['card-meta']}>{userCommunities.length > 0 ? 'Unlocked' : 'Locked'}</div>
            </div>
            <div className={styles.card} style={{ opacity: level >= 5 ? 1 : 0.5 }}>
                <div className={styles['card-icon']}><Flame size={32} color={level >= 5 ? '#ff5722' : '#fff'} /></div>
                <h4 className={styles['card-title']}>Veteran Trekker</h4>
                <p className={styles['card-desc']}>Reach Level 5.</p>
                <div className={styles['card-meta']}>{level >= 5 ? 'Unlocked' : 'Locked'}</div>
            </div>
            <div className={styles.card} style={{ opacity: savedTreks.length >= 5 ? 1 : 0.5 }}>
                <div className={styles['card-icon']}><MapIcon size={32} color={savedTreks.length >= 5 ? '#9c27b0' : '#fff'} /></div>
                <h4 className={styles['card-title']}>Master Planner</h4>
                <p className={styles['card-desc']}>Have 5+ treks in your travel list.</p>
                <div className={styles['card-meta']}>{savedTreks.length >= 5 ? 'Unlocked' : 'Locked'}</div>
            </div>
        </div>
    );

    const renderCompletionOverlay = () => {
        if (!showCompletionOverlay || !lastCompletedTrek) return null;

        return (
            <div className={styles['completion-overlay']}>
                <div className={styles['confetti-container']}>
                    {confettiPieces.map((piece) => (
                        <div key={piece.id} className={styles.confetti} style={{
                            left: `${piece.left}%`,
                            animationDelay: `${piece.delay}s`,
                            backgroundColor: piece.color
                        }} />
                    ))}
                </div>

                <div className={styles['success-card']}>
                    <div className={styles['success-icon-wrapper']}>
                        <Check size={48} className={styles['success-icon']} />
                    </div>
                    <h2 className={styles['success-title']}>CONGRATULATIONS!</h2>
                    <p className={styles['success-subtitle']}>You&apos;ve conquered another trail!</p>

                    <div className={styles['trek-completion-info']}>
                        <div className={styles['trek-name']}>{lastCompletedTrek.tags?.name || lastCompletedTrek.tags?.name_en || `Trek #${lastCompletedTrek.id}`}</div>
                        <div className={styles['xp-badge']}>+50 XP Earned</div>
                    </div>

                    <div className={styles['overlay-actions']}>
                        <button
                            className={styles['share-btn']}
                            onClick={() => {
                                setShowCompletionOverlay(false);
                                setActiveTab('contributions');
                            }}
                        >
                            <PenTool size={18} /> Share Your Story
                        </button>
                        <button
                            className={styles['dismiss-btn']}
                            onClick={() => setShowCompletionOverlay(false)}
                        >
                            Keep Exploring
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles['profile-page']}>
            {/* Header */}
            <div className={styles['profile-header']}>
                <div className={styles['avatar']} onClick={isEditing ? openAvatarEditor : undefined} style={{ position: 'relative', overflow: 'hidden', padding: 0, border: '4px solid #fff', cursor: isEditing ? 'pointer' : 'default' }}>
                    <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="Profile Avatar" width={120} height={120} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isEditing && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Camera size={24} color="#fff" />
                        </div>
                    )}
                </div>

                <div className={styles['header-info']}>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                            <input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: 4, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}
                                placeholder="Your Name"
                            />
                        </div>
                    ) : (
                        <>
                            <div className={styles['title-row']}>
                                <h2 className={styles['title']}>{displayName}</h2>
                                <button className={styles['edit-profile-btn']} onClick={() => setIsEditing(true)}>
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                            </div>
                            <div className={styles['subtitle']} style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
                                <div style={{
                                    background: 'linear-gradient(135deg, #2bff88, #1aa355)',
                                    color: '#000',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    borderRadius: '6px 0 0 6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Lvl {level}
                                </div>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    padding: '3px 12px',
                                    borderRadius: '0 6px 6px 0',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderLeft: 'none',
                                    fontWeight: 500
                                }}>
                                    Explorer
                                </div>
                            </div>
                        </>
                    )}

                    {!isEditing && (
                        <div style={{ marginTop: 12, width: '100%', maxWidth: 280 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                                <span>XP {xp}</span>
                                <span>{nextLevelXp} XP</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #2bff88, #00e676)', borderRadius: 10, transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                                {Math.round(nextLevelXp - xp)} XP to Level {level + 1}
                            </div>
                        </div>
                    )}



                    {isEditing && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                            <button onClick={handleSaveProfile} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: '#2bff88', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                                <Save size={16} /> Save Changes
                            </button>
                            <button onClick={() => setIsEditing(false)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles['header-stats']}>
                    <div className={styles['stat-item']}>
                        <span className={styles['stat-value']}>{savedTreks.length}</span>
                        <span className={styles['stat-label']}>Planned</span>
                    </div>
                    <div className={styles['stat-item']}>
                        <span className={styles['stat-value']}>{completedTreks.length}</span>
                        <span className={styles['stat-label']}>Completed</span>
                    </div>
                    <div className={styles['stat-item']}>
                        <span className={styles['stat-value']}>{userCommunities.length}</span>
                        <span className={styles['stat-label']}>Groups</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className={styles['tabs']}>
                {['overview', 'travel-list', 'community', 'contributions', 'achievements'].map((tab) => (
                    <button
                        key={tab}
                        className={`${styles['tab-btn']} ${activeTab === tab ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab as Tab)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className={styles['content-area']}>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'travel-list' && renderTravelList()}
                {activeTab === 'community' && renderCommunity()}
                {activeTab === 'contributions' && (
                    <>
                        {renderOverview()}
                        <div style={{ marginTop: 24 }}><MyStories /></div>
                    </>
                )}
                {activeTab === 'achievements' && renderAchievements()}
            </div>

            {/* Avatar Editor Modal */}
            <AvatarEditor
                key={`${avatarSeed}-${showAvatarEditor}`}
                isOpen={showAvatarEditor}
                currentSeed={avatarSeed}
                initialOptions={avatarOptions}
                onClose={() => setShowAvatarEditor(false)}
                onSave={saveNewAvatar}
            />

            {renderCompletionOverlay()}
        </div>
    );
};

