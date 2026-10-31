import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles, FileText, Presentation, Eye, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { sendMeetingDocumentMessage } from "../services/meetingDocumentAiService";
import { getMeetingDocument, getMeetingDocumentConversation } from "../services/meetingDocumentService";

// Lightweight markdown, same as ContractAIChat/ChettAI — UI-only, each
// surface owns its rendering.
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

const Bubble = ({ role, content }) => {
    const isUser = role === "user";
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
            <div style={{
                maxWidth: "80%", padding: "10px 14px",
                borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isUser ? "var(--primary)" : "var(--card)",
                color: isUser ? "var(--primary-foreground)" : "var(--foreground)",
                border: isUser ? "none" : "1px solid var(--border)",
                fontSize: 14, wordBreak: "break-word", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}>
                {parseInline(content, role)}
            </div>
        </div>
    );
};

// Tap-to-accept/decline buttons for an AI suggestion grounded in the Lead's
// CRM data (see suggest_topic in meeting_document_tools.py) — lets the user
// respond with one click instead of typing "yes, add that".
const SuggestionChips = ({ topicLabel, onRespond, disabled }) => (
    <div className="flex gap-2 mb-3 ml-1">
        <Button type="button" size="sm" disabled={disabled} onClick={() => onRespond(true)}>
            + Add section on {topicLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onRespond(false)}>
            No, thanks
        </Button>
    </div>
);

// Section-headings checkpoint (see propose_outline in meeting_document_tools.py)
// — shown once per conversation, before any bullets are drafted. "Looks
// good" sends a canned reply, same convention as SuggestionChips; asking to
// add/remove/reorder a heading is just typed normally, handled by the model
// in plain text (no dedicated UI for that — see plan).
const OutlineChips = ({ sections, onConfirm, disabled }) => (
    <div className="mb-3 ml-1 mr-auto" style={{ maxWidth: "95%" }}>
        <div className="border rounded-lg p-3 bg-card">
            <ol className="space-y-1 mb-2">
                {sections.map((s, i) => (
                    <li key={i} className="text-sm flex items-baseline gap-1.5">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span>{s.heading}{s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}</span>
                    </li>
                ))}
            </ol>
            <Button type="button" size="sm" disabled={disabled} onClick={onConfirm}>
                Looks good, continue →
            </Button>
        </div>
    </div>
);

// Example conversation-starters shown in the greeting below — kept scoped to
// what the agent actually builds (a meeting agenda grounded in this Lead's
// real data, see meeting_document_prompt.py's grounding rules), not generic
// marketing/proposal content the tool was never designed to author.
const INTRO_EXAMPLES = {
    pptx: [
        "A kickoff agenda for a new engagement",
        "A quarterly business review (QBR) with this client",
        "A negotiation meeting — pricing and renewal terms",
        "An internal prep deck ahead of a client call",
    ],
    docx: [
        "A kickoff agenda for a new engagement",
        "A quarterly business review (QBR) with this client",
        "A negotiation meeting agenda — pricing and renewal terms",
        "Internal prep notes ahead of a client meeting",
    ],
};

// Greets the user before they type anything, styled like a real assistant
// message rather than a muted empty-state placeholder — sets expectations
// (what it can use from the Lead, what to ask for) up front.
const IntroMessage = ({ outputFormat }) => {
    const formatLabel = outputFormat === "pptx" ? "PowerPoint presentation" : "Word document";
    const examples = INTRO_EXAMPLES[outputFormat] || INTRO_EXAMPLES.docx;
    return (
        <div className="flex justify-start mb-3">
            <div style={{
                maxWidth: "85%", padding: "14px 16px", borderRadius: "18px 18px 18px 4px",
                background: "var(--card)", border: "1px solid var(--border)", fontSize: 14,
            }}>
                <p className="mb-2">👋 Hi! I'm your meeting agenda assistant for this Lead.</p>
                <p className="mb-2">
                    I can use what's already in this Lead — company and contact details, notes, and
                    the deal context — to help shape a relevant agenda as a {formatLabel}.
                </p>
                <p className="font-semibold mb-2">What meeting would you like to prepare for?</p>
                <p className="text-muted-foreground mb-1">For example:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                    {examples.map((example, i) => <li key={i}>{example}</li>)}
                </ul>
            </div>
        </div>
    );
};

const TypingDots = () => (
    <div className="flex gap-1 items-center px-1 py-0.5">
        {[0, 1, 2].map(i => (
            <span key={i} style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: "var(--muted-foreground)", animation: "meeting-doc-ai-dot 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
            }} />
        ))}
    </div>
);

const FORMAT_OPTIONS = [
    { value: "docx", label: "Word Document", icon: FileText },
    { value: "pptx", label: "PowerPoint Presentation", icon: Presentation },
];

// Maps the backend's brand-approved accent keys to the SAME CSS custom
// properties the live CRM theme uses (src/index.css @theme tokens) — not a
// hardcoded hex, so if the brand palette changes again this stays in sync
// automatically instead of silently drifting like the Python renderers did.
const ACCENT_VARS = {
    olive: "var(--color-brand-olive, #255b01)",
    citron: "var(--color-brand-citron, #60d805)",
    olive_light: "var(--color-brand-olive-light, #34534a)",
};

// Mirrors _SECONDARY_ACCENT in app/utils/meeting_document_{docx,pptx}.py —
// the thin divider/stripe color paired with each primary accent, kept in
// sync by hand since it's a design constant, not derived data.
const SECONDARY_ACCENT_VARS = {
    olive: ACCENT_VARS.citron,
    citron: ACCENT_VARS.olive,
    olive_light: ACCENT_VARS.olive,
};

const slideStyle = {
    flex: "0 0 auto", width: 230, aspectRatio: "16 / 9",
    background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden",
    display: "flex",
};

// Cover-slide-only mockup — the chat card shows just the title slide; the
// full deck lives in the real .pptx (Download) or the real PDF (View).
const SlideDeckPreview = ({ title, accentColor, secondaryColor }) => (
    <div className="flex gap-3 overflow-x-auto pb-1">
        <div style={slideStyle}>
            <div style={{ width: 18, background: accentColor, flexShrink: 0, position: "relative" }}>
                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: secondaryColor }} />
            </div>
            <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-heading)", color: accentColor, fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.2 }}>
                    {title}
                </p>
            </div>
        </div>
    </div>
);

// Visual mockup of the actual .docx — a single "page" styled with the same
// brand fonts/accent color as the real renderer: large title with a thin
// accent rule, numbered section headings each with their own rule, and a
// footer echoing the Word doc's page-number field.
// Cover-only mockup — the chat card shows just the title page; the full
// content lives in the real .docx (Download) or the real PDF (View).
const DocumentPagePreview = ({ title, accentColor, secondaryColor }) => (
    <div style={{
        background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px 22px", maxWidth: 420,
        display: "flex", flexDirection: "column",
    }}>
        <p style={{
            fontFamily: "var(--font-heading)", color: accentColor, fontWeight: 700, fontSize: 20,
            margin: 0, paddingBottom: 8, borderBottom: `2px solid ${secondaryColor}`,
        }}>
            {title}
        </p>
    </div>
);

// Inline "how it looks now" card shown right under the assistant message that
// generated or edited the document — mirrors ChatGPT's canvas pattern of
// surfacing the artifact inline after each change, instead of only on demand.
const DocumentPreviewCard = ({ title, data, isLatest, downloadUrl, previewPdfUrl, onViewPdf, outputFormat }) => {
    const accentKey = ACCENT_VARS[data.accent] ? data.accent : "olive";
    const accentColor = ACCENT_VARS[accentKey];
    const secondaryColor = SECONDARY_ACCENT_VARS[accentKey];
    return (
        <div className="mb-3 ml-1 mr-auto" style={{ maxWidth: "95%" }}>
            <div className="border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> {title || "Meeting agenda"}
                    </p>
                    {isLatest && (
                        <div className="flex gap-2">
                            <Button
                                type="button" size="sm" variant="outline"
                                onClick={onViewPdf} disabled={!previewPdfUrl}
                                title={previewPdfUrl ? "Open the real generated file" : "Preview still processing — try Download instead"}
                            >
                                <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                            <Button type="button" size="sm" variant="outline" asChild disabled={!downloadUrl}>
                                <a href={downloadUrl || undefined} target="_blank" rel="noreferrer">
                                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
                {outputFormat === "pptx" ? (
                    <SlideDeckPreview
                        title={title} accentColor={accentColor} secondaryColor={secondaryColor}
                    />
                ) : (
                    <DocumentPagePreview
                        title={title} accentColor={accentColor} secondaryColor={secondaryColor}
                    />
                )}
            </div>
        </div>
    );
};

/**
 * Full-page "Create a meeting agenda with AI", scoped to a Lead. Chats to
 * build the agenda directly with the Lead's real data (no reusable template,
 * no merge fields — unlike ContractAIChat). Once the AI finalizes the draft,
 * the Word/PowerPoint file is generated server-side and an inline preview
 * card appears under that message; the chat stays open afterward so the user
 * can keep asking for changes (ChatGPT-canvas style) — each edit re-saves
 * the same document and shows an updated inline preview + download link.
 */
export const MeetingDocumentAIChat = () => {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const backTo = `/lead/${leadId}`;

    const [outputFormat, setOutputFormat] = useState(null); // locked once chat starts
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [convId, setConvId] = useState(null);
    const [meetingDocumentId, setMeetingDocumentId] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    // True while hydrating an existing conversation from ?conversation=
    // (see LeadMeetingDocumentPanel.jsx) — skips the format-picker screen
    // straight to its message history.
    const [resuming, setResuming] = useState(!!searchParams.get("conversation"));

    // The REAL generated file rendered to PDF server-side (LibreOffice —
    // see app/utils/office_pdf_preview.py), shown in a modal — unlike the
    // inline chat card below, which is a brand-styled mockup, not the
    // actual file. Null if conversion isn't available; falls back to just
    // the Download button in that case.
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Resume an existing conversation (see LeadMeetingDocumentPanel.jsx's
    // "Conversations" list) instead of starting a new one. Only the plain
    // text of each past turn is stored server-side — the special inline
    // widgets (document preview card, outline chips, suggestion chips) are
    // transient response data, never persisted, so old turns replay as
    // plain bubbles only. If this conversation already produced a document,
    // its card is appended once at the end so Download/View still work.
    useEffect(() => {
        const conversationId = searchParams.get("conversation");
        if (!conversationId) return;

        let cancelled = false;
        (async () => {
            try {
                const conv = await getMeetingDocumentConversation(leadId, conversationId);
                if (cancelled) return;
                setOutputFormat(conv.output_format);
                setConvId(conv.id);
                setMessages((conv.messages || []).map(m => ({ role: m.role, content: m.content })));

                const documentId = searchParams.get("document");
                if (documentId) {
                    const doc = await getMeetingDocument(leadId, documentId);
                    if (cancelled) return;
                    setMeetingDocumentId(doc.id);
                    setDownloadUrl(doc.generated_file_url || null);
                    setPreviewPdfUrl(doc.preview_pdf_url || null);
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `Here's the document from this conversation: ${doc.title}.`,
                        documentPreview: {
                            title: doc.title,
                            attendees: doc.resolved_content?.attendees || [],
                            sections: doc.resolved_content?.sections || [],
                            show_durations: doc.resolved_content?.show_durations,
                            accent: doc.resolved_content?.accent,
                        },
                    }]);
                }
            } catch {
                // Non-fatal — falls through to an empty resumed chat rather
                // than blocking the page.
            } finally {
                if (!cancelled) setResuming(false);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [outputFormat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        const maxHeight = 96;
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [input]);

    // overrideText lets the suggest_topic Accept/Decline chips send a canned
    // reply with one tap, reusing the exact same request/response handling
    // as typing — no separate endpoint needed.
    const handleSend = async (overrideText) => {
        const text = (overrideText ?? input).trim();
        if (!text || sending || !outputFormat) return;
        if (overrideText === undefined) setInput("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setSending(true);
        try {
            const res = await sendMeetingDocumentMessage(leadId, text, convId, outputFormat);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: res.assistant_message,
                documentPreview: res.document_preview || null,
                suggestedTopic: res.suggested_topic || null,
                proposedOutline: res.proposed_outline || null,
            }]);
            if (!convId) setConvId(res.conversation_id);
            if (res.meeting_document_id) {
                setMeetingDocumentId(res.meeting_document_id);
                // Re-fetch every time, not just on first creation — edits reuse
                // the same meeting_document_id, so this id alone wouldn't
                // change to re-trigger a dependent effect.
                getMeetingDocument(leadId, res.meeting_document_id)
                    .then(doc => {
                        setDownloadUrl(doc.generated_file_url || null);
                        setPreviewPdfUrl(doc.preview_pdf_url || null);
                    })
                    .catch(() => { setDownloadUrl(null); setPreviewPdfUrl(null); });
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const lastDocMessageIndex = messages.reduce((acc, m, i) => (m.documentPreview ? i : acc), -1);

    if (resuming) {
        return (
            <div className="w-4/5 max-w-2xl mx-auto p-4 sm:p-6">
                <p className="text-sm text-muted-foreground italic">Loading conversation…</p>
            </div>
        );
    }

    if (!outputFormat) {
        return (
            <div className="w-4/5 max-w-2xl mx-auto p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backTo)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Lead
                    </Button>
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5" /> New Meeting Document
                    </h1>
                </div>
                <div className="bg-card border rounded-lg p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">Choose the format for this meeting agenda.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setOutputFormat(value)}
                                className="flex flex-col items-center gap-2 p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                            >
                                <Icon className="h-8 w-8" />
                                <span className="text-sm font-medium">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-4/5 max-w-6xl mx-auto p-4 sm:p-6">
            <style>{`
                @keyframes meeting-doc-ai-dot {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            <div className="flex items-center gap-3 mb-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backTo)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Lead
                </Button>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> New Meeting Document
                    <span className="text-xs font-normal text-muted-foreground">
                        ({outputFormat === "pptx" ? "PowerPoint" : "Word"})
                    </span>
                </h1>
            </div>

            <div className="bg-card border rounded-lg p-4 flex flex-col" style={{ height: "calc(100vh - 150px)" }}>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    <IntroMessage outputFormat={outputFormat} />
                    {messages.map((m, i) => (
                        <div key={i}>
                            <Bubble role={m.role} content={m.content} />
                            {m.documentPreview && (
                                <DocumentPreviewCard
                                    title={m.documentPreview.title}
                                    data={m.documentPreview}
                                    isLatest={i === lastDocMessageIndex}
                                    downloadUrl={downloadUrl}
                                    previewPdfUrl={previewPdfUrl}
                                    onViewPdf={() => setPdfViewerOpen(true)}
                                    outputFormat={outputFormat}
                                />
                            )}
                            {m.suggestedTopic && i === messages.length - 1 && (
                                <SuggestionChips
                                    topicLabel={m.suggestedTopic.topic_label}
                                    disabled={sending}
                                    onRespond={(accept) => handleSend(
                                        accept
                                            ? `Yes, please add a section on ${m.suggestedTopic.topic_label}.`
                                            : "No thanks, let's not include that."
                                    )}
                                />
                            )}
                            {m.proposedOutline && i === messages.length - 1 && (
                                <OutlineChips
                                    sections={m.proposedOutline.sections}
                                    disabled={sending}
                                    onConfirm={() => handleSend("That outline looks good, let's continue.")}
                                />
                            )}
                        </div>
                    ))}
                    {sending && (
                        <div className="flex justify-start mb-3">
                            <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--card)", border: "1px solid var(--border)" }}>
                                <TypingDots />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="flex gap-2 items-end pt-3 border-t mt-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={meetingDocumentId ? "Ask for any changes, or describe more..." : "Describe the meeting..."}
                        rows={1}
                        disabled={sending}
                        className="flex-1 resize-none rounded-md border px-3 py-2 text-sm outline-none disabled:opacity-60"
                        style={{ background: "var(--background)", color: "var(--foreground)", borderColor: "var(--border)" }}
                    />
                    <Button type="button" onClick={() => handleSend()} disabled={!input.trim() || sending}>
                        Send
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-1">
                    This meeting agenda was drafted with AI assistance — review it before sharing with attendees.
                </p>
            </div>

            <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> Document preview
                        </DialogTitle>
                    </DialogHeader>
                    {previewPdfUrl ? (
                        <iframe
                            src={previewPdfUrl}
                            title="Meeting document preview"
                            className="flex-1 w-full rounded-md border"
                            style={{ minHeight: "70vh" }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                            <FileText className="h-8 w-8 opacity-30" />
                            <p className="text-sm">Preview isn't available for this document yet. Try Download instead.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
