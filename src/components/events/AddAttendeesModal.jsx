import { useState } from "react";
import { Download, Upload, Plus, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import { PhoneInput } from "@/components/ui/phone-input";
import {
    downloadAttendeeTemplate, previewAttendeesExcel, approveAttendees,
} from "@/services/eventService";

const GREEN = "#5E6A43";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const emptyRow = () => ({ first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "" });

/**
 * Adds attendees to an EXISTING event. Mirrors the create wizard's attendee
 * step: enter people manually one-by-one and/or upload an .xlsx (previewed +
 * sanitized by the backend). On confirm it commits via approve-attendees,
 * which also emails each new attendee their invitation.
 */
export const AddAttendeesModal = ({ eventId, onClose, onDone }) => {
    const [manual, setManual] = useState([emptyRow()]);
    const [manualErrors, setManualErrors] = useState({});  // { idx: { email } }
    const [excelRows, setExcelRows] = useState([]);
    const [excelErrors, setExcelErrors] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };

    const setManualField = (idx, field, value) => {
        setManual((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
        if (field === "email") {
            setManualErrors((prev) => {
                const next = { ...prev };
                if (!value.trim() || EMAIL_RE.test(value.trim())) delete next[idx];
                else next[idx] = { email: "Invalid email." };
                return next;
            });
        }
    };
    const addRow = () => setManual((rows) => [...rows, emptyRow()]);
    const removeRow = (idx) => setManual((rows) => rows.filter((_, i) => i !== idx));

    // Only manual rows that actually have a first name count.
    const filledManual = () => manual
        .filter((r) => r.first_name.trim())
        .map((r) => ({ ...r, source: "manual" }));

    const allAttendees = () => [...filledManual(), ...excelRows.map((r) => ({ ...r, source: "excel" }))];

    const manualRowsValid = () =>
        manual.every((r) => !r.email.trim() || EMAIL_RE.test(r.email.trim()));

    const handleExcelUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await previewAttendeesExcel(file);
            setExcelRows(Array.isArray(res.rows) ? res.rows : []);
            setExcelErrors(Array.isArray(res.errors) ? res.errors : []);
        } catch (err) {
            Swal.fire({ icon: "error", title: "Could not read file", text: err.message });
        } finally {
            setUploading(false);
            e.target.value = "";  // allow re-uploading the same file
        }
    };

    const canSubmit = allAttendees().length >= 1 && manualRowsValid() && !submitting;

    const submit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const res = await approveAttendees(eventId, allAttendees(), true);
            Swal.fire({
                icon: "success", title: "Attendees added",
                text: `${res.created} added · ${res.invitations_sent} invitation(s) sent.`,
                toast: true, position: "top-end", showConfirmButton: false, timer: 3500,
            });
            onDone();
        } catch (err) {
            Swal.fire({ icon: "error", title: "Could not add attendees", text: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-auto" style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold" style={{ color: "#2E2A26" }}>Add attendees</h2>
                        <p className="text-xs" style={{ color: "#9b948e" }}>Add manually or upload an Excel file. Each new attendee is emailed their invitation.</p>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 cursor-pointer" style={{ color: "#6b6560" }} title="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={downloadAttendeeTemplate}
                        className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                        style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#FFFFFF" }}
                    >
                        <Download className="h-4 w-4" /> Download template
                    </button>
                </div>

                {/* Manual entry — one card per attendee */}
                <div className="space-y-3">
                    {manual.map((a, idx) => (
                        <div key={idx} className="p-3 rounded-lg" style={{ border: "1px solid #E7E1D4", backgroundColor: "#FFFFFF" }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold" style={{ color: "#9b948e" }}>Attendee {idx + 1}</span>
                                {manual.length > 1 && (
                                    <button type="button" className="cursor-pointer" style={{ color: "#c0392b" }} onClick={() => removeRow(idx)} title="Remove">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input className="h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="First name *" value={a.first_name} onChange={(e) => setManualField(idx, "first_name", e.target.value)} />
                                <input className="h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Last name" value={a.last_name} onChange={(e) => setManualField(idx, "last_name", e.target.value)} />
                                <div>
                                    <input
                                        type="email"
                                        className="h-9 px-2 rounded-md text-sm w-full"
                                        style={{ ...inputStyle, borderColor: manualErrors[idx]?.email ? "#c0392b" : "#D8D2C4" }}
                                        placeholder="Email"
                                        value={a.email}
                                        onChange={(e) => setManualField(idx, "email", e.target.value)}
                                    />
                                    {manualErrors[idx]?.email && (
                                        <p className="text-[11px] mt-0.5" style={{ color: "#c0392b" }}>{manualErrors[idx].email}</p>
                                    )}
                                </div>
                                <input className="h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Company" value={a.company} onChange={(e) => setManualField(idx, "company", e.target.value)} />
                            </div>
                            <div className="mt-2">
                                <PhoneInput value={a.phone} onChange={(v) => setManualField(idx, "phone", v)} defaultCountry="US" placeholder="Phone number" />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer mt-1" style={{ color: GREEN }}>
                        <Plus className="h-3.5 w-3.5" /> Add another
                    </button>
                </div>

                {/* Excel upload */}
                <div className="p-4 rounded-lg" style={{ border: "1px dashed #D8D2C4", backgroundColor: "#F5F0E8" }}>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: GREEN }}>
                        <Upload className="h-4 w-4" />
                        {uploading ? "Reading file…" : "Upload attendees from Excel (.xlsx)"}
                        <input type="file" accept=".xlsx" className="hidden" onChange={handleExcelUpload} disabled={uploading} />
                    </label>
                    {excelRows.length > 0 && (
                        <p className="text-xs mt-2" style={{ color: GREEN }}>{excelRows.length} valid row(s) loaded from Excel.</p>
                    )}
                    {excelErrors.length > 0 && (
                        <div className="mt-2 text-xs" style={{ color: "#B0592E" }}>
                            {excelErrors.slice(0, 6).map((e, i) => (<div key={i}>Row {e.row}: {e.message}</div>))}
                            {excelErrors.length > 6 && <div>…and {excelErrors.length - 6} more.</div>}
                        </div>
                    )}
                </div>

                <p className="text-sm font-semibold" style={{ color: "#2E2A26" }}>
                    Total to add: {allAttendees().length}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer" style={{ border: "1px solid #D8D2C4", color: "#6b6560", backgroundColor: "#FFFFFF" }}>Cancel</button>
                    <button type="button" onClick={submit} disabled={!canSubmit} className="h-10 px-5 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: canSubmit ? GREEN : "#c9c3b6", color: "#FBF7EF" }}>
                        {submitting ? "Adding…" : "Add & send invitations"}
                    </button>
                </div>
            </div>
        </div>
    );
};
