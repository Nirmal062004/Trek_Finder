'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';

import styles from '@/styles/ChatRoom.module.css';
import designStyles from '@/styles/DesignSystem.module.css';
import wsService from '@/shared/services/websocket';
import { MessageSquare, LogOut, Search, Plus, Paperclip, Smile, Send, Check, X, RefreshCw, Copy, ChevronLeft } from 'lucide-react';
import { getIconByKey, availableIconKeys, Community } from '@/shared/services/communityData';
import AvatarEditor from '@/components/AvatarEditor';
import Image from 'next/image';

interface Message {
    id: number;
    user: string;
    text: string;
    timestamp: string;
    isSystem: boolean;
    avatar?: string;
}

interface Friend {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'typing';
    avatar: string;
    lastMessage?: string;
    unread?: number;
}

const STORAGE_KEY_CUSTOM = 'trek_finder_custom_communities';
const STORAGE_KEY_JOINED = 'trek_finder_joined_communities';
const STORAGE_KEY_MESSAGES = 'trek_finder_chat_messages';
const STORAGE_KEY_FRIENDS = 'trek_finder_friends';
const STORAGE_EVENT = 'chat-storage-updated';
const EMPTY_ARRAY: never[] = [];
const storedArraySnapshots = new Map<string, { raw: string | null; value: unknown[] }>();

function subscribeToStoredArrays(onChange: () => void): () => void {
    window.addEventListener('storage', onChange);
    window.addEventListener(STORAGE_EVENT, onChange);
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(STORAGE_EVENT, onChange);
    };
}

function useStoredArray<T>(key: string, isValidArray: (value: unknown) => value is T[]): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
    const getSnapshot = useCallback((): T[] => {
        const raw = localStorage.getItem(key);
        const cached = storedArraySnapshots.get(key);
        if (cached?.raw === raw) return cached.value as T[];

        let value: unknown = EMPTY_ARRAY;
        try {
            value = raw ? JSON.parse(raw) as unknown : EMPTY_ARRAY;
        } catch (error) {
            console.warn(`Could not parse stored data for ${key}`, error);
        }
        const parsed = isValidArray(value) ? value : EMPTY_ARRAY;
        storedArraySnapshots.set(key, { raw, value: parsed });
        return parsed;
    }, [isValidArray, key]);

    const values = useSyncExternalStore(subscribeToStoredArrays, getSnapshot, () => EMPTY_ARRAY as T[]);
    const setValues = useCallback<React.Dispatch<React.SetStateAction<T[]>>>((update) => {
        const previous = getSnapshot();
        const next = typeof update === 'function' ? update(previous) : update;
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event(STORAGE_EVENT));
    }, [getSnapshot, key]);
    return [values, setValues];
}

function isMessageArray(value: unknown): value is Message[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null &&
        'id' in item && 'user' in item && 'text' in item && 'timestamp' in item && 'isSystem' in item);
}

function isFriendArray(value: unknown): value is Friend[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null &&
        'id' in item && 'name' in item && 'status' in item && 'avatar' in item);
}

function isCommunityArray(value: unknown): value is Community[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null &&
        'id' in item && 'name' in item && 'iconKey' in item && 'members' in item);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function subscribeToUid(onChange: () => void): () => void {
    const storedUid = localStorage.getItem('trek_finder_uid');
    if (!storedUid) {
        const generatedUid = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('trek_finder_uid', generatedUid);
    }
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
}

const ChatRoom: React.FC = () => {
    const { user } = useAuth();
    const userName = user?.name || user?.email?.split('@')[0] || 'Anonymous';
    const userUID = useSyncExternalStore(
        subscribeToUid,
        () => localStorage.getItem('trek_finder_uid') || '',
        () => ''
    );
    const avatarOwner = user?.id || userUID || 'anon';
    const avatarKey = `trek_finder_avatar_seed_${avatarOwner}`;
    const getAvatarSeed = useCallback(() => localStorage.getItem(avatarKey) || userName, [avatarKey, userName]);
    const avatarSeed = useSyncExternalStore(subscribeToStoredArrays, getAvatarSeed, () => userName);
    const isNameSet = Boolean(user);

    // UI States
    const [viewMode, setViewMode] = useState<'chats' | 'communities'>('chats');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [tempAvatarSeed, setTempAvatarSeed] = useState('');
    const [avatarOptions, setAvatarOptions] = useState<string[]>([]);
    const [friendUidInput, setFriendUidInput] = useState('');

    // Data States
    const messageStorageKey = `${STORAGE_KEY_MESSAGES}_${activeChatId || 'general'}`;
    const [messages, setMessages] = useStoredArray(messageStorageKey, isMessageArray);
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [myFriends, setMyFriends] = useStoredArray(STORAGE_KEY_FRIENDS, isFriendArray);
    const [customCommunities, setCustomCommunities] = useStoredArray(STORAGE_KEY_CUSTOM, isCommunityArray);
    const [joinedCommunityIds, setJoinedCommunityIds] = useStoredArray(STORAGE_KEY_JOINED, isStringArray);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newCommunity, setNewCommunity] = useState({ name: '', iconKey: availableIconKeys[0], description: '' });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const MAX_CUSTOM_COMMUNITIES = 3;

    useEffect(() => {
        if (isNameSet) {
            wsService.connect(userName, 'general');
            const handleMessage = (message: Message) => setMessages((prev) => [...prev, message]);
            wsService.onMessage(handleMessage);
            return () => { wsService.disconnect(); };
        }
    }, [isNameSet, userName, setMessages]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);


    const handleAddFriend = (e: React.FormEvent) => {
        e.preventDefault();
        if (friendUidInput.length !== 6) { return alert('Invalid UID. It should be 6 digits.'); }
        if (friendUidInput === userUID) { return alert("You can't add yourself!"); }
        if (myFriends.some(f => f.id === friendUidInput)) { return alert('User already in your contacts.'); }

        // Simulate finding a user
        const newFriend: Friend = {
            id: friendUidInput,
            name: `Trekker #${friendUidInput}`,
            status: 'offline',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendUidInput}`,
            lastMessage: 'Messages are end-to-end encrypted.',
            unread: 0
        };

        setMyFriends([...myFriends, newFriend]);
        setFriendUidInput('');
        setShowAddFriend(false);
        setActiveChatId(newFriend.id);
        setViewMode('chats');
    };

    const handleSendMessage = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (inputValue.trim() && isNameSet && activeChatId) {
            const newMessage: Message = {
                id: Date.now() + Math.random(),
                user: userName,
                text: inputValue.trim(),
                timestamp: new Date().toISOString(),
                isSystem: false,
                avatar: undefined
            };
            wsService.sendMessage(inputValue);
            setMessages((prev) => [...prev, newMessage]);
            setInputValue(''); // Clear input

            // Update last message in list
            if (viewMode === 'chats') {
                setMyFriends(prev => prev.map(f => f.id === activeChatId ? { ...f, lastMessage: inputValue.substring(0, 30) } : f));
            }
        }
    };

    const handleCreateCommunity = (e: React.FormEvent) => {
        e.preventDefault();
        if (customCommunities.length >= MAX_CUSTOM_COMMUNITIES) { alert(`Maximum ${MAX_CUSTOM_COMMUNITIES} communities allowed`); return; }
        if (!newCommunity.name.trim() || !newCommunity.description.trim()) { alert('Please fill in all fields'); return; }
        const community: Community = { id: `custom-${Date.now()}`, name: newCommunity.name.trim(), iconKey: newCommunity.iconKey, members: 1, description: newCommunity.description.trim(), isCustom: true, role: 'Creator' };
        const updatedCustom = [...customCommunities, community];
        setCustomCommunities(updatedCustom);
        setJoinedCommunityIds(prev => [...prev, community.id]);
        setShowCreateDialog(false);
        setNewCommunity({ name: '', iconKey: availableIconKeys[0], description: '' });
        setActiveChatId(community.id);
        setViewMode('communities');
    };

    const handleJoinCommunity = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setJoinedCommunityIds(prev => { if (prev.includes(id)) return prev; return [...prev, id]; }); setActiveChatId(id); setViewMode('communities'); };
    const handleLeaveCommunity = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (confirm('Are you sure you want to leave this community?')) { setJoinedCommunityIds(prev => prev.filter(jid => jid !== id)); if (activeChatId === id) setActiveChatId(null); } };
    const isJoined = (id: string) => joinedCommunityIds.includes(id);

    // Avatar Management
    const openAvatarEditor = () => {
        setTempAvatarSeed(avatarSeed);
        setAvatarOptions([avatarSeed, ...Array.from({ length: 9 }, () => Math.random().toString(36).substring(7))]);
        setShowAvatarEditor(true);
    };

    const saveAvatar = () => {
        const storageOwner = user?.id || userUID || 'anon';
        const storageKey = `trek_finder_avatar_seed_${storageOwner}`;
        localStorage.setItem(storageKey, tempAvatarSeed);
        window.dispatchEvent(new Event('avatar-updated'));
        setShowAvatarEditor(false);
    };

    // Filter Logic
    const allCommunities = [...customCommunities];
    const filteredFriends = myFriends.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.id.includes(searchQuery));
    const filteredCommunities = allCommunities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Active Data Resolution
    const getActiveDetails = () => {
        if (!activeChatId) return null;
        const comm = allCommunities.find((c) => c.id === activeChatId);
        if (comm) return { type: 'community', data: comm };
        const friend = myFriends.find((f) => f.id === activeChatId);
        if (friend) return { type: 'friend', data: friend };
        return null;
    };
    const activeDetails = getActiveDetails();

    // Group Messages
    const groupedMessages = messages.reduce((groups: Record<string, Message[]>, msg) => {
        const date = new Date(msg.timestamp).toLocaleDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});


    if (!isNameSet) return <div className={styles['loading']}>Initializing...</div>;

    return (
        <div className={`${styles['app-container']} ${activeChatId ? styles['chat-active'] : ''} ${designStyles['dark-luxury']} ${designStyles['noise']}`}>

            {/* LEFT SIDE PANEL */}
            <div className={styles['side-panel']}>
                {/* Header: User Profile & Actions */}
                <header className={styles['view-header']} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 0, borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            className={styles['item-avatar']}
                            style={{ width: 40, height: 40, background: '#667781', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                            onClick={openAvatarEditor}
                            title="Click to edit avatar"
                        >
                            <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="My Avatar" width={40} height={40} unoptimized style={{ width: '100%', height: '100%' }} />
                            <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.6)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-overlay">
                                <RefreshCw size={14} color="#fff" />
                            </div>
                        </div>
                        <style jsx>{`
                            .avatar-overlay:hover { opacity: 1 !important; }
                        `}</style>
                        <div style={{ marginLeft: 12 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{userName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>UID: <span style={{ color: '#2bff88' }}>{userUID}</span></span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(userUID); alert('UID copied!'); }}
                                    title="Copy UID"
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}
                                >
                                    <Copy size={12} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        {/* Action Buttons */}
                    </div>
                </header>

                {/* Navigation Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', marginBottom: 10 }}>
                    <button
                        onClick={() => setViewMode('chats')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'none',
                            border: 'none',
                            color: viewMode === 'chats' ? '#2bff88' : 'rgba(255,255,255,0.4)',
                            borderBottom: viewMode === 'chats' ? '2px solid #2bff88' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}>
                        Chats
                    </button>
                    <button
                        onClick={() => setViewMode('communities')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'none',
                            border: 'none',
                            color: viewMode === 'communities' ? '#2bff88' : 'rgba(255,255,255,0.4)',
                            borderBottom: viewMode === 'communities' ? '2px solid #2bff88' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}>
                        Communities
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '0 20px 20px' }}>
                    <div className={styles['search-wrapper']}>
                        <Search size={18} className={styles['search-icon']} />
                        <input
                            type="text"
                            className={styles['search-input']}
                            placeholder={viewMode === 'chats' ? "Search connections..." : "Find communities..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* List Area */}
                <div className={styles['list-items']}>
                    {viewMode === 'chats' ? (
                        <>
                            <div
                                onClick={() => setShowAddFriend(true)}
                                className={styles['list-item']}
                                style={{ alignItems: 'center', color: '#2bff88' }}>
                                <div className={styles['item-icon']} style={{ width: 44, height: 44, background: 'rgba(43, 255, 136, 0.15)', fontSize: '1.2rem', color: '#2bff88' }}>
                                    <Plus size={20} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Add New Connection</span>
                            </div>

                            {filteredFriends.map(friend => (
                                <div
                                    key={friend.id}
                                    onClick={() => setActiveChatId(friend.id)}
                                    className={`${styles['list-item']} ${activeChatId === friend.id ? styles['active'] : ''}`}>
                                    <Image src={friend.avatar} alt={`${friend.name} avatar`} width={48} height={48} unoptimized className={styles['item-avatar']} style={{ background: '#fff' }} />
                                    <div className={styles['item-info']}>
                                        <div className={styles['item-top']}>
                                            <span style={{ color: '#fff', fontWeight: 500 }}>{friend.name}</span>
                                            <span className={styles['item-time']}>12:30</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className={styles['item-preview']}>{friend.lastMessage}</span>
                                            {friend.unread ? <span className={styles['unread-badge']}>{friend.unread}</span> : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        // COMMUNITIES LIST
                        <>
                            <div
                                onClick={() => setShowCreateDialog(true)}
                                className={styles['list-item']}
                                style={{ alignItems: 'center', color: '#2bff88' }}>
                                <div className={styles['item-icon']} style={{ width: 44, height: 44, background: 'rgba(43, 255, 136, 0.15)', fontSize: '1.2rem', color: '#2bff88' }}>
                                    <Plus size={20} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Create Community</span>
                            </div>

                            {filteredCommunities.map(comm => (
                                <div
                                    key={comm.id}
                                    onClick={() => { setActiveChatId(comm.id); }}
                                    className={`${styles['list-item']} ${activeChatId === comm.id ? styles['active'] : ''}`}>
                                    <div className={styles['item-icon']} style={{ fontSize: '1.2rem' }}>
                                        {getIconByKey(comm.iconKey)}
                                    </div>
                                    <div className={styles['item-info']}>
                                        <div className={styles['item-top']}>
                                            <span style={{ color: '#fff', fontWeight: 500 }}>{comm.name}</span>
                                            {isJoined(comm.id) && <Check size={14} color="#2bff88" />}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className={styles['item-preview']}>{comm.members} Members</span>
                                            {!isJoined(comm.id) && (
                                                <button
                                                    onClick={(e) => handleJoinCommunity(e, comm.id)}
                                                    style={{ background: '#2bff88', border: 'none', borderRadius: 4, padding: '2px 10px', color: '#000', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                                    JOIN
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* MAIN STAGE */}
            <div className={styles['main-stage']}>
                {!activeChatId || !activeDetails ? (
                    <div className={styles['empty-messages']}>
                        <div style={{ textAlign: 'center', opacity: 0.6 }}>
                            <div style={{ marginBottom: 20, display: 'inline-block', padding: 20, borderRadius: '50%', background: 'rgba(43, 255, 136, 0.05)', border: '1px solid rgba(43, 255, 136, 0.2)' }}>
                                <MessageSquare size={48} color="#2bff88" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 300, color: '#fff', marginBottom: 10 }}>Trekk Finder Web</h2>
                            <p>Connect with your tribe. Plan your next adventure.</p>
                        </div>
                    </div>
                ) : (
                    <div className={styles['chat-interface']}>
                        {/* Chat Header */}
                        <header className={styles['chat-header']}>
                            <div className={styles['header-left']}>
                                <button
                                    className={styles['mobile-back-btn']}
                                    onClick={() => setActiveChatId(null)}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className={styles['header-avatar']}>
                                    {activeDetails.type === 'community' ? getIconByKey((activeDetails.data as Community).iconKey) : <Image src={(activeDetails.data as Friend).avatar} alt={`${activeDetails.data.name} avatar`} width={40} height={40} unoptimized style={{ width: '100%' }} />}
                                </div>
                                <div className={styles['header-info']}>
                                    <h3>{activeDetails.data.name}</h3>
                                    <span>
                                        {activeDetails.type === 'community'
                                            ? `${(activeDetails.data as Community).members} members`
                                            : ((activeDetails.data as Friend).status === 'typing' ? 'typing...' : (activeDetails.data as Friend).status)}
                                    </span>
                                </div>
                            </div>
                            <div className={styles['header-actions']}>
                                <button className={styles['nav-btn']}><Search size={20} /></button>
                                {activeDetails.type === 'community' && isJoined(activeDetails.data.id) && (
                                    <button
                                        className={styles['nav-btn']}
                                        onClick={(e) => handleLeaveCommunity(e, activeDetails.data.id)}
                                        title="Leave Group"
                                    >
                                        <LogOut size={20} style={{ color: '#ff4444' }} />
                                    </button>
                                )}
                            </div>
                        </header>

                        {/* Messages Area */}
                        <div className={styles['messages-scroll']}>
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <React.Fragment key={date}>
                                    <div style={{ textAlign: 'center', margin: '15px 0' }}>
                                        <span className={styles['date-divider']}>
                                            {date === new Date().toLocaleDateString() ? 'Today' : date}
                                        </span>
                                    </div>
                                    {msgs.map((msg, idx) => (
                                        <div key={`${msg.id}-${idx}`} className={`${styles['message-row']} ${msg.user === userName ? styles['own'] : ''}`}>
                                            {msg.user !== userName && <div className={styles['msg-avatar']}>{msg.user.charAt(0).toUpperCase()}</div>}
                                            <div className={styles['message-bubble']}>
                                                {msg.user !== userName && <div className={styles['msg-name']}>{msg.user}</div>}
                                                <div className={styles['msg-text']}>{msg.text}</div>
                                                <div className={styles['msg-time']}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <footer className={styles['chat-input-area']}>
                            <button className={styles['emoji-btn']}><Smile size={24} /></button>
                            <button className={styles['attach-btn']}><Paperclip size={24} /></button>

                            <form onSubmit={handleSendMessage} className={styles['input-form']}>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                            </form>

                            <button onClick={handleSendMessage} className={styles['send-btn']}>
                                <Send size={20} />
                            </button>
                        </footer>
                    </div>
                )}
            </div >

            {/* Modals */}
            <AvatarEditor
                key={`${avatarSeed}-${showAvatarEditor}`}
                isOpen={showAvatarEditor}
                currentSeed={avatarSeed}
                initialOptions={avatarOptions}
                onClose={() => setShowAvatarEditor(false)}
                onSave={saveAvatar}
            />

            {
                showAddFriend && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                        <div style={{ width: 400, background: '#1a2c20', border: '1px solid #2bff88', borderRadius: 16, padding: 24, boxShadow: '0 0 30px rgba(43,255,136,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ color: '#fff', margin: 0 }}>Add Connection</h3>
                                <button onClick={() => setShowAddFriend(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X /></button>
                            </div>
                            <form onSubmit={handleAddFriend}>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontSize: '0.9rem' }}>Friend&apos;s 6-Digit UID</label>
                                    <input
                                        value={friendUidInput}
                                        onChange={(e) => setFriendUidInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="e.g. 123456"
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(43,255,136,0.3)', borderRadius: 8, padding: '12px', color: '#fff', outline: 'none', fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center' }}
                                    />
                                </div>
                                <button type="submit" style={{ width: '100%', padding: '12px', background: '#2bff88', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>ADD FRIEND</button>
                            </form>
                        </div>
                    </div>
                )
            }
            {
                showCreateDialog && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                        <div style={{ width: 400, background: '#1a2c20', border: '1px solid #2bff88', borderRadius: 16, padding: 24, boxShadow: '0 0 30px rgba(43,255,136,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ color: '#fff', margin: 0 }}>Create Community</h3>
                                <button onClick={() => setShowCreateDialog(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} color="#fff" /></button>
                            </div>
                            <form onSubmit={handleCreateCommunity}>
                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 5 }}>Name</label>
                                    <input style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: 10, borderRadius: 8 }} value={newCommunity.name} onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })} placeholder="Community Name" />
                                </div>

                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 8 }}>Choose Icon</label>
                                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 5 }}>
                                        {availableIconKeys.map((key) => (
                                            <div
                                                key={key}
                                                onClick={() => setNewCommunity({ ...newCommunity, iconKey: key })}
                                                style={{
                                                    padding: 10,
                                                    borderRadius: 8,
                                                    background: newCommunity.iconKey === key ? 'rgba(43, 255, 136, 0.2)' : 'rgba(255,255,255,0.05)',
                                                    border: newCommunity.iconKey === key ? '1px solid #2bff88' : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    color: newCommunity.iconKey === key ? '#2bff88' : '#fff',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {getIconByKey(key)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 15 }}>
                                    <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 5 }}>Description</label>
                                    <textarea style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: 10, borderRadius: 8 }} value={newCommunity.description} onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })} placeholder="What is this group about?" />
                                </div>
                                <button type="submit" style={{ width: '100%', padding: '12px', background: '#2bff88', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>CREATE</button>
                            </form>
                        </div>
                    </div>
                )}

        </div>
    );
};


export default function ChatPage() {
    return <ChatRoom />;
}
