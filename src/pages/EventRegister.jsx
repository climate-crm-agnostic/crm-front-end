import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, MapPin, Video, CheckCircle2, XCircle, Clock } from "lucide-react";
import { DynamicAttributeField } from "@/components/attributes/DynamicAttributeField";
import { getPublicEvent, submitPublicRegistration } from "@/services/eventService";

const GREEN = "#5E6A43";

/**
 * Maps a backend PipelineAttribute into the shape DynamicAttributeField
 * expects: `list_values` (array of strings) -> `options`.
 */
const toFieldProps = (f) => ({
    name: f.name,
    label: f.label,
    type: f.type,
    is_required: f.is_required,
    format_config: f.format_config,
    options: (f.list_values || []).map((v) => ({ value: v, label: v })),
});

export const EventRegister = () => {
    const { token } = useParams();

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(null);
    const [fields, setFields] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Base contact + dynamic attribute values
    const [base, setBase] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "" });
    const [attrs, setAttrs] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        (async () => {
            const res = await getPublicEvent(token);
            if (res.ok && res.data?.valid) {
                setEvent(res.data.event);
                setFields(res.data.fields || []);
            } else {
                setErrorMsg(res.data?.error || "This event registration link is not available.");
            }
            setLoading(false);
        })();
    }, [token]);

    const setAttr = (name, value) => setAttrs((prev) => ({ ...prev, [name]: value }));

    const validate = () => {
        const errs = {};
        if (!base.first_name.trim()) errs.first_name = "First name is required.";
        fields.forEach((f) => {
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
            const res = await submitPublicRegistration(token, { ...base, attributes: attrs });
            if (res.ok && res.data?.success) {
                setDone(true);
            } else if (res.status === 410) {
                setErrorMsg(res.data?.error || "This event registration link is no longer available.");
                setEvent(null);
            } else {
                // Field-level errors from backend
                const backendErrs = res.data?.attributes;
                if (backendErrs && typeof backendErrs === "object") {
                    setFieldErrors(backendErrs);
                } else {
                    setFieldErrors({ _global: res.data?.error || "Could not submit your registration." });
                }
            }
        } catch {
            setFieldErrors({ _global: "Could not reach the server. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Screens ────────────────────────────────────────────────────────────
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
                <p className="text-sm" style={{ color: "#6b6560" }}>Thank you for registering for {event?.name}. We look forward to seeing you.</p>
            </div>
        );
    }

    const inputCls = "w-full h-10 px-3 rounded-lg text-sm";
    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };
    const labelStyle = { color: "#2E2A26", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 };

    return shell(
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF" }}>
            {/* Header */}
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
                            {new Date(event.start_at).toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Form */}
            <form className="p-6 space-y-4" onSubmit={submit}>
                {fieldErrors._global && (
                    <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#FBEEE9", border: "1px solid #E4B9A8", color: "#8a3f1e" }}>
                        {fieldErrors._global}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={labelStyle}>First name *</label>
                        <input className={inputCls} style={inputStyle} value={base.first_name} onChange={(e) => setBase({ ...base, first_name: e.target.value })} />
                        {fieldErrors.first_name && <p className="text-xs mt-1" style={{ color: "#B0592E" }}>{fieldErrors.first_name}</p>}
                    </div>
                    <div>
                        <label style={labelStyle}>Last name</label>
                        <input className={inputCls} style={inputStyle} value={base.last_name} onChange={(e) => setBase({ ...base, last_name: e.target.value })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={labelStyle}>Email</label>
                        <input type="email" className={inputCls} style={inputStyle} value={base.email} onChange={(e) => setBase({ ...base, email: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Phone</label>
                        <input className={inputCls} style={inputStyle} value={base.phone} onChange={(e) => setBase({ ...base, phone: e.target.value })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={labelStyle}>Company</label>
                        <input className={inputCls} style={inputStyle} value={base.company} onChange={(e) => setBase({ ...base, company: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Job title</label>
                        <input className={inputCls} style={inputStyle} value={base.job_title} onChange={(e) => setBase({ ...base, job_title: e.target.value })} />
                    </div>
                </div>

                {/* Dynamic pipeline fields */}
                {fields.length > 0 && (
                    <div className="pt-2 space-y-4" style={{ borderTop: "1px solid #EDE7D8" }}>
                        {fields.map((f) => {
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
                    {submitting ? "Submitting…" : "Register"}
                </button>
            </form>
        </div>
    );
};
