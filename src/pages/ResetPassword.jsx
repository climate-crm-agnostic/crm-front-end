import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset } from "@/services/userService";

export const ResetPassword = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        const res = await confirmPasswordReset({ uid, token, password });
        const data = await res.json().catch(() => ({}));
        setLoading(false);

        if (res.ok) {
            setSuccess(true);
        } else {
            setError(data.detail || "This link is invalid or has expired.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <p className="text-2xl font-bold tracking-tight">
                        Climate by Code<span style={{ color: "#38bdf8" }}>X</span>
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">Set your new password</p>
                </div>

                {success ? (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            Your password has been updated. You can now log in.
                        </p>
                        <Button className="w-full" onClick={() => navigate("/login")}>
                            Go to Login
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="password">New password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="confirm">Confirm password</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Saving..." : "Set new password"}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
};
