import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as XLSX from "xlsx";
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { formatDateTz } from "../utils/tz";
import { sendMessage, getConversations, getConversation, renameConversation, deleteConversation } from "../services/aiService";

// Palette for charts (olive-forward, matches the brand).
const CHART_COLORS = ["#5E6A43", "#B0592E", "#2f9e3a", "#9b7a2e", "#4a5535", "#C9A227", "#6b6560", "#3CC647"];

// Renders a single report: an optional chart, the data table, an Export to
// Excel button, and a note when the dataset was capped. SQL is never shown.
export const ReportBlock = ({ report }) => {
    const { title, columns = [], rows = [], truncated, row_cap, chart_spec } = report || {};
    if (!columns.length) return null;

    const exportExcel = () => {
        // One sheet, headers = columns, native cell types (numbers/dates stay typed).
        const aoa = [columns, ...rows.map((r) => columns.map((c) => r[c]))];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, (title || "Report").slice(0, 31));
        const safe = (title || "report").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
        XLSX.writeFile(wb, `${safe}.xlsx`);
    };

    const renderChart = () => {
        if (!chart_spec || !chart_spec.x || !chart_spec.y) return null;
        const { type, x, y } = chart_spec;
        // recharts needs numeric y values.
        const data = rows.map((r) => ({ ...r, [y]: Number(r[y]) })).filter((r) => !isNaN(r[y]));
        if (!data.length) return null;
        return (
            <div style={{ width: "100%", height: 200, marginBottom: 8 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    {type === "pie" ? (
                        <PieChart>
                            <Pie data={data} dataKey={y} nameKey={x} outerRadius={70} label>
                                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    ) : type === "line" ? (
                        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D4" />
                            <XAxis dataKey={x} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey={y} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                        </LineChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D4" />
                            <XAxis dataKey={x} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey={y} fill={CHART_COLORS[0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div style={{ marginTop: 10, border: "1px solid #D8D2C4", borderRadius: 10, overflow: "hidden", background: "#FFFFFF" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", background: "#F2EBDD", borderBottom: "1px solid #D8D2C4" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#2E2A26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Report"}</span>
                <button
                    onClick={exportExcel}
                    style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "#FBF7EF", background: "#5E6A43", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                >
                    Export to Excel
                </button>
            </div>
            <div style={{ padding: 10 }}>
                {renderChart()}
                <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #E7E1D4", borderRadius: 6 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                        <thead>
                            <tr style={{ background: "#5E6A43" }}>
                                {columns.map((c) => (
                                    <th key={c} style={{ color: "#FBF7EF", textAlign: "left", padding: "6px 8px", position: "sticky", top: 0, background: "#5E6A43", whiteSpace: "nowrap" }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, ri) => (
                                <tr key={ri} style={{ borderBottom: "1px solid #EDE7D8" }}>
                                    {columns.map((c) => (
                                        <td key={c} style={{ padding: "5px 8px", color: "#2E2A26", whiteSpace: "nowrap" }}>
                                            {r[c] === null || r[c] === undefined ? "—" : String(r[c])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {truncated && (
                    <p style={{ margin: "6px 2px 0", fontSize: 10.5, color: "#9b948e" }}>
                        Showing the first {row_cap?.toLocaleString?.() || row_cap} rows. Narrow your request (by date, status, etc.) to see a more specific set.
                    </p>
                )}
            </div>
        </div>
    );
};

// ── Icons (inline SVGs — no extra package needed) ─────────────────────────

const BotIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
    </svg>
);

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5v14" />
    </svg>
);

const ChevronIcon = ({ dir = "left" }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === "right" ? "rotate(180deg)" : undefined }}>
        <path d="m15 18-6-6 6-6" />
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

// ── Typing indicator ───────────────────────────────────────────────────────

const TypingDots = () => (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "8px 12px" }}>
        {[0, 1, 2].map(i => (
            <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--muted-foreground)",
                animation: "chett-dot 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
                opacity: 0.6,
            }} />
        ))}
    </div>
);

// ── Message bubble ─────────────────────────────────────────────────────────

export const MessageBubble = ({ role, content, reports }) => {
    const isUser = role === "user";
    const hasReports = !isUser && Array.isArray(reports) && reports.length > 0;
    return (
        <div style={{
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            marginBottom: 8,
        }}>
            <div style={{
                maxWidth: hasReports ? "96%" : "80%",
                width: hasReports ? "96%" : "auto",
                padding: "8px 12px",
                borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isUser ? "var(--primary)" : "var(--muted)",
                color: isUser ? "var(--primary-foreground)" : "var(--foreground)",
                fontSize: 13,
                lineHeight: 1.5,
                wordBreak: "break-word",
            }}>
                {isUser ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
                ) : (
                    <div className="chett-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ""}</ReactMarkdown>
                    </div>
                )}
                {hasReports && reports.map((rep, i) => <ReportBlock key={i} report={rep} />)}
            </div>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────

export const ClimateChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState("chat"); // "chat" | "history"

    // current conversation
    const [convId, setConvId] = useState(null);
    const [convName, setConvName] = useState("New Conversation");
    const [messages, setMessages] = useState([]);

    // history panel
    const [conversations, setConversations] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // rename state
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState("");

    // input
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        if (isOpen && view === "chat") inputRef.current?.focus();
    }, [isOpen, view]);

    const openHistory = useCallback(async () => {
        setView("history");
        setHistoryLoading(true);
        try {
            const data = await getConversations();
            setConversations(data);
        } catch {
            // ignore
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const loadConversation = useCallback(async (id, name) => {
        try {
            const data = await getConversation(id);
            setConvId(id);
            setConvName(data.name);
            setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
            setView("chat");
        } catch {
            // ignore
        }
    }, []);

    const startNewConversation = useCallback(() => {
        setConvId(null);
        setConvName("New Conversation");
        setMessages([]);
        setView("chat");
    }, []);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setLoading(true);

        try {
            const res = await sendMessage(text, convId);
            setConvId(res.conversation_id);
            setConvName(res.conversation_name);
            setMessages(prev => [...prev, { role: "assistant", content: res.assistant_message, reports: res.reports || [] }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [input, loading, convId]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleRename = async () => {
        if (!convId || !renameVal.trim()) { setRenaming(false); return; }
        try {
            await renameConversation(convId, renameVal.trim());
            setConvName(renameVal.trim());
        } catch { }
        setRenaming(false);
    };

    const handleDeleteConv = async (id, e) => {
        e.stopPropagation();
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (id === convId) startNewConversation();
        } catch { }
    };

    const toggleOpen = () => {
        setIsOpen(o => !o);
        if (!isOpen) setView("chat");
    };

    return (
        <>
            {/* keyframe injection */}
            <style>{`
                @keyframes chett-dot {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes chett-slide-up {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                /* Markdown rendering inside assistant bubbles (compact). */
                .chett-md > *:first-child { margin-top: 0; }
                .chett-md > *:last-child { margin-bottom: 0; }
                .chett-md p { margin: 0 0 8px; }
                .chett-md ul, .chett-md ol { margin: 0 0 8px; padding-left: 18px; }
                .chett-md li { margin: 2px 0; }
                .chett-md h1, .chett-md h2, .chett-md h3 { font-size: 13px; font-weight: 700; margin: 8px 0 4px; }
                .chett-md code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 4px; font-size: 12px; }
                .chett-md a { color: #5E6A43; text-decoration: underline; }
                .chett-md table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 12px; display: block; overflow-x: auto; }
                .chett-md th, .chett-md td { border: 1px solid #E7E1D4; padding: 4px 8px; text-align: left; }
                .chett-md th { background: #F2EBDD; font-weight: 700; }
            `}</style>

            {/* ── Floating toggle button ── */}
            <button
                onClick={toggleOpen}
                title="Chett AI"
                style={{
                    position: "fixed", bottom: 20, right: 40, zIndex: 9999,
                    width: 47, height: 47, borderRadius: "50%",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    transition: "background 0.2s",
                }}
            >
                <BotIcon size={22} />
            </button>

            {/* ── Chat window ── */}
            {isOpen && (
                <div style={{
                    position: "fixed", bottom: 80, right: 40, zIndex: 9999,
                    width: "min(560px, calc(100vw - 60px))",
                    height: "min(640px, calc(100vh - 120px))",
                    borderRadius: "var(--radius, 8px)",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    animation: "chett-slide-up 0.18s ease-out",
                }}>

                    {/* ── Header ── */}
                    <div style={{
                        background: "var(--primary)", color: "var(--primary-foreground)",
                        padding: "10px 14px",
                        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                    }}>
                        <BotIcon size={18} />
                        {view === "chat" ? (
                            renaming ? (
                                <input
                                    autoFocus
                                    value={renameVal}
                                    onChange={e => setRenameVal(e.target.value)}
                                    onBlur={handleRename}
                                    onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
                                    style={{
                                        flex: 1, background: "transparent", border: "none",
                                        borderBottom: "1px solid var(--primary-foreground)",
                                        color: "var(--primary-foreground)", fontSize: 13,
                                        fontWeight: 600, outline: "none", padding: "0 2px",
                                    }}
                                />
                            ) : (
                                <span
                                    style={{ flex: 1, fontSize: 13, fontWeight: 600, cursor: convId ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                    title={convId ? "Click to rename" : undefined}
                                    onClick={() => { if (convId) { setRenameVal(convName); setRenaming(true); } }}
                                >
                                    {convName}
                                </span>
                            )
                        ) : (
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Conversations</span>
                        )}

                        {view === "chat" && (
                            <>
                                <button onClick={startNewConversation} title="New conversation"
                                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--primary-foreground)", padding: 4, display: "flex", opacity: 0.8 }}>
                                    <PlusIcon />
                                </button>
                                <button onClick={openHistory} title="History"
                                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--primary-foreground)", padding: 4, display: "flex", opacity: 0.8 }}>
                                    <ChevronIcon dir="right" />
                                </button>
                            </>
                        )}
                        {view === "history" && (
                            <button onClick={() => setView("chat")} title="Back"
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--primary-foreground)", padding: 4, display: "flex" }}>
                                <ChevronIcon dir="left" />
                            </button>
                        )}
                    </div>

                    {/* ── Chat view ── */}
                    {view === "chat" && (
                        <>
                            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                                {messages.length === 0 && (
                                    <div style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: 12, marginTop: 40 }}>
                                        <BotIcon size={32} />
                                        <p style={{ marginTop: 8 }}>Hi! I'm <strong>Chett AI</strong>.<br />Ask me anything about your CRM data.</p>
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <MessageBubble key={i} role={m.role} content={m.content} reports={m.reports} />
                                ))}
                                {loading && (
                                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                        <div style={{ background: "var(--muted)", borderRadius: "18px 18px 18px 4px" }}>
                                            <TypingDots />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{
                                borderTop: "1px solid var(--border)",
                                padding: "10px 12px",
                                display: "flex", gap: 8, alignItems: "flex-end",
                                flexShrink: 0, background: "var(--card)",
                            }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about your CRM data..."
                                    rows={1}
                                    style={{
                                        flex: 1, resize: "none", border: "1px solid var(--border)",
                                        borderRadius: 8, padding: "8px 10px",
                                        fontSize: 13, background: "var(--input)", color: "var(--foreground)",
                                        outline: "none", fontFamily: "inherit",
                                        maxHeight: 80, overflowY: "auto",
                                    }}
                                    onInput={e => {
                                        e.target.style.height = "auto";
                                        e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || loading}
                                    style={{
                                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                        background: (!input.trim() || loading) ? "var(--muted)" : "var(--primary)",
                                        color: (!input.trim() || loading) ? "var(--muted-foreground)" : "var(--primary-foreground)",
                                        border: "none", cursor: (!input.trim() || loading) ? "default" : "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "background 0.2s",
                                    }}
                                >
                                    <SendIcon />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── History view ── */}
                    {view === "history" && (
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                                <button
                                    onClick={() => { startNewConversation(); }}
                                    style={{
                                        width: "100%", padding: "8px 12px",
                                        border: "1px dashed var(--border)", borderRadius: 8,
                                        background: "transparent", cursor: "pointer",
                                        color: "var(--muted-foreground)", fontSize: 12,
                                        display: "flex", alignItems: "center", gap: 6,
                                    }}
                                >
                                    <PlusIcon /> New Conversation
                                </button>
                            </div>

                            {historyLoading && (
                                <div style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)", fontSize: 12 }}>
                                    Loading...
                                </div>
                            )}

                            {!historyLoading && conversations.length === 0 && (
                                <div style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)", fontSize: 12 }}>
                                    No conversations yet.
                                </div>
                            )}

                            {!historyLoading && conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => loadConversation(conv.id, conv.name)}
                                    style={{
                                        padding: "10px 14px",
                                        borderBottom: "1px solid var(--border)",
                                        cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: 8,
                                        background: conv.id === convId ? "var(--accent)" : "transparent",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => { if (conv.id !== convId) e.currentTarget.style.background = "var(--muted)"; }}
                                    onMouseLeave={e => { if (conv.id !== convId) e.currentTarget.style.background = "transparent"; }}
                                >
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {conv.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                                            {formatDateTz(conv.updated_at)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteConv(conv.id, e)}
                                        title="Delete"
                                        style={{
                                            background: "transparent", border: "none", cursor: "pointer",
                                            color: "var(--muted-foreground)", padding: 4, borderRadius: 4,
                                            display: "flex", opacity: 0.6, flexShrink: 0,
                                        }}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
