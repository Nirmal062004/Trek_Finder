'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import styles from '@/styles/ChatRoom.module.css';
import wsService from '@/shared/services/websocket';
import { Compass, MessageSquare, Users, LogOut, Search, Plus, Trash2, Paperclip, Smile, Send, Check, X, RefreshCw, Save, Copy } from 'lucide-react';
import { getIconByKey, availableIconKeys, iconRegistry, Community } from '@/shared/services/communityData';

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

interface ChatRoomProps {
    selectedTrek: any;
    onClose: () => void;
}

const STORAGE_KEY_CUSTOM = 'trek_finder_custom_communities';
const STORAGE_KEY_JOINED = 'trek_finder_joined_communities';
const STORAGE_KEY_MESSAGES = 'trek_finder_chat_messages';
const STORAGE_KEY_FRIENDS = 'trek_finder_friends';


const ChatRoom: React.FC<ChatRoomProps> = ({ selectedTrek, onClose }) => {
    const { user } = useAuth();
    const [userName, setUserName] = useState('Anonymous');
    const [userUID, setUserUID] = useState('');
    const [avatarSeed, setAvatarSeed] = useState('');
    const [isNameSet, setIsNameSet] = useState(false);

    // UI States
    const [viewMode, setViewMode] = useState<'chats' | 'communities'>('chats');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [tempAvatarSeed, setTempAvatarSeed] = useState('');
    const [friendUidInput, setFriendUidInput] = useState('');

    // Data States
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [myFriends, setMyFriends] = useState<Friend[]>([]);
    const [customCommunities, setCustomCommunities] = useState<Community[]>([]);
    const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newCommunity, setNewCommunity] = useState({ name: '', iconKey: availableIconKeys[0], description: '' });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const MAX_CUSTOM_COMMUNITIES = 3;

    // Initialization
    useEffect(() => {
        if (user) {
            const name = user.name || user.email?.split('@')[0] || 'Anonymous';
            setUserName(name);

            // Generate or retrieve persistent UID
            let uid = localStorage.getItem('trek_finder_uid');
            if (!uid) {
                uid = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit ID
                localStorage.setItem('trek_finder_uid', uid);
            }
            setUserUID(uid);

            // Load or init Avatar Seed
            let seed = localStorage.getItem('trek_finder_avatar_seed');
            if (!seed) {
                seed = name; // Default to username
                localStorage.setItem('trek_finder_avatar_seed', seed);
            }
            setAvatarSeed(seed);

            setIsNameSet(true);
        }
    }, [user]);

    useEffect(() => {
        // Load Friends
        const savedFriends = localStorage.getItem(STORAGE_KEY_FRIENDS);
        if (savedFriends) {
            try { setMyFriends(JSON.parse(savedFriends)); } catch (e) { setMyFriends([]); }
        } else {
            setMyFriends([]);
        }

        // Load Communities... (Same as before)
        const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM);
        if (savedCustom) try { setCustomCommunities(JSON.parse(savedCustom)); } catch (e) { }

        const savedJoined = localStorage.getItem(STORAGE_KEY_JOINED);
        if (savedJoined) try { setJoinedCommunityIds(JSON.parse(savedJoined)); } catch (e) { }

    }, []);

    // Persist Friends
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(myFriends));
    }, [myFriends]);

    useEffect(() => { localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customCommunities)); }, [customCommunities]);
    useEffect(() => { localStorage.setItem(STORAGE_KEY_JOINED, JSON.stringify(joinedCommunityIds)); }, [joinedCommunityIds]);

    useEffect(() => {
        if (isNameSet) {
            wsService.connect(userName, 'general');
            const handleMessage = (message: Message) => setMessages((prev) => [...prev, message]);
            wsService.onMessage(handleMessage);
            return () => { wsService.disconnect(); };
        }
    }, [isNameSet, userName]);

    useEffect(() => {
        if (activeChatId) {
            const savedMessages = localStorage.getItem(`${STORAGE_KEY_MESSAGES}_${activeChatId}`);
            if (savedMessages) {
                try { setMessages(JSON.parse(savedMessages)); } catch (e) { setMessages([]); }
            } else { setMessages([]); }
        }
    }, [activeChatId]);

    useEffect(() => {
        if (activeChatId && messages.length > 0) {
            const recent = messages.slice(-50);
            localStorage.setItem(`${STORAGE_KEY_MESSAGES}_${activeChatId}`, JSON.stringify(recent));
        }
    }, [messages, activeChatId]);

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

    const handleDeleteCommunity = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (confirm('Are you sure you want to delete this community?')) { const updatedCustom = customCommunities.filter((c) => c.id !== id); setCustomCommunities(updatedCustom); setJoinedCommunityIds(prev => prev.filter(jid => jid !== id)); if (activeChatId === id) setActiveChatId(null); } };

    const handleJoinCommunity = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setJoinedCommunityIds(prev => { if (prev.includes(id)) return prev; return [...prev, id]; }); setActiveChatId(id); setViewMode('communities'); };
    const handleLeaveCommunity = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (confirm('Are you sure you want to leave this community?')) { setJoinedCommunityIds(prev => prev.filter(jid => jid !== id)); if (activeChatId === id) setActiveChatId(null); } };
    const isJoined = (id: string) => joinedCommunityIds.includes(id);

    const [avatarOptions, setAvatarOptions] = useState<string[]>([]);

    // Avatar Management
    const openAvatarEditor = () => {
        setTempAvatarSeed(avatarSeed);
        generateAvatarOptions(avatarSeed);
        setShowAvatarEditor(true);
    };

    const generateAvatarOptions = (currentSeed: string) => {
        const options = [currentSeed]; // Keep current as first option
        for (let i = 0; i < 9; i++) {
            options.push(Math.random().toString(36).substring(7));
        }
        setAvatarOptions(options);
    };

    const refreshOptions = () => {
        generateAvatarOptions(tempAvatarSeed); // keep selected one
    };

    const saveAvatar = () => {
        setAvatarSeed(tempAvatarSeed);
        localStorage.setItem('trek_finder_avatar_seed', tempAvatarSeed);
        window.dispatchEvent(new Event('avatar-updated')); // Notify Navigation
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
        <div className={styles['app-container']}>

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
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="My Avatar" style={{ width: '100%', height: '100%' }} />
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
                                    <img src={friend.avatar} className={styles['item-avatar']} style={{ background: '#fff' }} />
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
                                <div className={styles['header-avatar']}>
                                    {activeDetails.type === 'community' ? getIconByKey((activeDetails.data as Community).iconKey) : <img src={(activeDetails.data as Friend).avatar} style={{ width: '100%' }} />}
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
            {
                showAvatarEditor && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                        <div style={{ width: 450, background: '#1a2c20', border: '1px solid #2bff88', borderRadius: 24, padding: 32, boxShadow: '0 0 40px rgba(43,255,136,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h3 style={{ color: '#fff', margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 600 }}>Choose Your Avatar</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24, width: '100%' }}>
                                {avatarOptions.map((seed, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setTempAvatarSeed(seed)}
                                        style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            borderRadius: '50%',
                                            background: '#fff',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            border: tempAvatarSeed === seed ? '3px solid #2bff88' : '2px solid rgba(255,255,255,0.1)',
                                            transform: tempAvatarSeed === seed ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={`Option ${idx}`} style={{ width: '100%', height: '100%' }} />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                                <button
                                    onClick={refreshOptions}
                                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                                    <RefreshCw size={18} /> New Options
                                </button>
                                <button
                                    onClick={saveAvatar}
                                    style={{ flex: 1, padding: '12px', background: '#2bff88', border: 'none', borderRadius: 12, color: '#000', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Save size={18} /> Save Selection
                                </button>
                            </div>
                            <button
                                onClick={() => setShowAvatarEditor(false)}
                                style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )
            }

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
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontSize: '0.9rem' }}>Friend's 6-Digit UID</label>
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
    const router = useRouter();
    const handleClose = () => { router.push('/'); };
    return <ChatRoom selectedTrek={null} onClose={handleClose} />;
}
