import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
    ArrowLeft, Copy, Download, Power, RefreshCw, Send, MapPin, Video,
    CheckCircle2, XCircle, Users, MoreVertical, Pencil, Trash2, UserPlus,
} from "lucide-react";
import Swal from "sweetalert2";
import {
    getEvent, getEventAttendees, deactivateEvent, reactivateEvent, sendInvitations, resendAttendee,
    updateAttendee, deleteAttendee,
} from "@/services/eventService";
import { AddAttendeesModal } from "@/components/events/AddAttendeesModal";
import { EditAttendeeModal } from "@/components/events/EditAttendeeModal";

const GREEN = "#5E6A43";

const toast = (icon, title) =>
    Swal.fire({ icon, title, toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });

// Derives the badge label/color from the event's live state. A future event
// (active but its link hasn't opened yet) shows "Scheduled" — not "Expired".
const eventStatus = (event) => {
    if (event.status !== "active") return { label: "Inactive", color: "#B0592E" };
    if (event.is_link_valid) return { label: "Active", color: "#2f9e3a" };
    if (event.is_not_open_yet) return { label: "Scheduled", color: "#5E6A43" };
    return { label: "Expired", color: "#B0592E" };
};

export const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const qrRef = useRef(null);

    const [event, setEvent] = useState(null);
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editAttendee, setEditAttendee] = useState(null);   // attendee being edited
    const [menuFor, setMenuFor] = useState(null);             // attendee id whose row menu is open

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

    const copyJoinUrl = () => {
        if (!event?.virtual_url) return;
        navigator.clipboard.writeText(event.virtual_url);
        toast("success", "Meeting link copied");
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

    const handleDeleteAttendee = async (attendee) => {
        setMenuFor(null);
        const name = attendee.full_name || attendee.email || "this attendee";
        const r = await Swal.fire({
            title: "Remove attendee?",
            text: `${name} will be removed from this event. This can't be undone.`,
            icon: "warning", showCancelButton: true, confirmButtonColor: "#B0592E",
            cancelButtonColor: "#9b948e", confirmButtonText: "Yes, remove",
        });
        if (!r.isConfirmed) return;
        try { await deleteAttendee(id, attendee.id); toast("success", `${name} removed`); load(); }
        catch (e) { toast("error", e.message || "Failed to remove attendee"); }
    };

    const handleSaveAttendee = async (data) => {
        await updateAttendee(id, editAttendee.id, data);
        toast("success", "Attendee updated");
        setEditAttendee(null);
        load();
    };

    const handleAttendeesAdded = () => {
        setAddOpen(false);
        load();
    };

    if (loading || !event) {
        return <div className="p-8 text-center" style={{ color: "#6b6560" }}>Loading…</div>;
    }

    const linkValid = event.is_link_valid;
    const isVirtual = event.modality === "virtual";
    // A scheduled (future) event's link/QR are worth showing so the admin can
    // distribute them ahead of time; only ended/inactive events hide the QR.
    const linkShareable = linkValid || event.is_not_open_yet;
    // Invitations can be sent while the event is active and hasn't ended —
    // including scheduled (future) events, whose link just isn't open yet.
    const canSendInvites = event.status === "active" && !event.is_ended;
    // Resend is only meaningful for people who still need to register.
    const pendingWithEmail = attendees.filter((a) => a.status === "pending" && a.email);
    const canResendAll = canSendInvites && pendingWithEmail.length > 0;

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
                            {(() => {
                                const { label, color } = eventStatus(event);
                                return (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                                        backgroundColor: `${color}1f`,
                                        color,
                                        border: `1px solid ${color}55`,
                                    }}>
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-sm mt-1" style={{ color: "#9b948e" }}>{event.description || "No description"}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ color: "#6b6560" }}>
                            <span className="inline-flex items-center gap-1.5">
                                {event.modality === "virtual" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                                {event.modality === "virtual" ? "Virtual" : (event.location || "In person")}
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

            {/* Link + QR */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-xl p-6" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                    {isVirtual ? (
                        // VIRTUAL: no public registration link (attendees get a
                        // personal link by email). Only the meeting link shows.
                        <>
                            <p className="text-sm font-semibold mb-2 inline-flex items-center gap-1.5" style={{ color: "#2E2A26" }}>
                                <Video className="h-4 w-4" /> Meeting link
                            </p>
                            {event.virtual_url ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <input
                                            readOnly
                                            value={event.virtual_url}
                                            className="flex-1 h-10 px-3 rounded-lg text-sm"
                                            style={{ border: "1px solid #D8D2C4", backgroundColor: "#F5F0E8", color: "#2E2A26" }}
                                        />
                                        <button onClick={copyJoinUrl} className="flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold cursor-pointer" style={{ backgroundColor: GREEN, color: "#FBF7EF" }}>
                                            <Copy className="h-4 w-4" /> Copy
                                        </button>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: "#9b948e" }}>
                                        Attendees join the event through this link. Each attendee also receives their own registration link by email.
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs" style={{ color: "#9b948e" }}>No meeting link set.</p>
                            )}
                        </>
                    ) : (
                        // IN-PERSON: public registration link.
                        <>
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
                                    ? "Link is live. Opens at 00:00 of the start day, closes 1h after the event ends."
                                    : event.is_not_open_yet
                                        ? "Scheduled. The link opens at 00:00 of the start day."
                                        : "This link is not currently valid (event inactive or ended)."}
                            </p>
                        </>
                    )}
                </div>

                <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: "#2E2A26" }}>QR code</p>
                    {isVirtual ? (
                        <div className="text-center py-6" style={{ color: "#9b948e" }}>
                            <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs">Not available for virtual events. Attendees register through the personal link sent to their email.</p>
                        </div>
                    ) : linkShareable ? (
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
                            <p className="text-xs">QR available only while the event is active.</p>
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
                    <div className="ml-auto flex items-center gap-2">
                        {isVirtual && canSendInvites && (
                            <button
                                onClick={() => setAddOpen(true)}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                                style={{ backgroundColor: GREEN, color: "#FBF7EF" }}
                            >
                                <UserPlus className="h-3.5 w-3.5" /> Add attendees
                            </button>
                        )}
                        <button
                            onClick={handleResendAll}
                            disabled={!canResendAll}
                            title={canResendAll ? "Resend to all pending attendees" : (canSendInvites ? "No pending attendees to resend to" : "Event is not active")}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold"
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
                                                // email, while the event is active and not ended.
                                                const canResend = canSendInvites && a.email && a.status === "pending";
                                                const resendReason = !canSendInvites ? "Event is not active"
                                                    : !a.email ? "No email on file"
                                                    : a.status === "confirmed" ? "Already confirmed"
                                                    : a.status === "not_attended" ? "Event ended"
                                                    : "";
                                                const open = menuFor === a.id;
                                                return (
                                                    <div className="relative inline-block">
                                                        <button
                                                            onClick={() => setMenuFor(open ? null : a.id)}
                                                            title="Actions"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md cursor-pointer"
                                                            style={{ color: "#6b6560", backgroundColor: open ? "rgba(94,106,67,0.1)" : "transparent" }}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                        {open && (
                                                            <>
                                                                {/* click-away layer */}
                                                                <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                                                                <div
                                                                    className="absolute right-0 z-50 mt-1 w-44 rounded-lg py-1 text-left"
                                                                    style={{ backgroundColor: "#FFFFFF", border: "1px solid #D8D2C4", boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}
                                                                >
                                                                    <button
                                                                        onClick={() => { if (canResend) { setMenuFor(null); handleResendOne(a); } }}
                                                                        disabled={!canResend}
                                                                        title={resendReason}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                                                                        style={{ color: canResend ? "#2E2A26" : "#c9c3b6", cursor: canResend ? "pointer" : "not-allowed" }}
                                                                        onMouseEnter={(e) => { if (canResend) e.currentTarget.style.backgroundColor = "#F5F0E8"; }}
                                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                                    >
                                                                        <Send className="h-4 w-4" /> Resend invitation
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setMenuFor(null); setEditAttendee(a); }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                                                                        style={{ color: "#2E2A26" }}
                                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F0E8")}
                                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                                    >
                                                                        <Pencil className="h-4 w-4" /> Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteAttendee(a)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                                                                        style={{ color: "#B0592E" }}
                                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FBEEE9")}
                                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" /> Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
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

            {addOpen && (
                <AddAttendeesModal
                    eventId={id}
                    onClose={() => setAddOpen(false)}
                    onDone={handleAttendeesAdded}
                />
            )}

            {editAttendee && (
                <EditAttendeeModal
                    attendee={editAttendee}
                    onClose={() => setEditAttendee(null)}
                    onSave={handleSaveAttendee}
                />
            )}
        </div>
    );
};


// ── Reactivate modal — reuses the create wizard's new date logic ───────────
const pad = (n) => String(n).padStart(2, "0");
const todayDate = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dateOf = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeOf = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// 24-hour options (we use selects, not <input type="time">, so the UI is always 24h).
const HOURS_24 = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES_60 = Array.from({ length: 60 }, (_, m) => pad(m));

// Builds ISO start/end from date(s) + hours. End date falls back to start date
// when the multi-day toggle is off.
const computeStartEnd = (f) => {
    const startDate = f.start_date;
    const endDate = f.has_end_date && f.end_date ? f.end_date : f.start_date;
    if (!startDate || !f.start_time || !f.end_time) return { start_at: null, end_at: null };
    const start = new Date(`${startDate}T${f.start_time}`);
    const end = new Date(`${endDate}T${f.end_time}`);
    if (isNaN(start) || isNaN(end)) return { start_at: null, end_at: null };
    return { start_at: start, end_at: end };
};

const ReactivateModal = ({ event, onClose, onSubmit }) => {
    const GREEN = "#5E6A43";
    const isVirtual = event.modality === "virtual";

    // Seed from the event's original schedule (defaults to today / 06:00-20:00).
    const [form, setForm] = useState(() => {
        const sDate = dateOf(event.start_at) || todayDate();
        const eDate = dateOf(event.end_at) || sDate;
        return {
            start_date: sDate,
            has_end_date: !!eDate && eDate !== sDate,
            end_date: eDate,
            start_time: timeOf(event.start_at) || "06:00",
            end_time: timeOf(event.end_at) || "20:00",
            customize_hours: false,
            location: event.location || "",
            virtual_url: event.virtual_url || "",
        };
    });
    const [submitting, setSubmitting] = useState(false);

    const setStartDate = (v) => setForm((f) => ({
        ...f,
        start_date: v,
        start_time: f.start_time || "06:00",
        end_time: f.end_time || "20:00",
    }));
    const toggleEndDate = () => setForm((f) => ({
        ...f,
        has_end_date: !f.has_end_date,
        end_date: !f.has_end_date ? (f.end_date || f.start_date) : "",
    }));
    const toggleCustomize = () => setForm((f) => ({ ...f, customize_hours: !f.customize_hours }));

    const inputCls = "w-full h-10 px-3 rounded-lg text-sm";
    const inputStyle = { border: "1px solid #D8D2C4", backgroundColor: "#FFFFFF", color: "#2E2A26" };
    const disabledStyle = { backgroundColor: "#F0ECE3", color: "#9b948e", cursor: "not-allowed" };
    const labelStyle = { color: "#2E2A26", fontSize: 13, fontWeight: 600 };

    const { start_at, end_at } = computeStartEnd(form);
    const valid = (() => {
        if (!form.start_date || !form.start_time || !form.end_time) return false;
        if (!start_at || !end_at) return false;
        if (end_at <= start_at) return false;
        if (isVirtual && !form.virtual_url.trim()) return false;
        if (!isVirtual && !form.location.trim()) return false;
        return true;
    })();

    const submit = async () => {
        if (!valid) return;
        setSubmitting(true);
        await onSubmit({
            start_at: start_at.toISOString(),
            end_at: end_at.toISOString(),
            location: isVirtual ? "" : form.location.trim(),
            virtual_url: isVirtual ? form.virtual_url.trim() : "",
        });
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-auto" style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                <h2 className="text-lg font-semibold" style={{ color: "#2E2A26" }}>Reactivate event</h2>
                <p className="text-xs" style={{ color: "#9b948e" }}>New registrations add to the existing ones. A new link and QR are generated.</p>

                {/* Dates: start date + optional end date. */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label style={labelStyle}>Start date *</label>
                            <button type="button" onClick={toggleEndDate} disabled={!form.start_date} className="text-xs font-semibold cursor-pointer" style={{ color: !form.start_date ? "#c9c3b6" : GREEN }}>
                                {form.has_end_date ? "Remove end date" : "Add end date"}
                            </button>
                        </div>
                        <input type="date" className={inputCls} style={inputStyle} min={todayDate()} value={form.start_date} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    {form.has_end_date && (
                        <div>
                            <label style={labelStyle}>End date</label>
                            <input type="date" className={inputCls} style={inputStyle} min={form.start_date || todayDate()} value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
                        </div>
                    )}
                </div>

                {/* Hours (24h): locked at 06:00/20:00 until Customize. */}
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <label style={labelStyle}>Hours (24h)</label>
                        <button type="button" onClick={toggleCustomize} disabled={!form.start_date} className="text-xs font-semibold cursor-pointer" style={{ color: !form.start_date ? "#c9c3b6" : GREEN }}>
                            {form.customize_hours ? "Use default hours" : "Customize hours"}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: "start_time", label: "Start hour" },
                            { key: "end_time", label: "End hour" },
                        ].map(({ key, label }) => {
                            const [hh = "", mm = ""] = (form[key] || "").split(":");
                            const locked = !form.start_date || !form.customize_hours;
                            const selStyle = { ...inputStyle, ...(locked ? disabledStyle : {}) };
                            return (
                                <div key={key}>
                                    <label className="text-xs" style={{ color: "#6b6560" }}>{label}</label>
                                    <div className="flex items-center gap-1.5">
                                        <select className="h-10 px-2 rounded-lg text-sm flex-1" style={selStyle} disabled={locked} value={hh} onChange={(e) => setForm((f) => ({ ...f, [key]: `${e.target.value}:${mm || "00"}` }))} aria-label={`${label} (hour)`}>
                                            {HOURS_24.map((h) => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                        <span className="text-sm" style={{ color: "#6b6560" }}>:</span>
                                        <select className="h-10 px-2 rounded-lg text-sm flex-1" style={selStyle} disabled={locked} value={mm} onChange={(e) => setForm((f) => ({ ...f, [key]: `${hh || "00"}:${e.target.value}` }))} aria-label={`${label} (minute)`}>
                                            {MINUTES_60.map((m) => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {form.customize_hours && start_at && end_at && end_at <= start_at && (
                        <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>End must be after start.</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "#9b948e" }}>Opens at 00:00 of the start day, closes 1h after the event ends.</p>
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