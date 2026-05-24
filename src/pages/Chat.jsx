import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useNotifications } from '@/hooks/useNotifications';
import { useChatNotifications } from '@/context/ChatNotificationContext';
import { getRooms, getRoom, createDirect, createGroup, getMessages, deleteMessage, markRead } from '@/services/chatService';

const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch {}
};

// ── Icons ─────────────────────────────────────────────────────────────────

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
);
const PlusIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5v14" />
    </svg>
);
const UsersIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const MessageIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);
const TrashIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
);
const XIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

// ── Avatar ────────────────────────────────────────────────────────────────

const Avatar = ({ username, size = 28 }) => {
    const initials = username?.slice(0, 2).toUpperCase() || '?';
    const colors = ['#5E6A43', '#8B7355', '#4A6741', '#7B6652', '#3D5C3A'];
    const color = colors[username?.charCodeAt(0) % colors.length] || '#5E6A43';
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
        }}>
            {initials}
        </div>
    );
};

// ── New DM Modal ──────────────────────────────────────────────────────────

const NewDMModal = ({ onClose, onCreated }) => {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        if (!query.trim()) { setUsers([]); return; }
        setLoading(true);
        import('../services/api').then(({ API_URL, getHeaders }) => {
            fetch(`${API_URL}/users/?search=${encodeURIComponent(query)}`, { headers: getHeaders() })
                .then(r => r.json())
                .then(d => setUsers(d.results ?? d))
                .catch(() => setUsers([]))
                .finally(() => setLoading(false));
        });
    }, [query]);

    const startDM = async (userId) => {
        try {
            const room = await createDirect(userId);
            onCreated(room);
        } catch { }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 24,
                width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                border: '1px solid var(--border)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>New Direct Message</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><XIcon /></button>
                </div>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by username..."
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--background)',
                        color: 'var(--foreground)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                />
                <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {loading && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '8px 0' }}>Searching...</p>}
                    {!loading && query && users.length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '8px 0' }}>No users found.</p>
                    )}
                    {users.map(u => (
                        <div key={u.id} onClick={() => startDM(u.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Avatar username={u.username} size={30} />
                            <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{u.username}</p>
                                {(u.first_name || u.last_name) && (
                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>{`${u.first_name} ${u.last_name}`.trim()}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── New Group Modal ───────────────────────────────────────────────────────

const NewGroupModal = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) { setUsers([]); return; }
        setLoading(true);
        import('../services/api').then(({ API_URL, getHeaders }) => {
            fetch(`${API_URL}/users/?search=${encodeURIComponent(query)}`, { headers: getHeaders() })
                .then(r => r.json())
                .then(d => setUsers(d.results ?? d))
                .catch(() => setUsers([]))
                .finally(() => setLoading(false));
        });
    }, [query]);

    const toggle = (user) => {
        setSelected(prev =>
            prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
        );
    };

    const handleCreate = async () => {
        if (!name.trim() || selected.length === 0) return;
        try {
            const room = await createGroup(name.trim(), selected.map(u => u.id));
            onCreated(room);
        } catch { }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div style={{
                background: 'var(--card)', borderRadius: 12, padding: 24, width: 380,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid var(--border)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>New Group</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}><XIcon /></button>
                </div>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Group name..."
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--background)',
                        color: 'var(--foreground)', fontSize: 13, outline: 'none',
                        boxSizing: 'border-box', marginBottom: 10,
                    }}
                />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Add members..."
                    style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--background)',
                        color: 'var(--foreground)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                />
                {selected.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {selected.map(u => (
                            <span key={u.id} style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', background: 'var(--accent)', borderRadius: 20, fontSize: 12,
                            }}>
                                {u.username}
                                <span onClick={() => toggle(u)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
                            </span>
                        ))}
                    </div>
                )}
                <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 8 }}>
                    {loading && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '4px 0' }}>Searching...</p>}
                    {users.map(u => (
                        <div key={u.id} onClick={() => toggle(u)} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                            borderRadius: 8, cursor: 'pointer',
                            background: selected.find(s => s.id === u.id) ? 'var(--accent)' : 'transparent',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                            onMouseLeave={e => { if (!selected.find(s => s.id === u.id)) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Avatar username={u.username} size={26} />
                            <span style={{ fontSize: 13 }}>{u.username}</span>
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleCreate}
                    disabled={!name.trim() || selected.length === 0}
                    style={{
                        width: '100%', marginTop: 14, padding: '9px 0', borderRadius: 8,
                        border: 'none', cursor: (!name.trim() || selected.length === 0) ? 'default' : 'pointer',
                        background: (!name.trim() || selected.length === 0) ? 'var(--muted)' : 'var(--primary)',
                        color: (!name.trim() || selected.length === 0) ? 'var(--muted-foreground)' : 'var(--primary-foreground)',
                        fontWeight: 600, fontSize: 13,
                    }}
                >
                    Create Group
                </button>
            </div>
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────

export const Chat = () => {
    const { user } = useAuth();
    const { clearAll } = useChatNotifications();

    // Clear global badge when entering the chat page
    useEffect(() => { clearAll(); }, [clearAll]);

    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [input, setInput] = useState('');
    const [showDMModal, setShowDMModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Load rooms on mount and seed unread counts from DB
    useEffect(() => {
        getRooms()
            .then(rooms => {
                setRooms(rooms);
                const counts = {};
                rooms.forEach(r => { if (r.unread_count > 0) counts[r.id] = r.unread_count; });
                setUnreadCounts(counts);
            })
            .catch(() => { })
            .finally(() => setRoomsLoading(false));
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when room changes
    useEffect(() => {
        if (activeRoom) inputRef.current?.focus();
    }, [activeRoom]);

    // Global notifications for all rooms (sound + unread badge)
    const handleNotification = useCallback((data) => {
        const { room_id, sender_username, content } = data;
        const lastMessage = { content, sender: sender_username, created_at: new Date().toISOString() };
        setActiveRoom(current => {
            if (current?.id !== room_id) {
                setUnreadCounts(prev => ({ ...prev, [room_id]: (prev[room_id] || 0) + 1 }));
                playNotificationSound();
                setRooms(prev => {
                    const room = prev.find(r => r.id === room_id);
                    if (!room) {
                        // Room not in sidebar yet (e.g. added to a group after page load) — fetch and add it
                        getRoom(room_id)
                            .then(fetched => {
                                setRooms(list => {
                                    if (list.find(r => r.id === fetched.id)) return list;
                                    return [{ ...fetched, last_message: lastMessage }, ...list];
                                });
                            })
                            .catch(() => {});
                        return prev;
                    }
                    const updated = { ...room, last_message: lastMessage };
                    return [updated, ...prev.filter(r => r.id !== room_id)];
                });
            }
            return current;
        });
    }, []);
    useNotifications(handleNotification);

    // Open a room and load its history
    const openRoom = useCallback(async (room) => {
        if (room.id === activeRoom?.id) return;
        setActiveRoom(room);
        setUnreadCounts(prev => { const n = { ...prev }; delete n[room.id]; return n; });
        setMessages([]);
        setMessagesLoading(true);
        markRead(room.id).catch(() => {});
        try {
            const data = await getMessages(room.id);
            setMessages(data.results ?? data);
        } catch { }
        finally { setMessagesLoading(false); }
    }, [activeRoom]);

    // Real-time: receive messages from WebSocket
    const handleIncoming = useCallback((msg) => {
        setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            // Replace the optimistic temp message from the same sender with the real one
            const tempIdx = prev.findIndex(
                m => String(m.id).startsWith('temp-') &&
                     m.content === msg.content &&
                     m.sender?.username === msg.sender?.username
            );
            if (tempIdx !== -1) {
                const updated = [...prev];
                updated[tempIdx] = { id: msg.id, content: msg.content, sender: msg.sender, created_at: msg.created_at };
                return updated;
            }
            return [...prev, { id: msg.id, content: msg.content, sender: msg.sender, created_at: msg.created_at }];
        });
        // Bump room to top
        setRooms(prev => {
            const room = prev.find(r => r.id === activeRoom?.id);
            if (!room) return prev;
            const updated = { ...room, last_message: { content: msg.content, sender: msg.sender.username, created_at: msg.created_at } };
            return [updated, ...prev.filter(r => r.id !== room.id)];
        });
    }, [activeRoom]);

    const { sendMessage: wsSend } = useChatSocket(activeRoom?.id ?? null, handleIncoming);

    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || !activeRoom) return;
        setInput('');

        // Optimistic update
        const tempMsg = {
            id: `temp-${Date.now()}`,
            content: text,
            sender: { id: user.id, username: user.username },
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);
        wsSend(text);
    }, [input, activeRoom, user, wsSend]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            await deleteMessage(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch { }
    };

    const handleRoomCreated = (room) => {
        setShowDMModal(false);
        setShowGroupModal(false);
        setRooms(prev => {
            if (prev.find(r => r.id === room.id)) return prev;
            return [room, ...prev];
        });
        openRoom(room);
    };

    const groups = rooms.filter(r => r.room_type === 'group');
    const dms = rooms.filter(r => r.room_type === 'direct');

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {showDMModal && <NewDMModal onClose={() => setShowDMModal(false)} onCreated={handleRoomCreated} />}
            {showGroupModal && <NewGroupModal onClose={() => setShowGroupModal(false)} onCreated={handleRoomCreated} />}

            <div style={{
                display: 'flex', margin: '-1rem', marginTop: 0,
                height: 'calc(100vh - 3rem)', overflow: 'hidden',
            }}>

                {/* ── Left sidebar ──────────────────────────────────── */}
                <div style={{
                    width: 260, flexShrink: 0,
                    borderRight: '1px solid var(--border)',
                    background: 'var(--card)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Team Chat</span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ padding: '10px 12px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button onClick={() => setShowDMModal(true)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
                            background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                            color: 'var(--foreground)',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <MessageIcon /> New Direct Message
                        </button>
                        <button onClick={() => setShowGroupModal(true)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
                            background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                            color: 'var(--foreground)',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <UsersIcon /> New Group
                        </button>
                    </div>

                    {/* Room list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
                        {roomsLoading && (
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', padding: '20px 0' }}>
                                Loading...
                            </p>
                        )}

                        {groups.length > 0 && (
                            <>
                                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', padding: '10px 8px 4px' }}>
                                    Groups
                                </p>
                                {groups.map(room => (
                                    <RoomItem key={room.id} room={room} active={activeRoom?.id === room.id} unread={unreadCounts[room.id] || 0} onClick={() => openRoom(room)} />
                                ))}
                            </>
                        )}

                        {dms.length > 0 && (
                            <>
                                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', padding: '10px 8px 4px' }}>
                                    Direct Messages
                                </p>
                                {dms.map(room => (
                                    <RoomItem key={room.id} room={room} active={activeRoom?.id === room.id} unread={unreadCounts[room.id] || 0} onClick={() => openRoom(room)} />
                                ))}
                            </>
                        )}

                        {!roomsLoading && rooms.length === 0 && (
                            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', padding: '20px 8px' }}>
                                No chats yet. Start a DM or create a group.
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Right panel ───────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--background)' }}>

                    {/* Header */}
                    <div style={{
                        padding: '12px 24px', borderBottom: '1px solid var(--border)',
                        background: 'var(--card)', flexShrink: 0, minHeight: 49,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        {activeRoom ? (
                            <>
                                {activeRoom.room_type === 'group'
                                    ? <UsersIcon />
                                    : <Avatar username={activeRoom.display_name} size={26} />
                                }
                                <span style={{ fontSize: 15, fontWeight: 600 }}>{activeRoom.display_name}</span>
                                {activeRoom.room_type === 'group' && (
                                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                                        · {activeRoom.members?.length ?? 0} members
                                    </span>
                                )}
                            </>
                        ) : (
                            <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
                                Select a conversation to start chatting
                            </span>
                        )}
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                        {!activeRoom && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--muted-foreground)' }}>
                                <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--foreground)' }}>Team Chat</p>
                                <p style={{ fontSize: 14 }}>Connect with your coworkers in real time.</p>
                            </div>
                        )}

                        {activeRoom && messagesLoading && (
                            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', padding: '20px 0' }}>
                                Loading messages...
                            </p>
                        )}

                        {activeRoom && !messagesLoading && messages.length === 0 && (
                            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)', padding: '30px 0' }}>
                                No messages yet. Say hello!
                            </p>
                        )}

                        {messages.map((msg) => {
                            const isOwn = msg.sender?.id === user?.id || msg.sender?.username === user?.username;
                            return (
                                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                                    style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 12, alignItems: 'flex-end', gap: 8 }}
                                >
                                    {!isOwn && <Avatar username={msg.sender?.username} size={28} />}

                                    <div style={{ maxWidth: '68%' }}>
                                        {!isOwn && (
                                            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 3, marginLeft: 4 }}>
                                                {msg.sender?.username}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                                            <div style={{
                                                padding: '9px 13px',
                                                borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                background: isOwn ? 'var(--primary)' : 'var(--card)',
                                                color: isOwn ? 'var(--primary-foreground)' : 'var(--foreground)',
                                                border: isOwn ? 'none' : '1px solid var(--border)',
                                                fontSize: 14, wordBreak: 'break-word',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                            }}>
                                                {msg.content}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                                <span style={{ fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                                                    {formatTime(msg.created_at)}
                                                </span>
                                                {isOwn && !msg.id?.toString().startsWith('temp-') && (
                                                    <button onClick={() => handleDeleteMessage(msg.id)} title="Delete" style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: 'var(--muted-foreground)', padding: 2, borderRadius: 4, display: 'flex',
                                                        opacity: 0.5,
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    {activeRoom && (
                        <div style={{
                            padding: '14px 24px', borderTop: '1px solid var(--border)',
                            background: 'var(--card)', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 800, margin: '0 auto' }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Message ${activeRoom.display_name}...`}
                                    rows={1}
                                    style={{
                                        flex: 1, resize: 'none',
                                        border: '1px solid var(--border)', borderRadius: 12,
                                        padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
                                        background: 'var(--background)', color: 'var(--foreground)',
                                        outline: 'none', fontFamily: 'inherit',
                                        maxHeight: 120, overflowY: 'auto',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--ring)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    onInput={e => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    style={{
                                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                        background: !input.trim() ? 'var(--muted)' : 'var(--primary)',
                                        color: !input.trim() ? 'var(--muted-foreground)' : 'var(--primary-foreground)',
                                        border: 'none', cursor: !input.trim() ? 'default' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <SendIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// ── Room list item ─────────────────────────────────────────────────────────

const RoomItem = ({ room, active, unread, onClick }) => (
    <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 8px', borderRadius: 8, cursor: 'pointer',
        background: active ? 'var(--accent)' : 'transparent',
        borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        transition: 'background 0.12s',
    }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--muted)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
        {room.room_type === 'group'
            ? <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UsersIcon /></div>
            : <Avatar username={room.display_name} size={30} />
        }
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: (unread > 0 || active) ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {room.display_name}
            </p>
            {room.last_message && (
                <p style={{ margin: 0, fontSize: 11, color: unread > 0 ? 'var(--foreground)' : 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
                    {room.last_message.sender}: {room.last_message.content}
                </p>
            )}
        </div>
        {unread > 0 && (
            <div style={{
                minWidth: 18, height: 18, borderRadius: 9, flexShrink: 0,
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
            }}>
                {unread > 99 ? '99+' : unread}
            </div>
        )}
    </div>
);
