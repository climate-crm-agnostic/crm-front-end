import React, { useRef, useState } from "react";
import { Swal } from "./payablesUi";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "../ui/button";

// Supporting documents for a bill or a payment (the supplier's PDF, a
// transfer receipt). Files go to S3 through the record's upload-file action;
// the list comes back with short-lived download links.
export const AttachmentsCard = ({ attachments = [], onUpload, onDelete, disabled = false, hint }) => {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true);
        try {
            await onUpload(file);
        } catch (err) {
            Swal.fire("Upload failed", err.message, "error");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: "Remove this file?",
            text: item.name,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Remove",
        });
        if (!result.isConfirmed) return;
        try {
            await onDelete(item.path);
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    return (
        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-medium text-lg flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-secondary-text" /> Attachments
                </h3>
                {!disabled && (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                            onChange={handleFile}
                        />
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-1" /> {busy ? "Uploading..." : "Upload"}
                        </Button>
                    </>
                )}
            </div>
            {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{hint || "No files attached."}</p>
            ) : (
                <ul className="space-y-2">
                    {attachments.map((item) => (
                        <li key={item.path} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-background">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {item.url ? (
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm truncate underline text-foreground">
                                        {item.name}
                                    </a>
                                ) : (
                                    <span className="text-sm truncate">{item.name}</span>
                                )}
                            </div>
                            {!disabled && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(item)} title="Remove">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
