import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import { getUser, getUserRoles, createUser, updateUser, resetUserPassword } from "@/services/userService";

// Select value for the Administrator role (Django superuser); any other value is a group name
const ADMINISTRATOR = "__administrator__";

export const UserDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === "new";

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        role: "",
        password: "",
        is_active: true,
    });
    const [roles, setRoles] = useState({ groups: [], can_assign_administrator: false });

    useEffect(() => {
        getUserRoles()
            .then(setRoles)
            .catch(() => Swal.fire("Error", "Could not load roles.", "error"));
    }, []);

    useEffect(() => {
        if (!isNew) {
            getUser(id)
                .then((data) => {
                    setForm({
                        first_name: data.first_name || "",
                        last_name: data.last_name || "",
                        username: data.username || "",
                        email: data.email || "",
                        role: data.is_superuser ? ADMINISTRATOR : (data.group || ""),
                        password: "",
                        is_active: data.is_active,
                    });
                })
                .catch(() => Swal.fire("Error", "Could not load user.", "error"))
                .finally(() => setLoading(false));
        }
    }, [id, isNew]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const { role, ...rest } = form;
        const payload = { ...rest, group: role === ADMINISTRATOR ? "" : role };
        // Only an administrator may grant or remove the Administrator role
        if (roles.can_assign_administrator) payload.is_superuser = role === ADMINISTRATOR;
        if (!isNew && !payload.password) delete payload.password;

        const res = isNew
            ? await createUser(payload)
            : await updateUser(id, payload);

        setSaving(false);

        if (res.ok) {
            Swal.fire({
                icon: "success",
                title: isNew ? "User created" : "User updated",
                text: isNew ? "Welcome email sent to the user." : "Changes saved.",
                timer: 2000,
                showConfirmButton: false,
            });
            navigate("/users");
        } else {
            const err = await res.json().catch(() => ({}));
            const msg = typeof err === "object"
                ? Object.entries(err).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n")
                : "Something went wrong.";
            Swal.fire("Error", msg, "error");
        }
    };

    const handleResetPassword = async () => {
        const result = await Swal.fire({
            title: "Send password reset?",
            text: `A reset link will be sent to ${form.email}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Send",
        });
        if (!result.isConfirmed) return;

        const res = await resetUserPassword(id);
        const data = await res.json().catch(() => ({}));
        Swal.fire(res.ok ? "Sent!" : "Error", data.detail || "—", res.ok ? "success" : "error");
    };

    if (loading) return <div className="p-10 flex justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/users")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold truncate">
                                {isNew ? "New User" : form.username}
                            </h1>
                            {!isNew && (
                                <Badge variant={form.is_active ? "default" : "destructive"}>
                                    {form.is_active ? "Active" : "Inactive"}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                            {isNew ? "A welcome email with sign-in details is sent to the new user" : "Edit this user's details and role"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => navigate("/users")}>Cancel</Button>
                    <Button type="submit" form="user-form" disabled={saving}>
                        {saving ? "Saving..." : isNew ? "Create User" : "Save Changes"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
                <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Profile</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First name</Label>
                                <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last name</Label>
                                <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                                <Input id="username" name="username" value={form.username} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required={isNew} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Access</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <select
                                    id="role"
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="">— No role —</option>
                                    {(roles.can_assign_administrator || form.role === ADMINISTRATOR) && (
                                        <option value={ADMINISTRATOR} disabled={!roles.can_assign_administrator}>Administrator</option>
                                    )}
                                    {roles.groups.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            {isNew && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                                    <Input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} required />
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {!isNew && form.email && (
                    <div className="mt-6 bg-card p-6 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="font-medium text-lg">Password</h3>
                            <p className="text-sm text-muted-foreground">Email {form.email} a link to set a new password. It expires in 15 minutes.</p>
                        </div>
                        <Button type="button" variant="outline" onClick={handleResetPassword}>
                            Send reset link
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
