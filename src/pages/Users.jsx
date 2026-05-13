import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/Table";
import Swal from "sweetalert2";
import { getUsers, deactivateUser, activateUser, resetUserPassword, deleteUser } from "@/services/userService";

export const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch {
            Swal.fire("Error", "Could not load users.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleToggleActive = async (user) => {
        const action = user.is_active ? "deactivate" : "activate";
        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} user?`,
            text: `${user.full_name || user.username} will be ${action}d.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: `Yes, ${action}`,
        });
        if (!result.isConfirmed) return;

        const res = user.is_active
            ? await deactivateUser(user.id)
            : await activateUser(user.id);

        if (res.ok || res.status === 204) {
            await fetchUsers();
        } else {
            const err = await res.json().catch(() => ({}));
            Swal.fire("Error", err.detail || "Operation failed.", "error");
        }
    };

    const handleDelete = async (user) => {
        const result = await Swal.fire({
            title: "Delete user permanently?",
            text: `This will permanently delete "${user.username}". This action cannot be undone.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete",
            confirmButtonColor: "#DC2626",
        });
        if (!result.isConfirmed) return;

        const res = await deleteUser(user.id);
        if (res.ok || res.status === 204) {
            await fetchUsers();
        } else {
            const err = await res.json().catch(() => ({}));
            Swal.fire("Error", err.detail || "Could not delete user.", "error");
        }
    };

    const handleResetPassword = async (user) => {
        const result = await Swal.fire({
            title: "Send password reset?",
            text: `A reset link will be sent to ${user.email}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Send",
        });
        if (!result.isConfirmed) return;

        const res = await resetUserPassword(user.id);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            Swal.fire("Sent!", data.detail || "Reset email sent.", "success");
        } else {
            Swal.fire("Error", data.detail || "Could not send email.", "error");
        }
    };

    const columns = [
        { key: "full_name", label: "Name" },
        { key: "username", label: "Username" },
        { key: "email", label: "Email" },
        { key: "group", label: "Role" },
        { key: "is_active", label: "Status" },
        { key: "date_joined", label: "Joined" },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your team members and their roles.</p>
                </div>
                <Button onClick={() => navigate("/users/new")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    New User
                </Button>
            </div>

            {loading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
            ) : (
                <Table
                columns={columns}
                data={users}
                onEdit={(row) => navigate(`/users/${row.id}`)}
                onAskDelete={handleDelete}
                onResetPassword={(row) => row.email ? handleResetPassword(row) : null}
            />
            )}
        </div>
    );
};
