import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Eye, CalendarDays, MapPin, Video } from "lucide-react";
import { getEvents, deleteEvent } from "@/services/eventService";
import Swal from "sweetalert2";

const toast = (icon, title) =>
    Swal.fire({ icon, title, toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });

// Derives the badge label/color from the event's live state. A future event
// (active but its link hasn't opened yet) shows "Scheduled" — not "Expired".
const eventStatus = (event) => {
    if (event.status !== "active") return { label: "Inactive", color: "#B0592E" };
    if (event.is_link_valid) return { label: "Active", color: "#3CC647" };
    if (event.is_not_open_yet) return { label: "Scheduled", color: "#5E6A43" };
    return { label: "Expired", color: "#B0592E" };
};

const StatusBadge = ({ event }) => {
    const { label, color } = eventStatus(event);
    return (
        <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}1a`, color, border: `1px solid ${color}55` }}
        >
            {label}
        </span>
    );
};

export const Events = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

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
            confirmButtonColor: "#5E6A43",
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
            <div className="p-8 text-center" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
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
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                    >
                        <CalendarDays className="h-5 w-5" style={{ color: "#5E6A43" }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold" style={{ color: "#2E2A26" }}>Events</p>
                        <p className="text-sm" style={{ color: "#9b948e" }}>
                            Capture attendees through a public registration form linked to a pipeline.
                        </p>
                    </div>
                </div>

                <Link to="/event/new">
                    <button
                        className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4a5535")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#5E6A43")}
                    >
                        <Plus className="h-4 w-4" />
                        New Event
                    </button>
                </Link>
            </div>

            <div className="overflow-hidden" style={{ borderRadius: "10px", border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}>
                <div className="px-5 py-3" style={{ borderBottom: "1px solid #D8D2C4", backgroundColor: "#F2EBDD" }}>
                    <span className="text-sm font-semibold" style={{ color: "#2E2A26" }}>All Events</span>
                    <span
                        className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", color: "#5E6A43", border: "1px solid rgba(94,106,67,0.3)" }}
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
                                <tr style={{ backgroundColor: "#5E6A43" }}>
                                    {["Name", "Modality", "Pipeline", "Attendees", "Registered", "Status", "Actions"].map((h, i) => (
                                        <th
                                            key={h}
                                            className="px-4 py-2.5 text-xs font-semibold"
                                            style={{ color: "#FBF7EF", letterSpacing: "0.06em", textAlign: i === 6 ? "right" : "left" }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ color: "#2E2A26" }}>
                                {events.map((ev) => (
                                    <tr
                                        key={ev.id}
                                        style={{ borderBottom: "1px solid #D8D2C4" }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F2EBDD")}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                                    >
                                        <td className="px-4 py-2.5"><span className="font-medium">{ev.name}</span></td>
                                        <td className="px-4 py-2.5" style={{ color: "#6b6560" }}>
                                            <span className="inline-flex items-center gap-1">
                                                {ev.modality === "virtual" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                                                {ev.modality === "virtual" ? "Virtual" : "In Person"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5" style={{ color: "#6b6560" }}>{ev.pipeline_name || "—"}</td>
                                        <td className="px-4 py-2.5" style={{ color: "#6b6560" }}>{ev.attendee_count}</td>
                                        <td className="px-4 py-2.5" style={{ color: "#6b6560" }}>{ev.registered_count}</td>
                                        <td className="px-4 py-2.5"><StatusBadge event={ev} /></td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link to={`/event/${ev.id}`}>
                                                    <button
                                                        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer"
                                                        style={{ color: "#5E6A43" }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.1)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                        title="View"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer"
                                                    style={{ color: "#c0392b" }}
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
        </div>
    );
};
