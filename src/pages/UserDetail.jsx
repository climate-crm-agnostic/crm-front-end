import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import { getUser, createUser, updateUser, resetUserPassword } from "@/services/userService";

const ROLES = ["Sales", "Operations", "Management", "Staff"];

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
        group: "",
        password: "",
        is_active: true,
    });

    useEffect(() => {
        if (!isNew) {
            getUser(id)
                .then((data) => {
                    setForm({
                        first_name: data.first_name || "",
                        last_name: data.last_name || "",
                        username: data.username || "",
                        email: data.email || "",
                        group: data.group || "",
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

        const payload = { ...form };
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

    if (loading) return <p className="p-6 text-muted-foreground">Loading...</p>;

    return (
        <div className="p-6 max-w-xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate("/users")}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Users
                </Button>
                <h1 className="text-2xl font-semibold" style={{ color: "var(--secondary)" }}>
                    {isNew ? "New User" : `Edit — ${form.username}`}
                </h1>
                {!isNew && (
                    <Badge variant={form.is_active ? "default" : "destructive"}>
                        {form.is_active ? "Active" : "Inactive"}
                    </Badge>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_name">First name</Label>
                        <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last_name">Last name</Label>
                        <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                    <Input id="username" name="username" value={form.username} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required={isNew} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="group">Role</Label>
                    <Select
                        value={form.group || "none"}
                        onValueChange={(v) => handleChange({ target: { name: "group", value: v === "none" ? "" : v } })}
                    >
                        <SelectTrigger id="group" className="w-full">
                            <SelectValue placeholder="— No role —" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">— No role —</SelectItem>
                            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {isNew && (
                    <div className="space-y-2">
                        <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                        <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />
                    </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-border">
                    <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : isNew ? "Create User" : "Save Changes"}
                    </Button>
                    {!isNew && form.email && (
                        <Button type="button" variant="outline" onClick={handleResetPassword}>
                            Send reset link
                        </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={() => navigate("/users")}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
};
