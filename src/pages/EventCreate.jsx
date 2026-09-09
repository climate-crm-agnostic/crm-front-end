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
import { PhoneInput } from "@/components/ui/phone-input";

const GREEN = "#5E6A43";
const LINK_MIN_DAYS = 1;
const LINK_MAX_DAYS = 30;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Formats a Date into the value a <input type="datetime-local"> expects
// (local time, no timezone suffix): "YYYY-MM-DDTHH:mm".
const toLocalInput = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Today's date (YYYY-MM-DD) — min for the event-date picker (no past dates).
const todayDate = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Human-readable 24-hour display of a datetime-local value (US style, no
// am/pm): "Sep 13, 2026 · 08:00". Empty string when there's no value.
const fmt24 = (localStr) => {
    if (!localStr) return "";
    const d = new Date(localStr);
    if (isNaN(d)) return "";
    return d.toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
    });
};

// Splits a "YYYY-MM-DDTHH:mm" value into its date and time parts, and
// rebuilds it — used by the custom 24-hour schedule editor (native
// datetime-local renders am/pm depending on the browser locale, so we drive
// the time with our own 24h selects instead).
const splitLocal = (localStr) => {
    if (!localStr || !localStr.includes("T")) return { date: "", time: "" };
    const [date, time] = localStr.split("T");
    return { date, time: (time || "").slice(0, 5) };
};
const joinLocal = (date, time) => (date && time ? `${date}T${time}` : "");

// 24-hour options for the hour/minute selects.
const HOURS_24 = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES_60 = Array.from({ length: 60 }, (_, m) => String(m).padStart(2, "0"));

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
        event_date: "",                // YYYY-MM-DD — first cascade control
        duration_days: "",             // event length in days (also the link validity)
        start_at: "", end_at: "",      // computed (or manually customized)
        customize_schedule: false,     // when true, start/end are edited manually
    });
    const [attendeeErrors, setAttendeeErrors] = useState({}); // { idx: {email} }

    // Business rule: an event that lasts N days occupies WHOLE calendar days.
    //   start = event_date @ 08:00
    //   end   = (event_date + (N-1) days) @ 23:59
    // So a 1-day event on the 13th runs 13 08:00 → 13 23:59 (never spills into
    // the 14th). Returns { start_at, end_at } as datetime-local strings, or
    // empty strings when inputs are incomplete.
    const computeSchedule = (dateStr, days) => {
        const n = Number(days);
        if (!dateStr || !n || n < 1) return { start_at: "", end_at: "" };
        const [y, m, d] = dateStr.split("-").map(Number);
        if (!y || !m || !d) return { start_at: "", end_at: "" };
        const start = new Date(y, m - 1, d, 8, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 0);
        end.setDate(end.getDate() + (n - 1));
        return { start_at: toLocalInput(start), end_at: toLocalInput(end) };
    };

    // Cascade control 1 — event date. Changing it recomputes start/end
    // (unless the user has taken manual control via Customize).
    const setEventDate = (dateStr) => {
        setForm((f) => {
            const next = { ...f, event_date: dateStr };
            if (!f.customize_schedule) {
                const sched = computeSchedule(dateStr, f.duration_days);
                next.start_at = sched.start_at;
                next.end_at = sched.end_at;
            }
            return next;
        });
    };

    // Cascade control 2 — duration in days (enabled only once a date exists).
    const setDurationDays = (daysVal) => {
        setForm((f) => {
            const next = { ...f, duration_days: daysVal };
            if (!f.customize_schedule) {
                const sched = computeSchedule(f.event_date, daysVal);
                next.start_at = sched.start_at;
                next.end_at = sched.end_at;
            }
            return next;
        });
    };

    // Toggle manual editing of start/end. Turning it OFF recomputes from the
    // date + duration (keeps the three fields congruent). Turning it ON leaves
    // the current computed values as the editable starting point.
    const toggleCustomize = () => {
        setForm((f) => {
            const turningOn = !f.customize_schedule;
            const next = { ...f, customize_schedule: turningOn };
            if (!turningOn) {
                const sched = computeSchedule(f.event_date, f.duration_days);
                next.start_at = sched.start_at;
                next.end_at = sched.end_at;
            }
            return next;
        });
    };

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

        // Live per-field validation for email (only email format is enforced;
        // phone is guarded by the PhoneInput mask which rejects letters).
        if (field === "email") {
            setAttendeeErrors((prev) => {
                const rowErrs = { ...(prev[idx] || {}) };
                if (value && !EMAIL_RE.test(value)) rowErrs.email = "Enter a valid email address.";
                else delete rowErrs.email;
                return { ...prev, [idx]: rowErrs };
            });
        }
    };

    // Any manual row with a value that fails validation blocks Next.
    const manualRowsValid = () => {
        return manualAttendees.every((a) => {
            if (!(a.first_name || "").trim()) return true; // empty row is ignored
            if (a.email && !EMAIL_RE.test(a.email)) return false;
            return true;
        });
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
            if (!form.name.trim()) return false;
            if (form.modality === "in_person" && !form.location.trim()) return false;
            if (form.modality === "virtual" && !form.virtual_url.trim()) return false;

            // Cascade: date required, then a valid duration (1-30).
            if (!form.event_date) return false;
            const days = Number(form.duration_days);
            if (!days || days < LINK_MIN_DAYS || days > LINK_MAX_DAYS) return false;

            // Computed or customized start/end must exist and be coherent.
            if (!form.start_at || !form.end_at) return false;
            const start = new Date(form.start_at);
            const end = new Date(form.end_at);
            if (isNaN(start) || isNaN(end)) return false;
            if (end <= start) return false;

            // No events in the past (compare against now, minute precision).
            const now = new Date();
            now.setSeconds(0, 0);
            if (start < now) return false;

            return true;
        }
        if (step === 2) return allAttendees().length >= 1 && manualRowsValid();
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
                // Link validity equals the declared event duration in days.
                link_duration_days: Number(form.duration_days),
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
    const disabledStyle = { backgroundColor: "#F0ECE3", color: "#9b948e", cursor: "not-allowed" };

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

                        {/* Cascade: date → duration → (auto) start/end. */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label style={labelStyle}>Event date *</label>
                                <input
                                    type="date"
                                    className={inputCls}
                                    style={inputStyle}
                                    min={todayDate()}
                                    value={form.event_date}
                                    onChange={(e) => setEventDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Duration (days) *</label>
                                <input
                                    type="number" min={LINK_MIN_DAYS} max={LINK_MAX_DAYS}
                                    className={inputCls}
                                    style={{ ...inputStyle, ...(form.event_date ? {} : disabledStyle) }}
                                    disabled={!form.event_date}
                                    placeholder={form.event_date ? "" : "Pick an event date first"}
                                    value={form.duration_days}
                                    onChange={(e) => setDurationDays(e.target.value)}
                                />
                                <p className="text-xs mt-1" style={{ color: "#9b948e" }}>
                                    Minimum {LINK_MIN_DAYS}, maximum {LINK_MAX_DAYS}. Also sets the link validity.
                                </p>
                            </div>
                        </div>

                        {/* Computed / customizable schedule. Times shown in 24h. */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label style={labelStyle}>Schedule</label>
                                <button
                                    type="button"
                                    onClick={toggleCustomize}
                                    disabled={!form.event_date || !form.duration_days}
                                    className="text-xs font-semibold cursor-pointer"
                                    style={{ color: (!form.event_date || !form.duration_days) ? "#c9c3b6" : GREEN }}
                                >
                                    {form.customize_schedule ? "Use automatic schedule" : "Customize"}
                                </button>
                            </div>
                            <p className="text-xs mb-2" style={{ color: "#9b948e" }}>
                                {form.customize_schedule
                                    ? "Editing start/end manually. The event still lasts the number of days set above."
                                    : "Auto: starts at 08:00 on the event date, ends at 23:59 on the last day."}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: "start_at", label: "Starts at" },
                                    { key: "end_at", label: "Ends at" },
                                ].map(({ key, label }) => {
                                    const { date, time } = splitLocal(form[key]);
                                    const [hh = "", mm = ""] = time ? time.split(":") : ["", ""];
                                    const setDate = (v) => setForm({ ...form, [key]: joinLocal(v, time || "08:00") });
                                    const setHH = (v) => setForm({ ...form, [key]: joinLocal(date, `${v}:${mm || "00"}`) });
                                    const setMM = (v) => setForm({ ...form, [key]: joinLocal(date, `${hh || "00"}:${v}`) });
                                    return (
                                        <div key={key}>
                                            <label className="text-xs" style={{ color: "#6b6560" }}>{label}</label>
                                            {form.customize_schedule ? (
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="date"
                                                        className="h-10 px-2 rounded-lg text-sm flex-1 min-w-0"
                                                        style={inputStyle}
                                                        min={todayDate()}
                                                        value={date}
                                                        onChange={(e) => setDate(e.target.value)}
                                                    />
                                                    <select
                                                        className="h-10 px-1 rounded-lg text-sm"
                                                        style={inputStyle}
                                                        value={hh}
                                                        onChange={(e) => setHH(e.target.value)}
                                                        aria-label={`${label} hour`}
                                                    >
                                                        <option value="" disabled>HH</option>
                                                        {HOURS_24.map((h) => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                    <span className="self-center text-sm" style={{ color: "#6b6560" }}>:</span>
                                                    <select
                                                        className="h-10 px-1 rounded-lg text-sm"
                                                        style={inputStyle}
                                                        value={mm}
                                                        onChange={(e) => setMM(e.target.value)}
                                                        aria-label={`${label} minute`}
                                                    >
                                                        <option value="" disabled>MM</option>
                                                        {MINUTES_60.map((m) => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-10 px-3 rounded-lg text-sm flex items-center"
                                                    style={disabledStyle}
                                                >
                                                    {fmt24(form[key]) || "—"}
                                                </div>
                                            )}
                                            <p className="text-[11px] mt-0.5" style={{ color: "#9b948e" }}>{fmt24(form[key])}</p>
                                        </div>
                                    );
                                })}
                            </div>
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

                        {/* Manual entry — one card per attendee (fits all base fields) */}
                        <div className="space-y-3">
                            {manualAttendees.map((a, idx) => (
                                <div key={idx} className="p-3 rounded-lg" style={{ border: "1px solid #E7E1D4", backgroundColor: "#FFFFFF" }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold" style={{ color: "#9b948e" }}>Attendee {idx + 1}</span>
                                        {manualAttendees.length > 1 && (
                                            <button type="button" className="cursor-pointer" style={{ color: "#c0392b" }} onClick={() => removeManualRow(idx)} title="Remove">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input className="h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="First name *" value={a.first_name} onChange={(e) => handleManualChange(idx, "first_name", e.target.value)} />
                                        <input className="h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Last name" value={a.last_name} onChange={(e) => handleManualChange(idx, "last_name", e.target.value)} />
                                        <div>
                                            <input
                                                type="email"
                                                className="h-9 px-2 rounded-md text-sm w-full"
                                                style={{ ...inputStyle, borderColor: attendeeErrors[idx]?.email ? "#c0392b" : "#D8D2C4" }}
                                                placeholder="Email"
                                                value={a.email}
                                                onChange={(e) => handleManualChange(idx, "email", e.target.value)}
                                            />
                                            {attendeeErrors[idx]?.email && (
                                                <p className="text-[11px] mt-0.5" style={{ color: "#c0392b" }}>{attendeeErrors[idx].email}</p>
                                            )}
                                        </div>
                                        <input className="h-9 px-2 rounded-md text-sm" style={inputStyle} placeholder="Company" value={a.company} onChange={(e) => handleManualChange(idx, "company", e.target.value)} />
                                    </div>
                                    <div className="mt-2">
                                        <PhoneInput
                                            value={a.phone}
                                            onChange={(v) => handleManualChange(idx, "phone", v)}
                                            defaultCountry="US"
                                            placeholder="Phone number"
                                        />
                                    </div>
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
                            <div><span style={{ color: "#9b948e" }}>Duration: </span>{form.duration_days} day(s)</div>
                            <div className="col-span-2"><span style={{ color: "#9b948e" }}>When: </span>{fmt24(form.start_at)} → {fmt24(form.end_at)}</div>
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
