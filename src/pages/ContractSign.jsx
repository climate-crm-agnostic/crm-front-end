import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FileSignature, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getPublicContract, submitSignature } from "../services/contractService";
import { SignaturePad } from "../components/SignaturePad";
import { ContractInlineFields } from "../components/ContractInlineFields";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";

// loading | pending | expired | signed | error
export const ContractSign = () => {
    const { token } = useParams();
    const [state, setState] = useState("loading");
    const [contract, setContract] = useState(null);
    const [error, setError] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const padRef = useRef(null);

    const load = () => {
        setState("loading");
        getPublicContract(token)
            .then((data) => {
                setContract(data);
                setState(data.status === "signed" ? "signed" : data.status === "expired" ? "expired" : "pending");
            })
            .catch((err) => {
                setError(err.message);
                setState("error");
            });
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleSubmit = async () => {
        setError("");
        if (!accepted) {
            setError("Please confirm you have read and accept the document.");
            return;
        }
        const dataUrl = padRef.current?.getDataURL();
        if (!dataUrl) {
            setError("Please provide your signature.");
            return;
        }

        // The signer no longer fills in any fields — staff completes every
        // {{field}} in the CRM before sending, so the signer just signs.
        setSubmitting(true);
        try {
            await submitSignature(token, { accepted: true, signatureImage: dataUrl });
            setState("signed");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#FBF7EF" }}>
            <div
                className="w-full max-w-xl p-8 rounded-lg"
                style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}
            >
                {state === "loading" && (
                    <div className="text-center">
                        <FileSignature className="h-10 w-10 mx-auto mb-4" style={{ color: "#5E6A43" }} />
                        <p style={{ color: "#2E2A26" }}>Loading document…</p>
                    </div>
                )}

                {state === "error" && (
                    <div className="text-center">
                        <XCircle className="h-10 w-10 mx-auto mb-4" style={{ color: "#c0392b" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "#2E2A26" }}>Something went wrong</h1>
                        <p className="text-sm" style={{ color: "#6b6560" }}>{error}</p>
                    </div>
                )}

                {state === "expired" && (
                    <div className="text-center">
                        <Clock className="h-10 w-10 mx-auto mb-4" style={{ color: "#c0392b" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "#2E2A26" }}>This link has expired</h1>
                        <p className="text-sm" style={{ color: "#6b6560" }}>
                            Ask the sender to resend your signing link from the CRM.
                        </p>
                    </div>
                )}

                {state === "signed" && (
                    <div className="text-center">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-4" style={{ color: "#5E6A43" }} />
                        <h1 className="text-lg font-semibold mb-2" style={{ color: "#2E2A26" }}>Signed successfully</h1>
                        <p className="text-sm" style={{ color: "#6b6560" }}>
                            Thank you, {contract?.signer_name}. Your signature has been recorded.
                        </p>
                    </div>
                )}

                {state === "pending" && contract && (
                    <div>
                        <div className="text-center mb-6">
                            <FileSignature className="h-10 w-10 mx-auto mb-3" style={{ color: "#5E6A43" }} />
                            <h1 className="text-lg font-semibold" style={{ color: "#2E2A26" }}>{contract.lead_name}</h1>
                            <p className="text-sm" style={{ color: "#6b6560" }}>
                                Signing as {contract.signer_name} ({contract.role_label})
                            </p>
                        </div>

                        {/* The document is already final — staff filled every field in
                            the CRM before sending. The signer just reviews and signs. */}
                        <div
                            className="mb-6 p-4 rounded-md max-h-72 overflow-y-auto text-sm"
                            style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4", color: "#2E2A26" }}
                        >
                            <ContractInlineFields sections={contract.resolved_content || []} readOnly />
                        </div>

                        {error && (
                            <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                                {error}
                            </div>
                        )}

                        <label className="flex items-start gap-2 mb-5 text-sm" style={{ color: "#2E2A26" }}>
                            <Checkbox checked={accepted} onCheckedChange={setAccepted} className="mt-0.5" />
                            I have read and accept this document.
                        </label>

                        <SignaturePad ref={padRef} className="mb-5" />

                        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? "Submitting…" : "Sign Document"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
