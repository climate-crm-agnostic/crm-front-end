import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
    sendMessage, getConversations, getConversation,
    renameConversation, deleteConversation,
} from "../services/aiService";

// Palette for report charts (olive-forward, matches the brand).
const CHART_COLORS = ["#5E6A43", "#B0592E", "#2f9e3a", "#9b7a2e", "#4a5535", "#C9A227", "#6b6560", "#3CC647"];

// Starter prompts shown as clickable chips on the empty chat. Clicking one
// sends it immediately. They showcase reports, chart-only, and table-only.
const SUGGESTIONS = [
    "Give me a report of leads by stage",
    "Total invoiced amount per client",
    "Invoices by status — chart only",
    "Invoices created per month as a line chart",
    "Services by status — table only",
];

// Subtle "explore more" prompts shown under each answer so the user can keep
// digging without thinking of the next question.
const FOLLOWUPS = [
    "Top clients by revenue",
    "Leads by stage — chart only",
    "Overdue invoices",
];

// Renders a single report inside an assistant message: an optional chart, the
// data table, an Export to Excel button, and a note when the dataset was
// capped at the row limit. SQL is never shown.
export function ReportBlock({ report }) {
    const { title, columns = [], rows = [], truncated, row_cap, chart_spec, display = "both" } = report || {};
    if (!columns.length) return null;

    const hasChart = !!(chart_spec && chart_spec.x && chart_spec.y);
    // What to show. 'chart' with no usable chart falls back to the table so the
    // block is never empty.
    const mode = display === "chart" && !hasChart ? "both" : display;
    const showChart = (mode === "chart" || mode === "both") && hasChart;
    const showTable = mode === "table" || mode === "both";

    const exportExcel = () => {
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
        const data = rows.map((r) => ({ ...r, [y]: Number(r[y]) })).filter((r) => !isNaN(r[y]));
        if (!data.length) return null;
        return (
            <div style={{ width: "100%", height: 240, marginBottom: 10 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    {type === "pie" ? (
                        <PieChart>
                            <Pie data={data} dataKey={y} nameKey={x} outerRadius={85} label>
                                {data.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    ) : type === "line" ? (
                        <LineChart data={data} margin={{ top: 5, right: 12, bottom: 5, left: -8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D4" />
                            <XAxis dataKey={x} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="linear" dataKey={y} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 5, right: 12, bottom: 5, left: -8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E1D4" />
                            <XAxis dataKey={x} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey={y} fill={CHART_COLORS[0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--background)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Report"}</span>
                <button
                    onClick={exportExcel}
                    style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: "#FBF7EF", background: "#5E6A43", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}
                >
                    Export to Excel
                </button>
            </div>
            <div style={{ padding: 12 }}>
                {showChart && renderChart()}
                {showTable && (
                    <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                            <thead>
                                <tr style={{ background: "#5E6A43" }}>
                                    {columns.map((c) => (
                                        <th key={c} style={{ color: "#FBF7EF", textAlign: "left", padding: "7px 10px", position: "sticky", top: 0, background: "#5E6A43", whiteSpace: "nowrap" }}>{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, ri) => (
                                    <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                                        {columns.map((c) => (
                                            <td key={c} style={{ padding: "6px 10px", color: "var(--foreground)", whiteSpace: "nowrap" }}>
                                                {r[c] === null || r[c] === undefined ? "—" : String(r[c])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {showTable && truncated && (
                    <p style={{ margin: "8px 2px 0", fontSize: 11.5, color: "var(--muted-foreground)" }}>
                        Showing the first {row_cap?.toLocaleString?.() || row_cap} rows. Narrow your request (by date, status, etc.) to see a more specific set.
                    </p>
                )}
            </div>
        </div>
    );
}

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

// A GFM table separator row looks like `|---|:---:|---|` — only whitespace,
// pipes, dashes and colons, with at least one of each pipe and dash.
function isTableSeparatorRow(line) {
    if (!line) return false;
    const trimmed = line.trim();
    return /^[\s|:-]+$/.test(trimmed) && trimmed.includes("|") && trimmed.includes("-");
}

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

        // Markdown table — header row, then a |---|---| separator row, then body rows
        if (line.trim().startsWith("|") && isTableSeparatorRow(lines[i + 1])) {
            const parseRow = (row) =>
                row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());

            const headerCells = parseRow(line);
            const tableKey = i;
            i += 2; // skip header row + separator row

            const bodyRows = [];
            while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                bodyRows.push(parseRow(lines[i]));
                i++;
            }

            elements.push(
                <div key={`table${tableKey}`} style={{ overflowX: "auto", margin: "8px 0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr>
                                {headerCells.map((cell, ci) => (
                                    <th key={ci} style={{
                                        textAlign: "left", padding: "6px 10px",
                                        borderBottom: "2px solid var(--border)",
                                        fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap",
                                    }}>
                                        {parseInline(cell, `th${tableKey}-${ci}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bodyRows.map((row, ri) => (
                                <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} style={{ padding: "6px 10px", color: "var(--foreground)" }}>
                                            {parseInline(cell, `td${tableKey}-${ri}-${ci}`)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
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

export const Bubble = ({ role, content, reports }) => {
    const isUser = role === "user";
    const hasReports = !isUser && Array.isArray(reports) && reports.length > 0;
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
            <div style={{
                maxWidth: hasReports ? "92%" : "72%",
                width: hasReports ? "92%" : "auto",
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
                {hasReports && reports.map((rep, i) => <ReportBlock key={i} report={rep} />)}
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
            setMessages(data.messages.map(m => ({ role: m.role, content: m.content, reports: m.reports || [] })));
        } catch { }
    }, [convId]);

    const startNew = useCallback(() => {
        setConvId(null);
        setConvName("");
        setMessages([]);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const handleSend = useCallback(async (overrideText) => {
        const text = (typeof overrideText === "string" ? overrideText : input).trim();
        if (!text || sending) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setSending(true);

        try {
            const res = await sendMessage(text, convId);
            setMessages(prev => [...prev, { role: "assistant", content: res.assistant_message, reports: res.reports || [], suggestions: res.suggestions || [] }]);

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

    // Suggestion chips shown on the empty state. Clicking one sends it right away.
    const sendSuggestion = (text) => { setInput(""); handleSend(text); };

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
                                            borderLeft: conv.id === convId ? "3px solid var(--primary-text)" : "3px solid transparent",
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
                                                    borderBottom: "1px solid var(--primary-text)",
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
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 620, marginTop: 8 }}>
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => sendSuggestion(s)}
                                            disabled={sending}
                                            style={{
                                                fontSize: 12.5, color: "var(--foreground)", background: "var(--card)",
                                                border: "1px solid var(--border)", borderRadius: 999,
                                                padding: "8px 14px", cursor: sending ? "default" : "pointer",
                                                lineHeight: 1.2, transition: "background 0.15s",
                                            }}
                                            onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = "var(--muted)"; }}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card)")}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <Bubble key={i} role={m.role} content={m.content} reports={m.reports} />
                        ))}

                        {/* Suggestions under the latest answer. If the AI attached
                            clarifying-question options (suggestions), show those as
                            prominent chips; otherwise show the subtle "Try next" set. */}
                        {(() => {
                            if (sending || messages.length === 0) return null;
                            const last = messages[messages.length - 1];
                            if (last.role !== "assistant") return null;
                            const clarifying = Array.isArray(last.suggestions) && last.suggestions.length > 0;
                            const chips = clarifying ? last.suggestions : FOLLOWUPS;
                            return (
                                <div className="flex justify-start mb-4">
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: "92%", paddingLeft: 2 }}>
                                        <span style={{ fontSize: 11, color: "var(--muted-foreground)", alignSelf: "center", marginRight: 2 }}>
                                            {clarifying ? "Pick one:" : "Try next:"}
                                        </span>
                                        {chips.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => sendSuggestion(s)}
                                                style={clarifying ? {
                                                    fontSize: 12, fontWeight: 600, color: "#FBF7EF", background: "#5E6A43",
                                                    border: "1px solid #5E6A43", borderRadius: 999,
                                                    padding: "6px 13px", cursor: "pointer", lineHeight: 1.2,
                                                } : {
                                                    fontSize: 11.5, color: "var(--muted-foreground)", background: "transparent",
                                                    border: "1px dashed var(--border)", borderRadius: 999,
                                                    padding: "5px 11px", cursor: "pointer", lineHeight: 1.2, transition: "all 0.15s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (clarifying) { e.currentTarget.style.background = "#4a5535"; }
                                                    else { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderStyle = "solid"; }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (clarifying) { e.currentTarget.style.background = "#5E6A43"; }
                                                    else { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderStyle = "dashed"; }
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

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
