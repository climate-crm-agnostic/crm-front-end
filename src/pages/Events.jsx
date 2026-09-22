import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Eye, CalendarDays, MapPin, Video, BarChart3, ArrowLeft } from "lucide-react";
import { getEvents, deleteEvent } from "@/services/eventService";
import Swal from "sweetalert2";
import { LeadsReportView } from "@/components/events/LeadsReportView";

const toast = (icon, title) =>
    Swal.fire({ icon, title, toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });

// Derives the badge label/color from the event's live state. A future event
// (active but its link hasn't opened yet) shows "Scheduled" — not "Expired".
const eventStatus = (event) => {
    if (event.status !== "active") return { label: "Inactive", color: "#B0592E" };
    if (event.is_link_valid) return { label: "Active", color: "#3CC647" };
    if (event.is_not_open_yet) return { label: "Scheduled", color: "var(--secondary-text)" };
    return { label: "Expired", color: "#B0592E" };
};

const StatusBadge = ({ event }) => {
    const { label, color } = eventStatus(event);
    return (
        <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 33%, transparent)` }}
        >
            {label}
        </span>
    );
};

export const Events = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("events");   // "events" | "report"

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            const data = await getEvents();
            setEvents(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            toast("error", "Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will remove the event and its attendees.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "var(--secondary)",
            cancelButtonColor: "#9b948e",
            confirmButtonText: "Yes, delete it!",
        });
        if (!result.isConfirmed) return;
        try {
            await deleteEvent(id);
            toast("success", "Event deleted");
            load();
        } catch {
            toast("error", "Failed to delete event");
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center" style={{ color: "var(--muted-foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                Loading events...
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "rgba(37,91,1,0.12)", border: "1px solid rgba(37,91,1,0.3)" }}
                    >
                        <CalendarDays className="h-5 w-5" style={{ color: "var(--secondary-text)" }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Events</p>
                        <p className="text-sm" style={{ color: "#9b948e" }}>
                            Capture attendees through a public registration form linked to a pipeline.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView((v) => (v === "report" ? "events" : "report"))}
                        className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold cursor-pointer"
                        style={
                            view === "report"
                                ? { border: "1px solid var(--border)", color: "var(--muted-foreground)", backgroundColor: "var(--background)" }
                                : { border: "1px solid var(--secondary-text)", color: "var(--secondary-text)", backgroundColor: "var(--background)" }
                        }
                    >
                        {view === "report" ? <ArrowLeft className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                        {view === "report" ? "Back to events" : "Leads report"}
                    </button>
                    <Link to="/event/new">
                        <button
                            className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                            style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--secondary) 80%, black)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--secondary)")}
                        >
                            <Plus className="h-4 w-4" />
                            New Event
                        </button>
                    </Link>
                </div>
            </div>

            {view === "report" ? (
                <LeadsReportView />
            ) : (
            <div className="overflow-hidden" style={{ borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
                <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>All Events</span>
                    <span
                        className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(37,91,1,0.12)", color: "var(--secondary-text)", border: "1px solid rgba(37,91,1,0.3)" }}
                    >
                        {events.length}
                    </span>
                </div>

                {events.length === 0 ? (
                    <div className="py-16 text-center" style={{ color: "#9b948e" }}>
                        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No events yet.</p>
                        <p className="text-xs mt-1">Click "New Event" to create one.</p>
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: "var(--secondary)" }}>
                                    {["Name", "Modality", "Pipeline", "Attendees", "Registered", "Status", "Actions"].map((h, i) => (
                                        <th
                                            key={h}
                                            className="px-4 py-2.5 text-xs font-semibold"
                                            style={{ color: "var(--secondary-foreground)", letterSpacing: "0.06em", textAlign: i === 6 ? "right" : "left" }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ color: "var(--foreground)" }}>
                                {events.map((ev) => (
                                    <tr
                                        key={ev.id}
                                        style={{ borderBottom: "1px solid var(--border)" }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--card)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                                    >
                                        <td className="px-4 py-2.5"><span className="font-medium">{ev.name}</span></td>
                                        <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>
                                            <span className="inline-flex items-center gap-1">
                                                {ev.modality === "virtual" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                                                {ev.modality === "virtual" ? "Virtual" : "In Person"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{ev.pipeline_name || "—"}</td>
                                        <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{ev.attendee_count}</td>
                                        <td className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>{ev.registered_count}</td>
                                        <td className="px-4 py-2.5"><StatusBadge event={ev} /></td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link to={`/event/${ev.id}`}>
                                                    <button
                                                        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer"
                                                        style={{ color: "var(--secondary-text)" }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,91,1,0.1)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                        title="View"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer"
                                                    style={{ color: "var(--destructive)" }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(192,57,43,0.08)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                    onClick={() => handleDelete(ev.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}
        </div>
    );
};
