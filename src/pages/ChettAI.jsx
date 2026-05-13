import { useState, useRef, useEffect, useCallback } from "react";
import {
    sendMessage, getConversations, getConversation,
    renameConversation, deleteConversation,
} from "../services/aiService";

// ── Inline icons ──────────────────────────────────────────────────────────

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
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
);
const PencilIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────

function groupByDate(conversations) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const last7 = new Date(today); last7.setDate(today.getDate() - 7);
    const last30 = new Date(today); last30.setDate(today.getDate() - 30);

    const groups = { Today: [], Yesterday: [], "Last 7 days": [], "Last 30 days": [], Older: [] };
    for (const c of conversations) {
        const d = new Date(c.updated_at);
        if (d >= today) groups.Today.push(c);
        else if (d >= yesterday) groups.Yesterday.push(c);
        else if (d >= last7) groups["Last 7 days"].push(c);
        else if (d >= last30) groups["Last 30 days"].push(c);
        else groups.Older.push(c);
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0);
}

// ── Markdown renderer ─────────────────────────────────────────────────────

function parseInline(text, key) {
    const parts = [];
    const regex = /(\*\*([^*\n]+)\*\*)|(\*([^*\n]+)\*)|(`([^`\n]+)`)/g;
    let last = 0, match, i = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        if (match[1]) parts.push(<strong key={`${key}-b${i++}`}>{match[2]}</strong>);
        else if (match[3]) parts.push(<em key={`${key}-i${i++}`}>{match[4]}</em>);
        else if (match[5]) parts.push(
            <code key={`${key}-c${i++}`} style={{ background: "var(--muted)", padding: "1px 5px", borderRadius: 4, fontSize: "0.88em", fontFamily: "monospace" }}>
                {match[6]}
            </code>
        );
        last = regex.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}

function MarkdownContent({ text }) {
    const lines = text.split("\n");
    const elements = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code block
        if (line.trimStart().startsWith("```")) {
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            elements.push(
                <pre key={i} style={{ background: "var(--muted)", padding: "10px 12px", borderRadius: 8, fontSize: 12, overflowX: "auto", margin: "6px 0", fontFamily: "monospace", whiteSpace: "pre" }}>
                    {codeLines.join("\n")}
                </pre>
            );
            i++;
            continue;
        }

        // Headings
        const hMatch = line.match(/^(#{1,3})\s+(.*)/);
        if (hMatch) {
            const level = hMatch[1].length;
            const sizes = { 1: 17, 2: 15, 3: 14 };
            elements.push(
                <p key={i} style={{ fontWeight: 700, fontSize: sizes[level], margin: "8px 0 4px" }}>
                    {parseInline(hMatch[2], `h${i}`)}
                </p>
            );
            i++; continue;
        }

        // Bullet list — collect consecutive items
        if (line.match(/^[-*]\s/)) {
            const items = [];
            while (i < lines.length && lines[i].match(/^[-*]\s/)) {
                items.push(<li key={i}>{parseInline(lines[i].slice(2), `li${i}`)}</li>);
                i++;
            }
            elements.push(<ul key={`ul${i}`} style={{ paddingLeft: 18, margin: "4px 0", listStyleType: "disc" }}>{items}</ul>);
            continue;
        }

        // Numbered list — collect consecutive items
        if (line.match(/^\d+\.\s/)) {
            const items = [];
            while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
                items.push(<li key={i}>{parseInline(lines[i].replace(/^\d+\.\s/, ""), `li${i}`)}</li>);
                i++;
            }
            elements.push(<ol key={`ol${i}`} style={{ paddingLeft: 18, margin: "4px 0" }}>{items}</ol>);
            continue;
        }

        // Empty line → small spacer
        if (line.trim() === "") {
            elements.push(<div key={i} style={{ height: 6 }} />);
            i++; continue;
        }

        // Regular paragraph
        elements.push(
            <p key={i} style={{ margin: "2px 0", lineHeight: 1.6 }}>
                {parseInline(line, `p${i}`)}
            </p>
        );
        i++;
    }

    return <div>{elements}</div>;
}

// ── Typing dots ───────────────────────────────────────────────────────────

const TypingDots = () => (
    <div className="flex gap-1 items-center px-1 py-0.5">
        {[0, 1, 2].map(i => (
            <span key={i} style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: "var(--muted-foreground)",
                animation: "chett-dot 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
            }} />
        ))}
    </div>
);

// ── Message bubble ────────────────────────────────────────────────────────

const Bubble = ({ role, content }) => {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
            <div style={{
                maxWidth: "72%",
                padding: "10px 14px",
                borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isUser ? "var(--primary)" : "var(--card)",
                color: isUser ? "var(--primary-foreground)" : "var(--foreground)",
                border: isUser ? "none" : "1px solid var(--border)",
                fontSize: 14,
                wordBreak: "break-word",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}>
                {isUser ? content : <MarkdownContent text={content} />}
            </div>
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────

export const ChettAI = () => {
    // Conversations sidebar
    const [conversations, setConversations] = useState([]);
    const [convLoading, setConvLoading] = useState(true);

    // Active conversation
    const [convId, setConvId] = useState(null);
    const [convName, setConvName] = useState("");
    const [messages, setMessages] = useState([]);

    // Rename inline
    const [renamingId, setRenamingId] = useState(null);
    const [renameVal, setRenameVal] = useState("");

    // Chat input
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const renameInputRef = useRef(null);

    // Load conversation list on mount
    useEffect(() => {
        getConversations()
            .then(setConversations)
            .catch(() => { })
            .finally(() => setConvLoading(false));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    useEffect(() => {
        if (!sending) inputRef.current?.focus();
    }, [convId, sending]);

    const openConversation = useCallback(async (id) => {
        if (id === convId) return;
        try {
            const data = await getConversation(id);
            setConvId(data.id);
            setConvName(data.name);
            setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
        } catch { }
    }, [convId]);

    const startNew = useCallback(() => {
        setConvId(null);
        setConvName("");
        setMessages([]);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || sending) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setSending(true);

        try {
            const res = await sendMessage(text, convId);
            setMessages(prev => [...prev, { role: "assistant", content: res.assistant_message }]);

            if (!convId) {
                // New conversation was auto-created
                const newConv = {
                    id: res.conversation_id,
                    name: res.conversation_name,
                    updated_at: new Date().toISOString(),
                };
                setConvId(res.conversation_id);
                setConvName(res.conversation_name);
                setConversations(prev => [newConv, ...prev]);
            } else {
                // Bump updated_at in sidebar
                setConversations(prev =>
                    prev.map(c => c.id === convId ? { ...c, updated_at: new Date().toISOString(), name: res.conversation_name } : c)
                );
                setConvName(res.conversation_name);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
        } finally {
            setSending(false);
        }
    }, [input, sending, convId]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const startRename = (conv, e) => {
        e.stopPropagation();
        setRenamingId(conv.id);
        setRenameVal(conv.name);
        setTimeout(() => renameInputRef.current?.focus(), 30);
    };

    const commitRename = async (id) => {
        if (!renameVal.trim()) { setRenamingId(null); return; }
        try {
            await renameConversation(id, renameVal.trim());
            setConversations(prev => prev.map(c => c.id === id ? { ...c, name: renameVal.trim() } : c));
            if (id === convId) setConvName(renameVal.trim());
        } catch { }
        setRenamingId(null);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (id === convId) startNew();
        } catch { }
    };

    const grouped = groupByDate(conversations);

    return (
        <>
            <style>{`
                @keyframes chett-dot {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            {/* Full-bleed container that overrides AdminLayout's p-4 */}
            <div style={{
                display: "flex",
                margin: "-1rem",
                marginTop: 0,
                height: "calc(100vh - 3rem)",
                overflow: "hidden",
            }}>

                {/* ── Left sidebar ─────────────────────────────────────── */}
                <div style={{
                    width: 260,
                    flexShrink: 0,
                    borderRight: "1px solid var(--border)",
                    background: "var(--card)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}>
                    {/* Header */}
                    <div style={{
                        padding: "14px 16px 10px",
                        borderBottom: "1px solid var(--border)",
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Chett AI</span>
                    </div>

                    {/* New conversation button */}
                    <div style={{ padding: "10px 12px 6px" }}>
                        <button
                            onClick={startNew}
                            style={{
                                width: "100%",
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--foreground)",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                            <PlusIcon /> New conversation
                        </button>
                    </div>

                    {/* Conversation list */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
                        {convLoading && (
                            <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "20px 0" }}>
                                Loading...
                            </p>
                        )}
                        {!convLoading && conversations.length === 0 && (
                            <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", padding: "20px 0" }}>
                                No conversations yet.
                            </p>
                        )}
                        {grouped.map(([label, items]) => (
                            <div key={label}>
                                <p style={{
                                    fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                                    textTransform: "uppercase", color: "var(--muted-foreground)",
                                    padding: "10px 8px 4px",
                                }}>
                                    {label}
                                </p>
                                {items.map(conv => (
                                    <div
                                        key={conv.id}
                                        onClick={() => openConversation(conv.id)}
                                        style={{
                                            display: "flex", alignItems: "center",
                                            padding: "7px 8px",
                                            borderRadius: 7,
                                            cursor: "pointer",
                                            background: conv.id === convId ? "var(--accent)" : "transparent",
                                            borderLeft: conv.id === convId ? "3px solid var(--primary)" : "3px solid transparent",
                                            transition: "background 0.12s",
                                            gap: 6,
                                        }}
                                        onMouseEnter={e => { if (conv.id !== convId) e.currentTarget.style.background = "var(--muted)"; }}
                                        onMouseLeave={e => { if (conv.id !== convId) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        {renamingId === conv.id ? (
                                            <input
                                                ref={renameInputRef}
                                                value={renameVal}
                                                onChange={e => setRenameVal(e.target.value)}
                                                onBlur={() => commitRename(conv.id)}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") commitRename(conv.id);
                                                    if (e.key === "Escape") setRenamingId(null);
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    flex: 1, fontSize: 12, border: "none",
                                                    borderBottom: "1px solid var(--primary)",
                                                    background: "transparent", outline: "none",
                                                    color: "var(--foreground)",
                                                }}
                                            />
                                        ) : (
                                            <span style={{
                                                flex: 1, fontSize: 12, fontWeight: conv.id === convId ? 600 : 400,
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                color: "var(--foreground)",
                                            }}>
                                                {conv.name}
                                            </span>
                                        )}

                                        {/* Actions — only visible on active or hover (CSS trick via group) */}
                                        <div
                                            className="conv-actions"
                                            style={{ display: "flex", gap: 2, flexShrink: 0 }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                title="Rename"
                                                onClick={(e) => startRename(conv, e)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 3, borderRadius: 4, display: "flex" }}
                                            >
                                                <PencilIcon />
                                            </button>
                                            <button
                                                title="Delete"
                                                onClick={(e) => handleDelete(conv.id, e)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 3, borderRadius: 4, display: "flex" }}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Right panel ──────────────────────────────────────── */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    background: "var(--background)",
                }}>
                    {/* Chat header */}
                    <div style={{
                        padding: "12px 24px",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--card)",
                        flexShrink: 0,
                        minHeight: 49,
                        display: "flex",
                        alignItems: "center",
                    }}>
                        {convName ? (
                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>{convName}</span>
                        ) : (
                            <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Start a new conversation</span>
                        )}
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                        {messages.length === 0 && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--muted-foreground)" }}>
                                <p style={{ fontWeight: 700, fontSize: 20, color: "var(--foreground)" }}>
                                    Hi! I'm Chett AI.
                                </p>
                                <p style={{ fontSize: 14 }}>
                                    Ask me anything about your CRM data.
                                </p>
                                <p style={{ fontSize: 12 }}>
                                    I can query clients, invoices, leads, services, and more.
                                </p>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <Bubble key={i} role={m.role} content={m.content} />
                        ))}

                        {sending && (
                            <div className="flex justify-start mb-4">
                                <div style={{
                                    padding: "10px 14px",
                                    borderRadius: "18px 18px 18px 4px",
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                }}>
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <div style={{
                        padding: "16px 24px",
                        borderTop: "1px solid var(--border)",
                        background: "var(--card)",
                        flexShrink: 0,
                    }}>
                        <div style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-end",
                            maxWidth: 800,
                            margin: "0 auto",
                        }}>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about your CRM data..."
                                rows={1}
                                disabled={sending}
                                style={{
                                    flex: 1, resize: "none",
                                    border: "1px solid var(--border)",
                                    borderRadius: 12,
                                    padding: "10px 14px",
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    background: "var(--background)",
                                    color: "var(--foreground)",
                                    outline: "none",
                                    fontFamily: "inherit",
                                    maxHeight: 120,
                                    overflowY: "auto",
                                    transition: "border-color 0.15s",
                                }}
                                onFocus={e => e.target.style.borderColor = "var(--ring)"}
                                onBlur={e => e.target.style.borderColor = "var(--border)"}
                                onInput={e => {
                                    e.target.style.height = "auto";
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || sending}
                                style={{
                                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                    background: (!input.trim() || sending) ? "var(--muted)" : "var(--primary)",
                                    color: (!input.trim() || sending) ? "var(--muted-foreground)" : "var(--primary-foreground)",
                                    border: "none",
                                    cursor: (!input.trim() || sending) ? "default" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "background 0.15s",
                                }}
                            >
                                <SendIcon />
                            </button>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center", marginTop: 8 }}>
                            Chett AI can make mistakes. Verify important data before acting on it.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};
