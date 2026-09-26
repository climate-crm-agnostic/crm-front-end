import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileSignature, Sparkles, FileText, Eye } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ContractTemplateEditor } from "../components/ContractTemplateEditor";
import { sendContractMessage, getContractDraftPreview } from "../services/contractAiService";

// Pull every {{var}} / {lead.x} marker out of the draft sections so the
// preview modal can list the variables the AI identified.
const MARKER_RE = /\{\{\s*([a-zA-Z0-9_.\- ]+?)\s*\}\}|\{([a-zA-Z_]\w*\.[a-zA-Z_]\w*)\}/g;
function extractVariables(sections) {
    const seen = new Set();
    const out = [];
    for (const s of sections || []) {
        let m;
        MARKER_RE.lastIndex = 0;
        while ((m = MARKER_RE.exec(s.body || "")) !== null) {
            const name = (m[1] || m[2] || "").trim();
            if (name && !seen.has(name)) { seen.add(name); out.push(name); }
        }
    }
    return out;
}

// Lightweight markdown, same as ChettAI/ContractDraftModal — UI-only, each
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

const TypingDots = () => (
    <div className="flex gap-1 items-center px-1 py-0.5">
        {[0, 1, 2].map(i => (
            <span key={i} style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: "var(--muted-foreground)", animation: "contract-ai-dot 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
            }} />
        ))}
    </div>
);

/**
 * Full-page "Create a contract template with AI", scoped to a pipeline (the
 * template belongs to the pipeline, not a Lead). Chats to build a draft, then
 * switches to the editor for review + approval, and returns to the pipeline's
 * templates page when done.
 *
 * The "Preview" button asks the backend for the draft as it stands so far
 * (forced tool call over the whole conversation) and shows it in a modal — a
 * deliberate, on-demand snapshot rather than a live side panel, so it doesn't
 * depend on the model volunteering a preview mid-conversation.
 */
export const ContractAIChat = () => {
    const { pipelineId } = useParams();
    const navigate = useNavigate();
    const backTo = `/pipeline/${pipelineId}/contracts`;

    const [step, setStep] = useState("chat"); // 'chat' | 'edit'
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [convId, setConvId] = useState(null);
    const [draftTemplateId, setDraftTemplateId] = useState(null);

    // Preview modal state.
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const [preview, setPreview] = useState(null); // { sections, variables }

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    // Auto-grow the textarea with its content, up to ~4 lines, then scroll
    // inside. Reset to auto first so it can also shrink when text is deleted.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        const maxHeight = 96; // ~4 lines at this font size/line-height
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [input]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending || draftTemplateId) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setSending(true);
        try {
            const res = await sendContractMessage(text, convId, pipelineId);
            setMessages(prev => [...prev, { role: "assistant", content: res.assistant_message }]);
            if (!convId) setConvId(res.conversation_id);
            if (res.draft_template_id) setDraftTemplateId(res.draft_template_id);
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handlePreview = async () => {
        if (!convId) return;
        setPreviewOpen(true);
        setPreviewLoading(true);
        setPreviewError("");
        try {
            const data = await getContractDraftPreview(convId);
            const sections = data.sections || [];
            setPreview({ sections, variables: extractVariables(sections) });
        } catch (err) {
            setPreviewError(err.message || "Could not build the preview.");
            setPreview(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleApproved = () => {
        navigate(backTo);
    };

    // Available once there's a conversation going and before the draft is
    // finalized (after that the editor shows the real content anyway).
    const canPreview = !!convId && !draftTemplateId;

    return (
        <div className="w-4/5 max-w-6xl mx-auto p-4 sm:p-6">
            <style>{`
                @keyframes contract-ai-dot {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            <div className="flex items-center gap-3 mb-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backTo)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to templates
                </Button>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                    {step === "chat" ? <><Sparkles className="h-5 w-5" /> Create with AI</> : <><FileSignature className="h-5 w-5" /> Review Draft</>}
                </h1>
                {step === "chat" && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={handlePreview}
                        disabled={!canPreview}
                        title={canPreview ? "See the draft as it stands so far" : "Start the conversation first"}
                    >
                        <Eye className="h-4 w-4 mr-1.5" /> Preview
                    </Button>
                )}
            </div>

            {step === "chat" && (
                // Fixed height (not min-height) so the box never grows past the
                // viewport — the message list below is the ONLY thing that
                // scrolls, keeping the page header and the input row in place.
                <div className="bg-card border rounded-lg p-4 flex flex-col" style={{ height: "calc(100vh - 150px)" }}>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground py-16">
                                <p className="font-semibold text-foreground">Let's draft a contract template.</p>
                                <p className="text-sm">Tell me about the parties, scope, and payment terms.</p>
                            </div>
                        )}
                        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
                        {sending && (
                            <div className="flex justify-start mb-3">
                                <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--card)", border: "1px solid var(--border)" }}>
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        {draftTemplateId && (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center space-y-2 mt-2">
                                <p className="text-sm font-medium">Your contract draft is ready.</p>
                                <Button type="button" onClick={() => setStep("edit")}>
                                    View Contract
                                </Button>
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
                            placeholder={draftTemplateId ? "Draft ready — view it above." : "Describe the contract you need..."}
                            rows={1}
                            disabled={sending || !!draftTemplateId}
                            className="flex-1 resize-none rounded-md border px-3 py-2 text-sm outline-none disabled:opacity-60"
                            style={{ background: "var(--background)", color: "var(--foreground)", borderColor: "var(--border)" }}
                        />
                        <Button type="button" onClick={handleSend} disabled={!input.trim() || sending || !!draftTemplateId}>
                            Send
                        </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center mt-1">
                        AI-generated contracts are not legal advice.
                    </p>
                </div>
            )}

            {step === "edit" && draftTemplateId && (
                <div className="bg-card border rounded-lg p-4">
                    <ContractTemplateEditor
                        templateId={draftTemplateId}
                        onSaved={() => { }}
                        onApproved={handleApproved}
                        onCancel={() => navigate(backTo)}
                        onVersionSelect={(id) => navigate(`/pipeline/${pipelineId}/contracts/${id}/edit`)}
                        onDeleted={() => navigate(backTo)}
                    />
                </div>
            )}

            <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewError(""); }}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Draft so far
                        </DialogTitle>
                    </DialogHeader>

                    {previewLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                            <TypingDots />
                            <p className="text-sm">Building the draft from your conversation…</p>
                        </div>
                    ) : previewError ? (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{previewError}</div>
                    ) : !preview || preview.sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                            <FileText className="h-8 w-8 opacity-30" />
                            <p className="text-sm">Not enough detail yet to draft a section. Keep chatting and try again.</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto space-y-4">
                            {preview.variables.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Variables identified</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {preview.variables.map((v) => (
                                            <Badge key={v} variant="secondary" className="text-[11px]">{v}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-3 border rounded-md p-4 bg-white">
                                {preview.sections.map((s, i) => (
                                    <div key={i}>
                                        {s.title && <p className="text-sm font-semibold mb-1">{s.title}</p>}
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.body}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                This is a work-in-progress snapshot — the final template is generated when you finish the chat.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
