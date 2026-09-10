import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Video, CheckCircle2, XCircle, Clock, KeyRound, UserPlus, ChevronLeft } from "lucide-react";
import { DynamicAttributeField } from "@/components/attributes/DynamicAttributeField";
import { PhoneInput } from "@/components/ui/phone-input";
import { getPublicEvent, verifyEventCode, submitPublicRegistration, submitWalkIn } from "@/services/eventService";

const GREEN = "#5E6A43";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Passes a backend PipelineAttribute straight through to DynamicAttributeField.
 * The renderer already reads `list_values` / `format_config` / `is_calculated`
 * / etc. and normalizes options itself (via normalizeOptions), so we must NOT
 * pre-transform them here — doing so double-wraps the option objects and
 * crashes the renderer (React error #31).
 */
const toFieldProps = (f) => f;

// Seeds a controlled starting value for each editable field so inputs never
// flip from uncontrolled (undefined) to controlled (React warning).
const initAttrs = (fields) => {
    const out = {};
    (fields || []).forEach((f) => {
        if (f.is_calculated) return;
        out[f.name] = f.type === "multiselect" ? [] : "";
    });
    return out;
};

// Formats the typed code as NNN-NNN as the user types (digits only).
const formatCode = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "").slice(0, 6);
    return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
};

export const EventRegister = () => {
    const { token } = useParams();

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    // Phase: "code" → enter access code; "form" → review + fill lead fields.
    const [phase, setPhase] = useState("code");
    const [code, setCode] = useState("");
    const [codeError, setCodeError] = useState("");
    const [verifying, setVerifying] = useState(false);

    const [attendee, setAttendee] = useState(null);
    const [fields, setFields] = useState([]);
    const [attrs, setAttrs] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    // Walk-in (no code) — the person fills in all their own base details.
    const [walkBase, setWalkBase] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "" });
    const [baseErrors, setBaseErrors] = useState({});

    // Calculated fields are derived on save — never shown or required on the
    // public form. Everything the attendee actually fills in is here.
    const editableFields = fields.filter((f) => !f.is_calculated);

    useEffect(() => {
        (async () => {
            const res = await getPublicEvent(token);
            if (res.ok && res.data?.valid) {
                setEvent(res.data.event);
                setFields(res.data.fields || []);  // used by the walk-in form
            } else {
                setErrorMsg(res.data?.error || "This event registration link is not available.");
            }
            setLoading(false);
        })();
    }, [token]);

    // Clears everything and returns to the code screen so the on-site host can
    // register the next person without reloading the page.
    const resetForm = () => {
        setDone(false);
        setPhase("code");
        setCode("");
        setCodeError("");
        setAttendee(null);
        setAttrs({});
        setFieldErrors({});
        setWalkBase({ first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "" });
        setBaseErrors({});
    };

    const verify = async (e) => {
        e.preventDefault();
        setCodeError("");
        const digits = code.replace(/\D/g, "");
        if (digits.length !== 6) {
            setCodeError("Enter the full 6-digit code from your email.");
            return;
        }
        setVerifying(true);
        try {
            const res = await verifyEventCode(token, code);
            // Invalid / already-used codes now come back as 200 with
            // valid:false (no 4xx), so read the body, not the status.
            if (res.ok && res.data?.valid) {
                const fx = res.data.fields || [];
                setAttendee(res.data.attendee);
                setFields(fx);
                setAttrs(initAttrs(fx));   // seed controlled values (avoids uncontrolled→controlled warning)
                setPhase("form");
            } else if (res.status === 410) {
                setErrorMsg(res.data?.error || "This event registration link is no longer available.");
                setEvent(null);
            } else {
                setCodeError(res.data?.error || "That code is not valid for this event.");
            }
        } catch {
            setCodeError("Could not reach the server. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    const setAttr = (name, value) => setAttrs((prev) => ({ ...prev, [name]: value }));

    const validate = () => {
        const errs = {};
        editableFields.forEach((f) => {
            if (f.is_required) {
                const v = attrs[f.name];
                if (v === undefined || v === null || v === "") errs[f.name] = `${f.label} is required.`;
            }
        });
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const res = await submitPublicRegistration(token, code, attrs);
            if (res.ok && res.data?.success) {
                setDone(true);
            } else if (res.status === 410) {
                setErrorMsg(res.data?.error || "This event registration link is no longer available.");
                setEvent(null);
            } else {
                const backendErrs = res.data?.attributes;
                if (backendErrs && typeof backendErrs === "object") setFieldErrors(backendErrs);
                else setFieldErrors({ _global: res.data?.error || "Could not submit your registration." });
            }
        } catch {
            setFieldErrors({ _global: "Could not reach the server. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const setWalk = (field, value) => setWalkBase((prev) => ({ ...prev, [field]: value }));

    const submitWalkInForm = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!walkBase.first_name.trim()) errs.first_name = "First name is required.";
        if (!walkBase.email.trim()) errs.email = "Email is required.";
        else if (!EMAIL_RE.test(walkBase.email)) errs.email = "Enter a valid email address.";
        const dynErrs = {};
        editableFields.forEach((f) => {
            if (f.is_required) {
                const v = attrs[f.name];
                if (v === undefined || v === null || v === "") dynErrs[f.name] = `${f.label} is required.`;
            }
        });
        setBaseErrors(errs);
        setFieldErrors(dynErrs);
        if (Object.keys(errs).length || Object.keys(dynErrs).length) return;

        setSubmitting(true);
        try {
            const res = await submitWalkIn(token, { ...walkBase, attributes: attrs });
            if (res.ok && res.data?.success) {
                setDone(true);
            } else if (res.status === 410) {
                setErrorMsg(res.data?.error || "This event registration link is no longer available.");
                setEvent(null);
            } else {
                const be = res.data?.attributes;
                if (be && typeof be === "object") setFieldErrors(be);
                // Surface base-field errors (first_name/email) too.
                const baseBe = {};
                ["first_name", "email"].forEach((k) => { if (res.data?.[k]) baseBe[k] = res.data[k]; });
                if (Object.keys(baseBe).length) setBaseErrors(baseBe);
                if (!be && !Object.keys(baseBe).length) setFieldErrors({ _global: res.data?.error || "Could not submit your registration." });
            }
        } catch {
            setFieldErrors({ _global: "Could not reach the server. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Layout shell ─────────────────────────────────────────────────────
    const shell = (children) => (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            <div className="w-full max-w-lg">{children}</div>
        </div>
    );

    if (loading) return shell(<p className="text-center" style={{ color: "#6b6560" }}>Loading…</p>);

    if (errorMsg) {
        return shell(
            <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF" }}>
                <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "#B0592E" }} />
                <h1 className="text-lg font-semibold mb-1" style={{ color: "#2E2A26" }}>Registration unavailable</h1>
                <p className="text-sm" style={{ color: "#6b6560" }}>{errorMsg}</p>
            </div>
        );
    }

    if (done) {
        return shell(
            <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF" }}>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: "#2f9e3a" }} />
                <h1 className="text-lg font-semibold mb-1" style={{ color: "#2E2A26" }}>You're registered!</h1>
                <p className="text-sm mb-6" style={{ color: "#6b6560" }}>Thank you for confirming your attendance to {event?.name}. We look forward to seeing you.</p>
                <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ backgroundColor: GREEN, color: "#FBF7EF" }}
                >
                    <UserPlus className="h-4 w-4" /> Register another attendee
                </button>
            </div>
        );
    }

    const inputCls = "w-full h-10 px-3 rounded-lg text-sm";
    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };
    const readonlyStyle = { border: "1px solid #E7E1D4", backgroundColor: "#F0ECE3", color: "#6b6560" };
    const labelStyle = { color: "#2E2A26", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 };

    const header = (
        <div className="p-6" style={{ backgroundColor: GREEN }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "#D1FAE5" }}>Event Registration</p>
            <h1 className="text-xl font-bold mt-1" style={{ color: "#FFFFFF" }}>{event?.name}</h1>
            {event?.description && <p className="text-sm mt-1" style={{ color: "#EDE7D8" }}>{event.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: "#EDE7D8" }}>
                <span className="inline-flex items-center gap-1">
                    {event?.modality === "virtual" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                    {event?.modality === "virtual" ? (event?.virtual_url || "Virtual") : (event?.location || "In person")}
                </span>
                {event?.start_at && (
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(event.start_at).toLocaleString("en-US", { hour12: false })}
                    </span>
                )}
            </div>
        </div>
    );

    // ── Phase 1: enter access code ───────────────────────────────────────
    if (phase === "code") {
        return shell(
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF" }}>
                {header}
                <form className="p-6 space-y-4" onSubmit={verify}>
                    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(94,106,67,0.08)", border: "1px solid rgba(94,106,67,0.25)" }}>
                        <KeyRound className="h-5 w-5 mt-0.5" style={{ color: GREEN }} />
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "#2E2A26" }}>Enter your registration code</p>
                            <p className="text-xs mt-0.5" style={{ color: "#6b6560" }}>
                                We emailed you a 6-digit code (format 000-000). Type it below to check in.
                            </p>
                        </div>
                    </div>

                    <div>
                        <input
                            autoFocus
                            inputMode="numeric"
                            className="w-full h-14 px-3 rounded-lg text-center tracking-[0.4em] text-2xl font-bold"
                            style={{ ...inputStyle, borderColor: codeError ? "#c0392b" : "#D8D2C4", color: "#2E2A26" }}
                            placeholder="000-000"
                            value={code}
                            onChange={(e) => setCode(formatCode(e.target.value))}
                        />
                        {codeError && <p className="text-xs mt-1" style={{ color: "#c0392b" }}>{codeError}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full h-11 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: GREEN, color: "#FBF7EF", opacity: verifying ? 0.7 : 1 }}
                    >
                        {verifying ? "Checking…" : "Continue"}
                    </button>

                    <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px" style={{ backgroundColor: "#E7E1D4" }} />
                        <span className="text-xs" style={{ color: "#9b948e" }}>or</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: "#E7E1D4" }} />
                    </div>

                    <button
                        type="button"
                        onClick={() => { setAttrs(initAttrs(fields)); setPhase("walkin"); }}
                        className="w-full h-11 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                        style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#FFFFFF" }}
                    >
                        <UserPlus className="h-4 w-4" /> I don't have a code — register here
                    </button>
                </form>
            </div>
        );
    }

    // ── Walk-in: self-registration with no code ──────────────────────────
    if (phase === "walkin") {
        return shell(
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF" }}>
                {header}
                <form className="p-6 space-y-4" onSubmit={submitWalkInForm}>
                    <button
                        type="button"
                        onClick={() => setPhase("code")}
                        className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                        style={{ color: "#6b6560" }}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" /> I have a code
                    </button>

                    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(94,106,67,0.08)", border: "1px solid rgba(94,106,67,0.25)" }}>
                        <UserPlus className="h-5 w-5 mt-0.5" style={{ color: GREEN }} />
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "#2E2A26" }}>Register for the event</p>
                            <p className="text-xs mt-0.5" style={{ color: "#6b6560" }}>Fill in your details to check in.</p>
                        </div>
                    </div>

                    {fieldErrors._global && (
                        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#FBEEE9", border: "1px solid #E4B9A8", color: "#8a3f1e" }}>
                            {fieldErrors._global}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label style={labelStyle}>First name *</label>
                            <input className={inputCls} style={{ ...inputStyle, borderColor: baseErrors.first_name ? "#c0392b" : "#D8D2C4" }} value={walkBase.first_name} onChange={(e) => setWalk("first_name", e.target.value)} />
                            {baseErrors.first_name && <p className="text-xs mt-1" style={{ color: "#c0392b" }}>{baseErrors.first_name}</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Last name</label>
                            <input className={inputCls} style={inputStyle} value={walkBase.last_name} onChange={(e) => setWalk("last_name", e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Email *</label>
                            <input type="email" className={inputCls} style={{ ...inputStyle, borderColor: baseErrors.email ? "#c0392b" : "#D8D2C4" }} value={walkBase.email} onChange={(e) => setWalk("email", e.target.value)} />
                            {baseErrors.email && <p className="text-xs mt-1" style={{ color: "#c0392b" }}>{baseErrors.email}</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Phone</label>
                            <PhoneInput value={walkBase.phone} onChange={(v) => setWalk("phone", v)} defaultCountry="US" placeholder="Phone number" />
                        </div>
                        <div>
                            <label style={labelStyle}>Company</label>
                            <input className={inputCls} style={inputStyle} value={walkBase.company} onChange={(e) => setWalk("company", e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Job title</label>
                            <input className={inputCls} style={inputStyle} value={walkBase.job_title} onChange={(e) => setWalk("job_title", e.target.value)} />
                        </div>
                    </div>

                    {editableFields.length > 0 && (
                        <div className="pt-2 space-y-4" style={{ borderTop: "1px solid #EDE7D8" }}>
                            <p className="text-xs font-semibold" style={{ color: "#9b948e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Additional information</p>
                            {editableFields.map((f) => {
                                const fp = toFieldProps(f);
                                return (
                                    <div key={f.id}>
                                        <label style={labelStyle}>{f.label}{f.is_required ? " *" : ""}</label>
                                        <DynamicAttributeField attr={fp} value={attrs[f.name]} onChange={(v) => setAttr(f.name, v)} idPrefix="walk" />
                                        {fieldErrors[f.name] && <p className="text-xs mt-1" style={{ color: "#B0592E" }}>{fieldErrors[f.name]}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-11 rounded-lg text-sm font-semibold cursor-pointer mt-2"
                        style={{ backgroundColor: GREEN, color: "#FBF7EF", opacity: submitting ? 0.7 : 1 }}
                    >
                        {submitting ? "Submitting…" : "Register"}
                    </button>
                </form>
            </div>
        );
    }

    // ── Phase 2: review data (read-only) + fill lead fields ──────────────
    return shell(
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF" }}>
            {header}
            <form className="p-6 space-y-4" onSubmit={submit}>
                {fieldErrors._global && (
                    <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#FBEEE9", border: "1px solid #E4B9A8", color: "#8a3f1e" }}>
                        {fieldErrors._global}
                    </div>
                )}

                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: "rgba(60,198,71,0.1)", border: "1px solid rgba(60,198,71,0.3)" }}>
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#2f9e3a" }} />
                    <p className="text-xs" style={{ color: "#2f6f36" }}>Please review your details below and complete the remaining fields.</p>
                </div>

                {/* Read-only base info (already on file — cannot be edited here) */}
                <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#9b948e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your details</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label style={labelStyle}>First name</label>
                            <input readOnly disabled className={inputCls} style={readonlyStyle} value={attendee?.first_name || ""} />
                        </div>
                        <div>
                            <label style={labelStyle}>Last name</label>
                            <input readOnly disabled className={inputCls} style={readonlyStyle} value={attendee?.last_name || ""} />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input readOnly disabled className={inputCls} style={readonlyStyle} value={attendee?.email || ""} />
                        </div>
                        <div>
                            <label style={labelStyle}>Phone</label>
                            <input readOnly disabled className={inputCls} style={readonlyStyle} value={attendee?.phone || ""} />
                        </div>
                        <div>
                            <label style={labelStyle}>Company</label>
                            <input readOnly disabled className={inputCls} style={readonlyStyle} value={attendee?.company || ""} />
                        </div>
                        <div>
                            <label style={labelStyle}>Job title</label>
                            <input readOnly disabled className={inputCls} style={readonlyStyle} value={attendee?.job_title || ""} />
                        </div>
                    </div>
                </div>

                {/* Editable dynamic lead fields */}
                {editableFields.length > 0 && (
                    <div className="pt-2 space-y-4" style={{ borderTop: "1px solid #EDE7D8" }}>
                        <p className="text-xs font-semibold" style={{ color: "#9b948e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Additional information</p>
                        {editableFields.map((f) => {
                            const fp = toFieldProps(f);
                            return (
                                <div key={f.id}>
                                    <label style={labelStyle}>{f.label}{f.is_required ? " *" : ""}</label>
                                    <DynamicAttributeField
                                        attr={fp}
                                        value={attrs[f.name]}
                                        onChange={(v) => setAttr(f.name, v)}
                                        idPrefix="evt"
                                    />
                                    {fieldErrors[f.name] && <p className="text-xs mt-1" style={{ color: "#B0592E" }}>{fieldErrors[f.name]}</p>}
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-lg text-sm font-semibold cursor-pointer mt-2"
                    style={{ backgroundColor: GREEN, color: "#FBF7EF", opacity: submitting ? 0.7 : 1 }}
                >
                    {submitting ? "Submitting…" : "Confirm registration"}
                </button>
            </form>
        </div>
    );
};
