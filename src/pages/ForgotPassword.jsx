import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/services/userService";

export const ForgotPassword = () => {
    const [identifier, setIdentifier] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await requestPasswordReset(identifier.trim());
            if (res.ok) {
                setSent(true);
            } else if (res.status === 429) {
                setError("Too many attempts. Please try again later.");
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.detail || "Something went wrong. Please try again.");
            }
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <img src="/climate.svg" alt="Climate by CodeX" className="mx-auto h-14 w-auto" />
                    <p className="text-muted-foreground text-sm mt-1">Reset your password</p>
                </div>

                {sent ? (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            If an account matches <strong className="text-foreground">{identifier.trim()}</strong>, we've
                            emailed a link to reset the password. It expires in 15 minutes.
                        </p>
                        <Button asChild className="w-full">
                            <Link to="/login">Back to login</Link>
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="identifier">Username or email</Label>
                            <Input
                                id="identifier"
                                type="text"
                                autoComplete="username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                disabled={loading}
                                required
                                autoFocus
                            />
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button type="submit" className="w-full" disabled={loading || !identifier.trim()}>
                            {loading ? "Sending..." : "Send reset link"}
                        </Button>
                        <Link to="/login" className="block text-center text-sm text-muted-foreground hover:underline">
                            Back to login
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
};
