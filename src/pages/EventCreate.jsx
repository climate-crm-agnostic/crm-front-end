import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Check, ChevronLeft, ChevronRight, Upload, Download, Trash2, Plus,
    MapPin, Video, AlertTriangle, CalendarDays,
} from "lucide-react";
import Swal from "sweetalert2";
import { getPipelines } from "@/services/pipelineService";
import {
    getPipelineFields, createEvent, previewAttendeesExcel,
    approveAttendees, downloadAttendeeTemplate,
} from "@/services/eventService";

const GREEN = "#5E6A43";
const LINK_MIN_DAYS = 1;
const LINK_MAX_DAYS = 30;

const STEPS = [
    "Pipeline",
    "Event details",
    "Attendees",       // "Participantes"
    "Preview",
    "Confirm",
];

const emptyAttendee = () => ({
    first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "",
});

export const EventCreate = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Step 1 — pipeline
    const [pipelines, setPipelines] = useState([]);
    const [pipelineId, setPipelineId] = useState("");
    const [pipelineFields, setPipelineFields] = useState([]);
    const [prereqError, setPrereqError] = useState("");
    const [checkingPrereq, setCheckingPrereq] = useState(false);

    // Step 2 — details
    const [form, setForm] = useState({
        name: "", description: "", modality: "in_person",
        location: "", virtual_url: "",
        start_at: "", end_at: "",
        link_duration_days: 1,
    });

    // Step 3 — attendees (manual + excel)
    const [manualAttendees, setManualAttendees] = useState([emptyAttendee()]);
    const [excelRows, setExcelRows] = useState([]);
    const [excelErrors, setExcelErrors] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        getPipelines().then((data) => setPipelines(Array.isArray(data) ? data : [])).catch(() => {});
    }, []);

    // ── Prerequisite check when a pipeline is picked ──────────────────────
    const selectPipeline = async (id) => {
        setPipelineId(id);
        setPrereqError("");
        setPipelineFields([]);
        if (!id) return;

        const pipeline = pipelines.find((p) => p.id === id);
        setCheckingPrereq(true);
        try {
            // 2) stages
            if (!pipeline?.stages || pipeline.stages.length === 0) {
                setPrereqError("The selected pipeline has no stages. Add at least one stage to the pipeline first.");
                return;
            }
            // 3) lead fields
            const fields = await getPipelineFields(id);
            if (!Array.isArray(fields) || fields.length === 0) {
                setPrereqError("The selected pipeline has no lead fields defined. Define the pipeline's lead fields first.");
                return;
            }
            setPipelineFields(fields);
        } catch {
            setPrereqError("Could not verify the pipeline. Please try again.");
        } finally {
            setCheckingPrereq(false);
        }
    };

    // ── Attendees combined ────────────────────────────────────────────────
    const allAttendees = () => {
        const manual = manualAttendees
            .filter((a) => (a.first_name || "").trim())
            .map((a) => ({ ...a, source: "manual" }));
        const excel = excelRows.map((a) => ({ ...a, source: "excel" }));
        return [...manual, ...excel];
    };

    const handleManualChange = (idx, field, value) => {
        setManualAttendees((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
    };
    const addManualRow = () => setManualAttendees((prev) => [...prev, emptyAttendee()]);
    const removeManualRow = (idx) => setManualAttendees((prev) => prev.filter((_, i) => i !== idx));

    const handleExcelUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await previewAttendeesExcel(file);
            setExcelRows(res.rows || []);
            setExcelErrors(res.errors || []);
            if ((res.rows || []).length === 0) {
                Swal.fire({ icon: "warning", title: "No valid rows found", text: "Check the file and the errors shown.", toast: true, position: "top-end", showConfirmButton: false, timer: 4000 });
            }
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.message, toast: true, position: "top-end", showConfirmButton: false, timer: 4000 });
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    // ── Step navigation guards ────────────────────────────────────────────
    const canNext = () => {
        if (step === 0) return pipelineId && !prereqError && pipelineFields.length > 0;
        if (step === 1) {
            if (!form.name.trim() || !form.start_at || !form.end_at) return false;
            if (new Date(form.end_at) <= new Date(form.start_at)) return false;
            if (form.modality === "in_person" && !form.location.trim()) return false;
            if (form.modality === "virtual" && !form.virtual_url.trim()) return false;
            const d = Number(form.link_duration_days);
            if (d < LINK_MIN_DAYS || d > LINK_MAX_DAYS) return false;
            return true;
        }
        if (step === 2) return allAttendees().length >= 1;
        return true;
    };

    const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
    const back = () => setStep((s) => Math.max(s - 1, 0));

    // ── Final submit ──────────────────────────────────────────────────────
    const submit = async () => {
        setSubmitting(true);
        try {
            const attendees = allAttendees();
            const payload = {
                name: form.name.trim(),
                description: form.description,
                modality: form.modality,
                pipeline: pipelineId,
                location: form.modality === "in_person" ? form.location.trim() : "",
                virtual_url: form.modality === "virtual" ? form.virtual_url.trim() : "",
                start_at: new Date(form.start_at).toISOString(),
                end_at: new Date(form.end_at).toISOString(),
                link_duration_days: Number(form.link_duration_days),
                attendees,
            };
            const event = await createEvent(payload);

            // Send invitations (with .ics) to the loaded attendees.
            try {
                await approveAttendees(event.id, attendees, true);
            } catch (e) {
                // Non-fatal — event exists; invitations can be resent from detail.
                console.error("Invitation send failed:", e);
            }

            Swal.fire({ icon: "success", title: "Event created", text: "Attendees loaded and invitations sent.", toast: true, position: "top-end", showConfirmButton: false, timer: 3500 });
            navigate(`/event/${event.id}`);
        } catch (err) {
            Swal.fire({ icon: "error", title: "Could not create event", text: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    // ── UI ────────────────────────────────────────────────────────────────
    const labelStyle = { color: "#2E2A26", fontSize: 13, fontWeight: 600 };
    const inputCls = "w-full h-10 px-3 rounded-lg text-sm";
    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}>
                    <CalendarDays className="h-5 w-5" style={{ color: GREEN }} />
                </div>
                <div>
                    <p className="text-base font-semibold" style={{ color: "#2E2A26" }}>New Event</p>
                    <p className="text-sm" style={{ color: "#9b948e" }}>Follow the steps to configure your event.</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: i < step ? GREEN : i === step ? GREEN : "#F2EBDD",
                                    color: i <= step ? "#FBF7EF" : "#9b948e",
                                    border: `1px solid ${i <= step ? GREEN : "#D8D2C4"}`,
                                }}
                            >
                                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <span className="text-xs font-medium hidden sm:block" style={{ color: i === step ? "#2E2A26" : "#9b948e" }}>{s}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ backgroundColor: "#D8D2C4" }} />}
                    </div>
                ))}
            </div>

            <div className="rounded-xl p-6" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                {/* STEP 1 — Pipeline */}
                {step === 0 && (
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>Pipeline *</label>
                            <p className="text-xs mb-2" style={{ color: "#9b948e" }}>
                                The public form fields come from this pipeline's lead fields, and every registration becomes a lead here.
                            </p>
                            <select
                                className={inputCls}
                                style={inputStyle}
                                value={pipelineId}
                                onChange={(e) => selectPipeline(e.target.value)}
                            >
                                <option value="">Select a pipeline…</option>
                                {pipelines.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {checkingPrereq && <p className="text-sm" style={{ color: "#9b948e" }}>Checking pipeline…</p>}

                        {prereqError && (
                            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "#FBEEE9", border: "1px solid #E4B9A8" }}>
                                <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: "#B0592E" }} />
                                <p className="text-sm" style={{ color: "#8a3f1e" }}>{prereqError}</p>
                            </div>
                        )}

                        {pipelineFields.length > 0 && !prereqError && (
                            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(94,106,67,0.08)", border: "1px solid rgba(94,106,67,0.25)" }}>
                                <p className="text-xs font-semibold mb-2" style={{ color: GREEN }}>
                                    The public form will ask for these {pipelineFields.length} field(s):
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {pipelineFields.map((f) => (
                                        <span key={f.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C4", color: "#2E2A26" }}>
                                            {f.label}{f.is_required ? " *" : ""}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2 — Details */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>Event name *</label>
                            <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>

                        <div>
                            <label style={labelStyle}>Modality *</label>
                            <div className="flex gap-2 mt-1">
                                {[
                                    { v: "in_person", label: "In Person", icon: MapPin },
                                    { v: "virtual", label: "Virtual", icon: Video },
                                ].map(({ v, label, icon: Icon }) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setForm({ ...form, modality: v })}
                                        className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium cursor-pointer"
                                        style={{
                                            border: `1px solid ${form.modality === v ? GREEN : "#D8D2C4"}`,
                                            backgroundColor: form.modality === v ? "rgba(94,106,67,0.12)" : "#FFFFFF",
                                            color: form.modality === v ? GREEN : "#6b6560",
                                        }}
                                    >
                                        <Icon className="h-4 w-4" /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.modality === "in_person" ? (
                            <div>
                                <label style={labelStyle}>Location *</label>
                                <input className={inputCls} style={inputStyle} placeholder="Venue address" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            </div>
                        ) : (
                            <div>
                                <label style={labelStyle}>Join URL *</label>
                                <input className={inputCls} style={inputStyle} placeholder="https://meet.example.com/..." value={form.virtual_url} onChange={(e) => setForm({ ...form, virtual_url: e.target.value })} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label style={labelStyle}>Starts at *</label>
                                <input type="datetime-local" className={inputCls} style={inputStyle} value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Ends at *</label>
                                <input type="datetime-local" className={inputCls} style={inputStyle} value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Registration link valid for (days) *</label>
                            <p className="text-xs mb-1" style={{ color: "#9b948e" }}>Minimum {LINK_MIN_DAYS}, maximum {LINK_MAX_DAYS} days.</p>
                            <input
                                type="number" min={LINK_MIN_DAYS} max={LINK_MAX_DAYS}
                                className={inputCls} style={inputStyle}
                                value={form.link_duration_days}
                                onChange={(e) => setForm({ ...form, link_duration_days: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* STEP 3 — Attendees */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold" style={{ color: "#2E2A26" }}>Participantes / Attendees</p>
                                <p className="text-xs" style={{ color: "#9b948e" }}>Add manually or upload an Excel file. At least one is required.</p>
                            </div>
                            <button
                                type="button"
                                onClick={downloadAttendeeTemplate}
                                className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                                style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#FFFFFF" }}
                            >
                                <Download className="h-4 w-4" /> Download template
                            </button>
                        </div>

                        {/* Manual entry */}
                        <div className="space-y-2">
                            {manualAttendees.map((a, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    <input className="col-span-3 h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="First name *" value={a.first_name} onChange={(e) => handleManualChange(idx, "first_name", e.target.value)} />
                                    <input className="col-span-3 h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Last name" value={a.last_name} onChange={(e) => handleManualChange(idx, "last_name", e.target.value)} />
                                    <input className="col-span-3 h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Email" value={a.email} onChange={(e) => handleManualChange(idx, "email", e.target.value)} />
                                    <input className="col-span-2 h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Phone" value={a.phone} onChange={(e) => handleManualChange(idx, "phone", e.target.value)} />
                                    <button type="button" className="col-span-1 flex justify-center cursor-pointer" style={{ color: "#c0392b" }} onClick={() => removeManualRow(idx)} title="Remove">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addManualRow} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer mt-1" style={{ color: GREEN }}>
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
                            Total attendees: {allAttendees().length}
                        </p>
                    </div>
                )}

                {/* STEP 4 — Preview */}
                {step === 3 && (
                    <div className="space-y-3">
                        <p className="text-sm font-semibold" style={{ color: "#2E2A26" }}>
                            Review the attendees before loading them ({allAttendees().length})
                        </p>
                        <div className="overflow-auto rounded-lg" style={{ border: "1px solid #D8D2C4", maxHeight: 320 }}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ backgroundColor: GREEN }}>
                                        {["First name", "Last name", "Email", "Phone", "Company", "Source"].map((h) => (
                                            <th key={h} className="px-3 py-2 text-xs font-semibold text-left" style={{ color: "#FBF7EF" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody style={{ color: "#2E2A26" }}>
                                    {allAttendees().map((a, i) => (
                                        <tr key={i} style={{ borderBottom: "1px solid #D8D2C4" }}>
                                            <td className="px-3 py-1.5">{a.first_name}</td>
                                            <td className="px-3 py-1.5">{a.last_name}</td>
                                            <td className="px-3 py-1.5">{a.email}</td>
                                            <td className="px-3 py-1.5">{a.phone}</td>
                                            <td className="px-3 py-1.5">{a.company}</td>
                                            <td className="px-3 py-1.5">
                                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F2EBDD", color: "#6b6560" }}>{a.source}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* STEP 5 — Confirm */}
                {step === 4 && (
                    <div className="space-y-3">
                        <p className="text-sm font-semibold" style={{ color: "#2E2A26" }}>Confirm & create</p>
                        <div className="grid grid-cols-2 gap-3 text-sm" style={{ color: "#2E2A26" }}>
                            <div><span style={{ color: "#9b948e" }}>Event: </span>{form.name}</div>
                            <div><span style={{ color: "#9b948e" }}>Modality: </span>{form.modality === "virtual" ? "Virtual" : "In Person"}</div>
                            <div><span style={{ color: "#9b948e" }}>Pipeline: </span>{pipelines.find((p) => p.id === pipelineId)?.name}</div>
                            <div><span style={{ color: "#9b948e" }}>Attendees: </span>{allAttendees().length}</div>
                            <div><span style={{ color: "#9b948e" }}>Link valid: </span>{form.link_duration_days} day(s)</div>
                        </div>
                        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(94,106,67,0.08)", border: "1px solid rgba(94,106,67,0.25)" }}>
                            <Check className="h-4 w-4 mt-0.5" style={{ color: GREEN }} />
                            <p className="text-xs" style={{ color: "#4a5535" }}>
                                On confirm: attendees are loaded, the event goes live, invitation emails (with a calendar .ics) are sent, and a public registration link + QR are generated.
                            </p>
                        </div>
                    </div>
                )}

                {/* Nav buttons */}
                <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid #D8D2C4" }}>
                    <button
                        type="button"
                        onClick={step === 0 ? () => navigate("/event") : back}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{ border: "1px solid #D8D2C4", color: "#6b6560", backgroundColor: "#FFFFFF" }}
                    >
                        <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button
                            type="button"
                            onClick={next}
                            disabled={!canNext()}
                            className="flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-semibold cursor-pointer"
                            style={{ backgroundColor: canNext() ? GREEN : "#c9c3b6", color: "#FBF7EF" }}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={submit}
                            disabled={submitting}
                            className="flex items-center gap-1.5 h-10 px-5 rounded-lg text-sm font-semibold cursor-pointer"
                            style={{ backgroundColor: GREEN, color: "#FBF7EF", opacity: submitting ? 0.7 : 1 }}
                        >
                            {submitting ? "Creating…" : "Create event"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
