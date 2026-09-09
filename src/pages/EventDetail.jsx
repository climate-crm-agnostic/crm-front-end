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
const LINK_MIN_DAYS = 1;
const LINK_MAX_DAYS = 30;

const toast = (icon, title) =>
    Swal.fire({ icon, title, toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });

export const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const qrRef = useRef(null);

    const [event, setEvent] = useState(null);
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const handleReactivate = async () => {
        const { value: formValues } = await Swal.fire({
            title: "Reactivate event",
            html:
                `<input id="swal-start" type="datetime-local" class="swal2-input" placeholder="Start">` +
                `<input id="swal-end" type="datetime-local" class="swal2-input" placeholder="End">` +
                `<input id="swal-days" type="number" min="${LINK_MIN_DAYS}" max="${LINK_MAX_DAYS}" value="${event.link_duration_days}" class="swal2-input" placeholder="Link days (1-30)">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: GREEN,
            confirmButtonText: "Reactivate",
            preConfirm: () => {
                const start = document.getElementById("swal-start").value;
                const end = document.getElementById("swal-end").value;
                const days = Number(document.getElementById("swal-days").value);
                if (!start || !end) { Swal.showValidationMessage("Start and end are required"); return false; }
                if (new Date(end) <= new Date(start)) { Swal.showValidationMessage("End must be after start"); return false; }
                if (days < LINK_MIN_DAYS || days > LINK_MAX_DAYS) { Swal.showValidationMessage(`Link days must be ${LINK_MIN_DAYS}-${LINK_MAX_DAYS}`); return false; }
                return { start, end, days };
            },
        });
        if (!formValues) return;
        try {
            await reactivateEvent(id, {
                start_at: new Date(formValues.start).toISOString(),
                end_at: new Date(formValues.end).toISOString(),
                link_duration_days: formValues.days,
            });
            toast("success", "Event reactivated — new link & QR generated");
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
                            <button onClick={handleReactivate} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer" style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#FFFFFF" }}>
                                <RefreshCw className="h-4 w-4" /> Reactivate
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total attendees", value: event.attendee_count, color: "#5E6A43", bg: "rgba(94,106,67,0.10)" },
                    { label: "Confirmed", value: event.registered_count, color: "#2f9e3a", bg: "rgba(60,198,71,0.12)" },
                    {
                        label: event.is_ended ? "Did not attend" : "Pending",
                        value: event.is_ended ? event.not_attended_count : event.pending_count,
                        color: "#B0592E", bg: "rgba(176,89,46,0.12)",
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
                        className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                        style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#FFFFFF" }}
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
                                            <button
                                                onClick={() => handleResendOne(a)}
                                                disabled={!a.email}
                                                title={a.email ? "Resend invitation (new code)" : "No email on file"}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer"
                                                style={{ color: a.email ? GREEN : "#c9c3b6", backgroundColor: "transparent" }}
                                                onMouseEnter={(e) => { if (a.email) e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.1)"; }}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                            >
                                                <Send className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
