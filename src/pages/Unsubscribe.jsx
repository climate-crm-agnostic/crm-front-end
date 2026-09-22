import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MailX, CheckCircle2, XCircle } from "lucide-react";
import { unsubscribeByToken } from "../services/campaignService";

export const Unsubscribe = () => {
    const { token } = useParams();
    const [status, setStatus] = useState("loading"); // loading | done | error
    const [error, setError] = useState(null);

    useEffect(() => {
        unsubscribeByToken(token)
            .then(() => setStatus("done"))
            .catch(err => { setError(err.message); setStatus("error"); });
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--background)" }}>
            <div
                className="w-full max-w-md text-center p-8 rounded-lg"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
                {status === "loading" && (
                    <>
                        <MailX className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--secondary-text)" }} />
                        <p style={{ color: "var(--foreground)" }}>Processing your request...</p>
                    </>
                )}
                {status === "done" && (
                    <>
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--secondary-text)" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>You've been unsubscribed</h1>
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                            You won't receive any more marketing emails from us. This doesn't affect other account or transactional notifications.
                        </p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <XCircle className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--destructive)" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>Something went wrong</h1>
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{error}</p>
                    </>
                )}
            </div>
        </div>
    );
};
