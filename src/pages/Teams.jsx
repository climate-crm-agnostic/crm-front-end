import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Edit, Users2 } from "lucide-react";
import { getTeams, deleteTeam } from "@/services/teamService";
import Swal from 'sweetalert2';

export const Teams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            const data = await getTeams();
            setTeams(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load teams',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will remove the team and its member roster.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#5E6A43',
            cancelButtonColor: '#9b948e',
            confirmButtonText: 'Yes, delete it!'
        });

        if (!result.isConfirmed) return;

        try {
            await deleteTeam(id);
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Team has been deleted.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            loadTeams();
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to delete team',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                Loading teams...
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
                        <Users2 className="h-5 w-5" style={{ color: "#5E6A43" }} />
                    </div>
                    <div>
                        <p
                            className="text-base font-semibold"
                            style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                        >
                            Teams
                        </p>
                        <p className="text-sm" style={{ color: "#9b948e" }}>
                            Organize users into teams with a leader and a roster.
                        </p>
                    </div>
                </div>

                <Link to="/team/new">
                    <button
                        className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4a5535"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#5E6A43"}
                    >
                        <Plus className="h-4 w-4" />
                        New Team
                    </button>
                </Link>
            </div>

            <div
                className="overflow-hidden"
                style={{ borderRadius: "10px", border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}
            >
                <div
                    className="px-5 py-3"
                    style={{ borderBottom: "1px solid #D8D2C4", backgroundColor: "#F2EBDD" }}
                >
                    <span className="text-sm font-semibold" style={{ color: "#2E2A26" }}>
                        All Teams
                    </span>
                    <span
                        className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", color: "#5E6A43", border: "1px solid rgba(94,106,67,0.3)" }}
                    >
                        {teams.length}
                    </span>
                </div>

                {teams.length === 0 ? (
                    <div className="py-16 text-center" style={{ color: "#9b948e" }}>
                        <Users2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No teams yet.</p>
                        <p className="text-xs mt-1">Click "New Team" to create one.</p>
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: "#5E6A43" }}>
                                    {["Name", "Leader", "Members", "Actions"].map((h, i) => (
                                        <th
                                            key={h}
                                            className="px-4 py-2.5 text-xs font-semibold text-left"
                                            style={{
                                                color: "#FBF7EF",
                                                letterSpacing: "0.06em",
                                                fontFamily: '"Source Sans 3", Arial, sans-serif',
                                                textAlign: i === 3 ? "right" : "left",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody style={{ color: "#2E2A26" }}>
                                {teams.map((team) => (
                                    <tr
                                        key={team.id}
                                        style={{ borderBottom: "1px solid #D8D2C4" }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}
                                    >
                                        <td className="px-4 py-2.5">
                                            <span className="font-medium">{team.name}</span>
                                        </td>
                                        <td className="px-4 py-2.5" style={{ color: "#6b6560" }}>
                                            {team.leader?.name || "—"}
                                        </td>
                                        <td className="px-4 py-2.5" style={{ color: "#6b6560" }}>
                                            {team.members?.length || 0}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link to={`/team/${team.id}`}>
                                                    <button
                                                        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer"
                                                        style={{ color: "#5E6A43" }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.1)"}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer"
                                                    style={{ color: "#c0392b" }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(192,57,43,0.08)"}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                                                    onClick={() => handleDelete(team.id)}
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
