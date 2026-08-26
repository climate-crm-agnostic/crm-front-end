import { X, Paperclip } from "lucide-react";
import { Button } from "./ui/button";

/**
 * Read-only view of a previously sent email (SentEmail audit log row) —
 * sibling to SendEmailModal, but nothing here is editable or re-sendable.
 * Note: only the attachment's filename is stored server-side (no server-side
 * file storage for these), so there's no download link, just the name.
 */
export const ViewEmailModal = ({ email, onClose }) => {
    if (!email) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card border rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-medium text-lg truncate pr-4">{email.subject}</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">To</p>
                            <p className="font-medium break-words">{email.to_email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Reply-To</p>
                            <p className="font-medium break-words">{email.reply_to}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Sent</p>
                            <p className="font-medium">{new Date(email.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Sent by</p>
                            <p className="font-medium">{email.sent_by?.name || "—"}</p>
                        </div>
                    </div>

                    {email.attachment_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5" />
                            {email.attachment_name}
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Message</p>
                        <div
                            className="border rounded-md p-3 text-sm bg-muted/20 max-h-[50vh] overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: email.body }}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};
