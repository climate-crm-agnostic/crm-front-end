import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
    ArrowLeft, Copy, Download, Power, RefreshCw, Send, MapPin, Video,
    CheckCircle2, XCircle, Users,
} from "lucide-react";
import Swal from "sweetalert2";
import {
    getEvent, getEventAttendees, deactivateEvent, reactivateEvent, sendInvitations, resendAttendee,
} from "@/services/eventService";

const GREEN = "#5E6A43";

const toast = (icon, title) =>
    Swal.fire({ icon, title, toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });

export const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const qrRef = useRef(null);

    const [event, setEvent] = useState(null);
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reactivateOpen, setReactivateOpen] = useState(false);

    const load = async () => {
        try {
            const [ev, at] = await Promise.all([getEvent(id), getEventAttendees(id)]);
            setEvent(ev);
            setAttendees(Array.isArray(at) ? at : []);
        } catch (e) {
            console.error(e);
            toast("error", "Failed to load event");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const copyLink = () => {
        navigator.clipboard.writeText(event.register_url);
        toast("success", "Link copied");
    };

    const downloadQR = () => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `event-qr-${event.name.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
    };

    const handleDeactivate = async () => {
        const r = await Swal.fire({
            title: "Deactivate event?",
            text: "The public registration link will stop working.",
            icon: "warning", showCancelButton: true, confirmButtonColor: GREEN,
            cancelButtonColor: "#9b948e", confirmButtonText: "Deactivate",
        });
        if (!r.isConfirmed) return;
        try { await deactivateEvent(id); toast("success", "Event deactivated"); load(); }
        catch { toast("error", "Failed to deactivate"); }
    };

    // Reactivation is handled by a dedicated modal (ReactivateModal below),
    // which reuses the same cascading date logic as event creation.
    const openReactivate = () => setReactivateOpen(true);

    const doReactivate = async (payload) => {
        try {
            await reactivateEvent(id, payload);
            toast("success", "Event reactivated — new link & QR generated");
            setReactivateOpen(false);
            load();
        } catch (e) { toast("error", e.message || "Failed to reactivate"); }
    };

    const handleResendAll = async () => {
        const r = await Swal.fire({
            title: "Resend to all attendees?",
            text: "This will resend the invitation to every attendee and generate a new code for each. Their previous codes will stop working.",
            icon: "warning", showCancelButton: true, confirmButtonColor: GREEN,
            cancelButtonColor: "#9b948e", confirmButtonText: "Yes, resend all",
        });
        if (!r.isConfirmed) return;
        try { const res = await sendInvitations(id); toast("success", `Invitations sent: ${res.invitations_sent}`); load(); }
        catch { toast("error", "Failed to send invitations"); }
    };

    const handleResendOne = async (attendee) => {
        const name = attendee.full_name || attendee.email || "this attendee";
        const r = await Swal.fire({
            title: "Resend invitation?",
            text: `A new invitation and a fresh code will be sent to ${name}. Their previous code will stop working.`,
            icon: "warning", showCancelButton: true, confirmButtonColor: GREEN,
            cancelButtonColor: "#9b948e", confirmButtonText: "Resend",
        });
        if (!r.isConfirmed) return;
        try { await resendAttendee(id, attendee.id); toast("success", `Invitation resent to ${name}`); load(); }
        catch (e) { toast("error", e.message || "Failed to resend"); }
    };

    if (loading || !event) {
        return <div className="p-8 text-center" style={{ color: "#6b6560" }}>Loading…</div>;
    }

    const linkValid = event.is_link_valid;
    // Resend is only meaningful for people who still need to register, and
    // only while the event link is live.
    const pendingWithEmail = attendees.filter((a) => a.status === "pending" && a.email);
    const canResendAll = linkValid && pendingWithEmail.length > 0;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            <button onClick={() => navigate("/event")} className="flex items-center gap-1.5 text-sm font-medium cursor-pointer" style={{ color: "#6b6560" }}>
                <ArrowLeft className="h-4 w-4" /> Back to events
            </button>

            {/* Header card */}
            <div className="rounded-xl p-6" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold" style={{ color: "#2E2A26" }}>{event.name}</h1>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                                backgroundColor: linkValid ? "rgba(60,198,71,0.12)" : "rgba(176,89,46,0.12)",
                                color: linkValid ? "#2f9e3a" : "#B0592E",
                                border: `1px solid ${linkValid ? "#3CC64755" : "#B0592E55"}`,
                            }}>
                                {event.status === "active" ? (linkValid ? "Active" : "Expired") : "Inactive"}
                            </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: "#9b948e" }}>{event.description || "No description"}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ color: "#6b6560" }}>
                            <span className="inline-flex items-center gap-1.5">
                                {event.modality === "virtual" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                                {event.modality === "virtual" ? (event.virtual_url || "Virtual") : (event.location || "In person")}
                            </span>
                            <span>Pipeline: <strong style={{ color: "#2E2A26" }}>{event.pipeline_name}</strong></span>
                            <span>Initial stage: <strong style={{ color: "#2E2A26" }}>{event.initial_stage}</strong></span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {event.status === "active" ? (
                            <button onClick={handleDeactivate} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer" style={{ border: "1px solid #E4B9A8", color: "#B0592E", backgroundColor: "#FFFFFF" }}>
                                <Power className="h-4 w-4" /> Deactivate
                            </button>
                        ) : (
                            <button onClick={openReactivate} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer" style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#FFFFFF" }}>
                                <RefreshCw className="h-4 w-4" /> Reactivate
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total attendees", value: event.attendee_count, color: "#5E6A43", bg: "rgba(94,106,67,0.10)" },
                    { label: "Confirmed", value: event.registered_count, color: "#2f9e3a", bg: "rgba(60,198,71,0.12)" },
                    {
                        label: event.is_ended ? "Did not attend" : "Pending",
                        value: event.is_ended ? event.not_attended_count : event.pending_count,
                        color: "#B0592E", bg: "rgba(176,89,46,0.12)",
                    },
                    {
                        label: "% Confirmed",
                        value: `${event.attendee_count ? Math.round((event.registered_count / event.attendee_count) * 100) : 0}%`,
                        color: "#5E6A43", bg: "rgba(94,106,67,0.10)",
                    },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl p-5 text-center" style={{ border: "1px solid #D8D2C4", backgroundColor: s.bg }}>
                        <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: "#6b6560" }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Public link + QR */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-xl p-6" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                    <p className="text-sm font-semibold mb-2" style={{ color: "#2E2A26" }}>Public registration link</p>
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={event.register_url}
                            className="flex-1 h-10 px-3 rounded-lg text-sm"
                            style={{ border: "1px solid #D8D2C4", backgroundColor: "#F5F0E8", color: "#2E2A26" }}
                        />
                        <button onClick={copyLink} className="flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: GREEN, color: "#FBF7EF" }}>
                            <Copy className="h-4 w-4" /> Copy
                        </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "#9b948e" }}>
                        {linkValid
                            ? `Link is live. Valid for ${event.link_duration_days} day${event.link_duration_days === 1 ? "" : "s"}.`
                            : "This link is not currently valid (event inactive, ended, or expired)."}
                    </p>
                </div>

                <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: "#2E2A26" }}>QR code</p>
                    {linkValid ? (
                        <>
                            <div ref={qrRef} className="p-2 bg-white rounded-lg">
                                <QRCodeCanvas value={event.register_url} size={140} level="M" includeMargin />
                            </div>
                            <button onClick={downloadQR} className="flex items-center gap-1.5 mt-3 text-xs font-semibold cursor-pointer" style={{ color: GREEN }}>
                                <Download className="h-3.5 w-3.5" /> Download QR
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-6" style={{ color: "#9b948e" }}>
                            <XCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs">QR available only while the event link is valid.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Attendees */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #D8D2C4", backgroundColor: "#F2EBDD" }}>
                    <Users className="h-4 w-4" style={{ color: GREEN }} />
                    <span className="text-sm font-semibold" style={{ color: "#2E2A26" }}>Attendees</span>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(94,106,67,0.12)", color: GREEN }}>
                        {attendees.length}
                    </span>
                    <span className="ml-3 text-xs" style={{ color: "#9b948e" }}>
                        {event.registered_count} registered
                    </span>
                    <button
                        onClick={handleResendAll}
                        disabled={!canResendAll}
                        title={canResendAll ? "Resend to all pending attendees" : (linkValid ? "No pending attendees to resend to" : "Event is not active")}
                        className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold"
                        style={{
                            border: `1px solid ${canResendAll ? GREEN : "#D8D2C4"}`,
                            color: canResendAll ? GREEN : "#c9c3b6",
                            backgroundColor: "#FFFFFF",
                            cursor: canResendAll ? "pointer" : "not-allowed",
                        }}
                    >
                        <Send className="h-3.5 w-3.5" /> Resend all
                    </button>
                </div>
                {attendees.length === 0 ? (
                    <div className="py-10 text-center text-sm" style={{ color: "#9b948e" }}>No attendees yet.</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: GREEN }}>
                                    {["Name", "Email", "Phone", "Company", "Source", "Status", "Actions"].map((h, i) => (
                                        <th key={h} className="px-4 py-2 text-xs font-semibold" style={{ color: "#FBF7EF", textAlign: i === 6 ? "center" : "left" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ color: "#2E2A26" }}>
                                {attendees.map((a) => (
                                    <tr key={a.id} style={{ borderBottom: "1px solid #D8D2C4" }}>
                                        <td className="px-4 py-2">{a.full_name}</td>
                                        <td className="px-4 py-2" style={{ color: "#6b6560" }}>{a.email || "—"}</td>
                                        <td className="px-4 py-2" style={{ color: "#6b6560" }}>{a.phone || "—"}</td>
                                        <td className="px-4 py-2" style={{ color: "#6b6560" }}>{a.company || "—"}</td>
                                        <td className="px-4 py-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F2EBDD", color: "#6b6560" }}>{a.source}</span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {(() => {
                                                const map = {
                                                    confirmed: { label: "Confirmed", color: "#2f9e3a", bg: "rgba(60,198,71,0.12)" },
                                                    pending: { label: "Pending", color: "#9b7a2e", bg: "rgba(206,218,102,0.25)" },
                                                    not_attended: { label: "Did not attend", color: "#B0592E", bg: "rgba(176,89,46,0.12)" },
                                                };
                                                const s = map[a.status] || map.pending;
                                                return (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
                                                        {a.status === "confirmed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        {s.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {(() => {
                                                // Resend only makes sense for a pending attendee with an
                                                // email, while the event link is still live.
                                                const canResend = linkValid && a.email && a.status === "pending";
                                                const reason = !linkValid ? "Event is not active"
                                                    : !a.email ? "No email on file"
                                                    : a.status === "confirmed" ? "Already confirmed"
                                                    : a.status === "not_attended" ? "Event ended"
                                                    : "Resend invitation (new code)";
                                                return (
                                                    <button
                                                        onClick={() => canResend && handleResendOne(a)}
                                                        disabled={!canResend}
                                                        title={reason}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                                                        style={{ color: canResend ? GREEN : "#c9c3b6", backgroundColor: "transparent", cursor: canResend ? "pointer" : "not-allowed" }}
                                                        onMouseEnter={(e) => { if (canResend) e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.1)"; }}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                    >
                                                        <Send className="h-4 w-4" />
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {reactivateOpen && (
                <ReactivateModal
                    event={event}
                    onClose={() => setReactivateOpen(false)}
                    onSubmit={doReactivate}
                />
            )}
        </div>
    );
};


// ── Reactivate modal — reuses the create wizard's cascading date logic ─────
const LINK_MIN = 1, LINK_MAX = 30;

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayDate = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dateOf = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = Array.from({ length: 60 }, (_, m) => pad(m));
const splitLocal = (s) => (s && s.includes("T") ? { date: s.split("T")[0], time: s.split("T")[1].slice(0, 5) } : { date: "", time: "" });
const joinLocal = (d, t) => (d && t ? `${d}T${t}` : "");
const fmt24 = (s) => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? "" : d.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); };

// Same rule as creation: N whole calendar days, 08:00 → 23:59 on the last day.
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

const ReactivateModal = ({ event, onClose, onSubmit }) => {
    const GREEN = "#5E6A43";
    const isVirtual = event.modality === "virtual";

    const [form, setForm] = useState(() => ({
        event_date: dateOf(event.start_at) || todayDate(),
        duration_days: event.link_duration_days || 1,
        start_at: "",
        end_at: "",
        customize: false,
        location: event.location || "",
        virtual_url: event.virtual_url || "",
    }));
    const [submitting, setSubmitting] = useState(false);

    // Initialize computed schedule from the event's original date + duration.
    useEffect(() => {
        const sched = computeSchedule(dateOf(event.start_at) || todayDate(), event.link_duration_days || 1);
        setForm((f) => ({ ...f, ...sched }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setDate = (v) => setForm((f) => {
        const next = { ...f, event_date: v };
        if (!f.customize) Object.assign(next, computeSchedule(v, f.duration_days));
        return next;
    });
    const setDays = (v) => setForm((f) => {
        const next = { ...f, duration_days: v };
        if (!f.customize) Object.assign(next, computeSchedule(f.event_date, v));
        return next;
    });
    const toggleCustomize = () => setForm((f) => {
        const on = !f.customize;
        const next = { ...f, customize: on };
        if (!on) Object.assign(next, computeSchedule(f.event_date, f.duration_days));
        return next;
    });

    const inputCls = "w-full h-10 px-3 rounded-lg text-sm";
    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };
    const disabledStyle = { backgroundColor: "#F0ECE3", color: "#9b948e", cursor: "not-allowed" };
    const labelStyle = { color: "#2E2A26", fontSize: 13, fontWeight: 600 };

    const valid = (() => {
        const days = Number(form.duration_days);
        if (!form.event_date || !days || days < LINK_MIN || days > LINK_MAX) return false;
        if (!form.start_at || !form.end_at) return false;
        const s = new Date(form.start_at), e = new Date(form.end_at);
        if (isNaN(s) || isNaN(e) || e <= s) return false;
        if (isVirtual && !form.virtual_url.trim()) return false;
        if (!isVirtual && !form.location.trim()) return false;
        return true;
    })();

    const submit = async () => {
        if (!valid) return;
        setSubmitting(true);
        await onSubmit({
            start_at: new Date(form.start_at).toISOString(),
            end_at: new Date(form.end_at).toISOString(),
            link_duration_days: Number(form.duration_days),
            location: isVirtual ? "" : form.location.trim(),
            virtual_url: isVirtual ? form.virtual_url.trim() : "",
        });
        setSubmitting(false);
    };

    const { date: sDate, time: sTime } = splitLocal(form.start_at);
    const { date: eDate, time: eTime } = splitLocal(form.end_at);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-auto" style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                <h2 className="text-lg font-semibold" style={{ color: "#2E2A26" }}>Reactivate event</h2>
                <p className="text-xs" style={{ color: "#9b948e" }}>New registrations add to the existing ones. A new link and QR are generated.</p>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={labelStyle}>Event date *</label>
                        <input type="date" className={inputCls} style={inputStyle} min={todayDate()} value={form.event_date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Duration (days) *</label>
                        <input type="number" min={LINK_MIN} max={LINK_MAX} className={inputCls} style={inputStyle} value={form.duration_days} onChange={(e) => setDays(e.target.value)} />
                        <p className="text-xs mt-1" style={{ color: "#9b948e" }}>Min {LINK_MIN}, max {LINK_MAX}. Also sets link validity.</p>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label style={labelStyle}>Schedule</label>
                        <button type="button" onClick={toggleCustomize} className="text-xs font-semibold cursor-pointer" style={{ color: GREEN }}>
                            {form.customize ? "Use automatic schedule" : "Customize"}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: "start_at", label: "Starts at", date: sDate, time: sTime },
                            { key: "end_at", label: "Ends at", date: eDate, time: eTime },
                        ].map(({ key, label, date, time }) => {
                            const [hh = "", mm = ""] = time ? time.split(":") : ["", ""];
                            return (
                                <div key={key}>
                                    <label className="text-xs" style={{ color: "#6b6560" }}>{label}</label>
                                    {form.customize ? (
                                        <div className="flex gap-1.5">
                                            <input type="date" className="h-10 px-2 rounded-lg text-sm flex-1 min-w-0" style={inputStyle} min={todayDate()} value={date} onChange={(e) => setForm((f) => ({ ...f, [key]: joinLocal(e.target.value, time || "08:00") }))} />
                                            <select className="h-10 px-1 rounded-lg text-sm" style={inputStyle} value={hh} onChange={(e) => setForm((f) => ({ ...f, [key]: joinLocal(date, `${e.target.value}:${mm || "00"}`) }))}>
                                                <option value="" disabled>HH</option>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <span className="self-center text-sm" style={{ color: "#6b6560" }}>:</span>
                                            <select className="h-10 px-1 rounded-lg text-sm" style={inputStyle} value={mm} onChange={(e) => setForm((f) => ({ ...f, [key]: joinLocal(date, `${hh || "00"}:${e.target.value}`) }))}>
                                                <option value="" disabled>MM</option>{MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="h-10 px-3 rounded-lg text-sm flex items-center" style={disabledStyle}>{fmt24(form[key]) || "—"}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>{isVirtual ? "Join URL *" : "Location / address *"}</label>
                    {isVirtual ? (
                        <input className={inputCls} style={inputStyle} placeholder="https://meet.example.com/..." value={form.virtual_url} onChange={(e) => setForm((f) => ({ ...f, virtual_url: e.target.value }))} />
                    ) : (
                        <input className={inputCls} style={inputStyle} placeholder="Venue address" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer" style={{ border: "1px solid #D8D2C4", color: "#6b6560", backgroundColor: "#FFFFFF" }}>Cancel</button>
                    <button type="button" onClick={submit} disabled={!valid || submitting} className="h-10 px-5 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: valid ? GREEN : "#c9c3b6", color: "#FBF7EF", opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? "Reactivating…" : "Reactivate"}
                    </button>
                </div>
            </div>
        </div>
    );
};