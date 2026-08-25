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
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#FBF7EF" }}>
            <div
                className="w-full max-w-md text-center p-8 rounded-lg"
                style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}
            >
                {status === "loading" && (
                    <>
                        <MailX className="h-10 w-10 mx-auto mb-4" style={{ color: "#5E6A43" }} />
                        <p style={{ color: "#2E2A26" }}>Processing your request...</p>
                    </>
                )}
                {status === "done" && (
                    <>
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-4" style={{ color: "#5E6A43" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "#2E2A26" }}>You've been unsubscribed</h1>
                        <p className="text-sm" style={{ color: "#6b6560" }}>
                            You won't receive any more marketing emails from us. This doesn't affect other account or transactional notifications.
                        </p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <XCircle className="h-10 w-10 mx-auto mb-4" style={{ color: "#c0392b" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "#2E2A26" }}>Something went wrong</h1>
                        <p className="text-sm" style={{ color: "#6b6560" }}>{error}</p>
                    </>
                )}
            </div>
        </div>
    );
};
