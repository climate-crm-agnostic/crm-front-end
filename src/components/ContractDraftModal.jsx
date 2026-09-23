import { useEffect, useRef, useState } from "react";
import { FileSignature, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ContractTemplateEditor } from "./ContractTemplateEditor";
import { sendContractMessage } from "../services/contractAiService";

// Same lightweight markdown parser as ContractAIChat.jsx/ChettAI.jsx —
// duplicated rather than extracted since it's UI-only and each surface owns
// its own rendering; not worth a shared module for this small a function.
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
                maxWidth: "85%", padding: "10px 14px",
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
                background: "var(--muted-foreground)", animation: "contract-draft-dot 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
            }} />
        ))}
    </div>
);

/**
 * Guided "Create with AI" flow launched from LeadContractPanel: a focused
 * one-conversation chat (no sidebar/history — that's ContractAIChat.jsx's
 * job) that hands off to the template editor for review + approval, all
 * inside one modal so the Lead page underneath never navigates away.
 */
export const ContractDraftModal = ({ open, onOpenChange, onApproved }) => {
    const [step, setStep] = useState("chat"); // 'chat' | 'edit'
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [convId, setConvId] = useState(null);
    const [draftTemplateId, setDraftTemplateId] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Fresh conversation every time the modal is (re)opened.
    useEffect(() => {
        if (!open) return;
        setStep("chat");
        setMessages([]);
        setInput("");
        setConvId(null);
        setDraftTemplateId(null);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending || draftTemplateId) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setSending(true);
        try {
            const res = await sendContractMessage(text, convId);
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

    const handleApprovedInEditor = (template) => {
        onOpenChange(false);
        onApproved?.(template);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                <style>{`
                    @keyframes contract-draft-dot {
                        0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                        40% { transform: scale(1); opacity: 1; }
                    }
                `}</style>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === "chat" ? <><Sparkles className="h-4 w-4" /> Create with AI</> : <><FileSignature className="h-4 w-4" /> Review Draft</>}
                    </DialogTitle>
                </DialogHeader>

                {step === "chat" && (
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto pr-1" style={{ minHeight: 260 }}>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground py-10">
                                    <p className="font-semibold text-foreground">Let's draft a contract.</p>
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
                                style={{ background: "var(--background)", color: "var(--foreground)", borderColor: "var(--border)", maxHeight: 100 }}
                            />
                            <Button type="button" onClick={handleSend} disabled={!input.trim() || sending || !!draftTemplateId}>
                                Send
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground text-center">
                            AI-generated contracts are not legal advice.
                        </p>
                    </div>
                )}

                {step === "edit" && draftTemplateId && (
                    <div className="flex-1 overflow-y-auto pr-1">
                        <ContractTemplateEditor
                            templateId={draftTemplateId}
                            onSaved={() => { }}
                            onApproved={handleApprovedInEditor}
                            showCancel={false}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
