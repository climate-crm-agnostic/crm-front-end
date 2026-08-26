import { useEffect, useRef, useState } from "react";
import { X, Paperclip, Sparkles } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { RichTextEditor } from "./RichTextEditor";
import { sendCommunication, polishEmail } from "../services/communicationService";
import Swal from "sweetalert2";

/**
 * Generic "send an email from the CRM" modal — not tied to quotations,
 * though that's the first caller. Reply-To is never set here: the backend
 * (CommunicationSendView) always uses request.user.email, so the sender
 * doesn't even see that as a field to fill in.
 *
 * `attachment`, if provided, is a real File (see QuotationDetail.jsx —
 * built with `new File([pdfBlob], filename, {type:'application/pdf'})`
 * right before opening this modal) with an "attach?" checkbox the user can
 * uncheck to send without it.
 *
 * `emailOptions`, if provided, is an array of `{ label, value }` — real
 * email attribute values detected on the lead/client (see LeadDetail.jsx).
 * With 0 options the "To" field is a single free-text input (legacy
 * behavior). With 1, that value prefills the same free-text input. With 2+,
 * every option is shown as a checkbox (all pre-checked, since reaching a
 * lead at all its known addresses is the common case) plus a free-text
 * field for one-off extra addresses not in the list.
 */
export const SendEmailModal = ({ open, onClose, to: initialTo = "", subject: initialSubject = "", lead, quotation, attachment, emailOptions = [], onSent }) => {
    const [to, setTo] = useState(initialTo);
    const [checkedEmails, setCheckedEmails] = useState([]);
    const [extraEmail, setExtraEmail] = useState("");
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState("");
    const [includeAttachment, setIncludeAttachment] = useState(!!attachment);
    const [sending, setSending] = useState(false);
    const [polishing, setPolishing] = useState(false);
    const [error, setError] = useState(null);
    const bodyRef = useRef(null);

    const hasMultipleOptions = emailOptions.length > 1;
    const toList = hasMultipleOptions
        ? [...checkedEmails, ...(extraEmail.trim() ? [extraEmail.trim()] : [])]
        : [to.trim()].filter(Boolean);

    // This component stays mounted (controlled by `open`, not conditional
    // rendering by the parent), so useState's initial value only ever
    // applies once — without this, reopening with different props (e.g. a
    // different quotation's recipient email) would keep showing stale
    // values from the very first time the modal opened.
    useEffect(() => {
        if (open) {
            setTo(emailOptions.length === 1 ? emailOptions[0].value : initialTo);
            setCheckedEmails(emailOptions.length > 1 ? emailOptions.map(o => o.value) : []);
            setExtraEmail("");
            setSubject(initialSubject);
            setBody("");
            setIncludeAttachment(!!attachment);
            setError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const toggleEmail = (value) => {
        setCheckedEmails(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const handlePolish = async () => {
        if (!body.trim()) return;
        setPolishing(true);
        setError(null);
        try {
            const { polished_html } = await polishEmail(body);
            setBody(polished_html);
            bodyRef.current?.setContent(polished_html);
        } catch (err) {
            setError(err.message || "Failed to polish email.");
        } finally {
            setPolishing(false);
        }
    };

    const handleSend = async () => {
        if (!toList.length || !subject.trim() || !body.trim()) return;
        setSending(true);
        setError(null);
        try {
            await sendCommunication({
                to: toList, subject, body, lead, quotation,
                attachment: includeAttachment ? attachment : null,
            });
            Swal.fire({ icon: 'success', title: 'Sent', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            onSent?.();
            onClose();
        } catch (err) {
            setError(err.message || "Failed to send email.");
        } finally {
            setSending(false);
        }
    };

    return (
        // No onClick-to-close on the backdrop on purpose — composing an email
        // is real work (recipients, subject, a written/AI-polished body), and
        // a single stray click outside the box used to discard all of it
        // instantly with no confirmation. Closing now only happens via the
        // explicit X or Cancel button.
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-medium text-lg">Send Email</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">{error}</div>
                    )}

                    <div className="space-y-2">
                        <Label>To</Label>
                        {hasMultipleOptions ? (
                            <div className="space-y-2">
                                <div className="border rounded-md divide-y">
                                    {emailOptions.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                                            <Checkbox
                                                checked={checkedEmails.includes(opt.value)}
                                                onCheckedChange={() => toggleEmail(opt.value)}
                                            />
                                            <span className="font-medium">{opt.label}:</span>
                                            <span className="text-muted-foreground truncate">{opt.value}</span>
                                        </label>
                                    ))}
                                </div>
                                <Input
                                    type="email"
                                    value={extraEmail}
                                    onChange={e => setExtraEmail(e.target.value)}
                                    placeholder="Add another address (optional)"
                                />
                            </div>
                        ) : (
                            <Input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Message</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs"
                                onClick={handlePolish}
                                disabled={polishing || !body.trim()}
                                title="Improve the wording with AI"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                {polishing ? "Polishing..." : "Polish"}
                            </Button>
                        </div>
                        <RichTextEditor ref={bodyRef} value={body} onChange={setBody} placeholder="Write your message..." />
                    </div>

                    {attachment && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={includeAttachment} onCheckedChange={setIncludeAttachment} />
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            Attach {attachment.name}
                        </label>
                    )}

                    <p className="text-xs text-muted-foreground">
                        Replies to this email will go to your own inbox, not a shared address.
                    </p>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSend} disabled={sending || !toList.length || !subject.trim() || !body.trim()}>
                        {sending ? "Sending..." : "Send"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
