import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, FileText, Sparkles, Clock, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { listContractsForLead, resendSignerLink, fillContractFields, createContract } from "../services/contractService";
import { getContractTemplatesForPipeline } from "../services/contractTemplateService";
import { ContractInlineFields } from "./ContractInlineFields";

const statusVariant = {
    signed: "success",
    pending: "secondary",
    expired: "destructive",
};

/**
 * Tracking panel. The contract is usually created automatically when the Lead
 * enters the Contract stage (see app/signals.py) — but that's a one-shot
 * signal fired exactly at that transition; if the pipeline's template wasn't
 * approved yet (or had more than one approved candidate) at that moment, it
 * aborts and never retries, even after the pipeline ends up with exactly one
 * approved template. So this panel always offers a manual create path when
 * there's no contract yet and at least one approved template exists — a
 * one-click button with the single candidate, or a picker when there's more
 * than one (no safe way to guess which one this deal needs — see
 * ContractSerializer.create()'s template_id).
 * What staff can still do afterward is complete, from this panel, whatever the contract
 * is still waiting on before it goes out: any {{manual}} fields the template
 * couldn't resolve from the Lead (detected in an uploaded PDF, or referenced
 * by an AI template), and/or who actually fills each required signer role for
 * THIS deal (name/email — the template only names the role, a real person is
 * different on every deal). That's the only editable step, gating the signers
 * being materialized/notified (or the document being finalized, if no
 * signature is required). Once that's done (or if there was nothing pending),
 * this shows the contract's status, the signers' progress, the resolved
 * document, and the final PDF. If the pipeline has no approved template (so
 * no contract could be created), it points the user to create one.
 */
export const LeadContractPanel = ({ leadId, pipelineId }) => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [contract, setContract] = useState(null);
    // Approved templates for this Lead's pipeline, only loaded/needed while
    // there's no contract yet. 0 → nothing to create from; 1 → one-click
    // manual create in case the auto-create signal already missed its
    // window; >1 → there's no safe way to guess which one this deal needs,
    // so staff picks explicitly below (see ContractSerializer.create()'s
    // template_id).
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [creatingContract, setCreatingContract] = useState(false);
    const [error, setError] = useState("");
    const [resendingId, setResendingId] = useState(null);
    const [fieldValues, setFieldValues] = useState({});
    const [signerValues, setSignerValues] = useState({});
    const [submittingFields, setSubmittingFields] = useState(false);

    const loadContract = async () => {
        setLoading(true);
        setError("");
        try {
            const list = await listContractsForLead(leadId);
            const results = Array.isArray(list) ? list : (list.results || []);
            setContract(results[0] || null);
        } catch (e) {
            setError(e.message || "Error loading contract");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (leadId) loadContract();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]);

    // Pre-fill the fill-in fields with any computed defaults the backend
    // provides (e.g. services_total is seeded with the Lead's calculated
    // services subtotal). Staff sees the value ready and can still edit it
    // before sending. Only seeds fields that have a default and aren't set yet.
    useEffect(() => {
        const pending = contract?.pending_variables || [];
        const defaults = {};
        for (const v of pending) {
            if (v.default != null && String(v.default) !== "") {
                defaults[v.name] = String(v.default);
            }
        }
        if (Object.keys(defaults).length) {
            setFieldValues((prev) => ({ ...defaults, ...prev }));
        }
    }, [contract]);

    // When there's no contract yet, load the pipeline's approved templates —
    // explains why (none) or lets staff choose (more than one).
    useEffect(() => {
        if (contract || !pipelineId) return;
        let cancelled = false;
        getContractTemplatesForPipeline(pipelineId, { latestOnly: true })
            .then((data) => {
                const list = Array.isArray(data) ? data : (data.results || []);
                if (!cancelled) setTemplates(list.filter((t) => t.is_active));
            })
            .catch(() => { if (!cancelled) setTemplates([]); });
        return () => { cancelled = true; };
    }, [contract, pipelineId]);

    const handleCreateContract = async (templateId = selectedTemplateId) => {
        if (!templateId) return;
        setCreatingContract(true);
        setError("");
        try {
            await createContract(leadId, { template_id: templateId });
            setSelectedTemplateId("");
            await loadContract();
        } catch (e) {
            setError(e.message || "Error creating contract");
        } finally {
            setCreatingContract(false);
        }
    };

    const handleFieldChange = (name, value) => setFieldValues((v) => ({ ...v, [name]: value }));
    const handleSignerFieldChange = (role, field, value) =>
        setSignerValues((v) => ({ ...v, [role]: { ...v[role], [field]: value } }));

    const handleSubmitFields = async () => {
        setSubmittingFields(true);
        setError("");
        try {
            const signers = (contract.pending_signer_roles || []).map((role) => ({
                role_label: role,
                signer_name: signerValues[role]?.signer_name || "",
                signer_email: signerValues[role]?.signer_email || "",
            }));
            await fillContractFields(leadId, contract.id, fieldValues, signers);
            setFieldValues({});
            setSignerValues({});
            await loadContract();
        } catch (e) {
            setError(e.message || "Error saving contract fields");
        } finally {
            setSubmittingFields(false);
        }
    };

    const handleResend = async (signerId) => {
        setResendingId(signerId);
        setError("");
        try {
            await resendSignerLink(leadId, contract.id, signerId);
            await loadContract();
        } catch (e) {
            setError(e.message || "Error resending link");
        } finally {
            setResendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-card p-6 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground italic">Loading contract…</p>
            </div>
        );
    }

    const pendingCount = contract?.pending_variables?.length || 0;
    const pendingRoles = contract?.pending_signer_roles || [];
    // Signers only get materialized once pending fields/roles are filled (see
    // ContractViewSet.fill_fields) — no signers yet + something pending means
    // it's staff's turn to complete it before anything gets sent out.
    const awaitingStaffFill = (pendingCount > 0 || pendingRoles.length > 0) && (contract?.signers || []).length === 0;

    return (
        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-medium text-lg">Contract</h3>
                <Button type="button" variant="ghost" size="sm" onClick={loadContract}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">{error}</div>
            )}

            {!contract ? (
                templates.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-md text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                            This pipeline has no approved contract template yet, so no contract could be created.
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => pipelineId && navigate(`/pipeline/${pipelineId}/contracts`)}
                            disabled={!pipelineId}
                        >
                            <Sparkles className="h-4 w-4 mr-1.5" /> Create the template
                        </Button>
                    </div>
                ) : templates.length === 1 ? (
                    <div className="p-4 border border-dashed rounded-md text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                            The contract is usually created automatically when this lead enters the Contract
                            stage. If you just moved it here, hit Refresh.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Still nothing? The automatic step may have run before this template was approved —
                            create it manually instead.
                        </p>
                        <Button
                            type="button" size="sm"
                            onClick={() => handleCreateContract(templates[0].id)}
                            disabled={creatingContract}
                        >
                            {creatingContract ? "Creating…" : "Create Contract"}
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 border border-dashed rounded-md space-y-3">
                        <p className="text-sm text-muted-foreground text-center">
                            This pipeline has more than one approved template — pick which one this deal uses.
                        </p>
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button" size="sm" className="w-full"
                            onClick={() => handleCreateContract()}
                            disabled={!selectedTemplateId || creatingContract}
                        >
                            {creatingContract ? "Creating…" : "Create Contract"}
                        </Button>
                    </div>
                )
            ) : (
                <div className="space-y-4">
                    {awaitingStaffFill ? (
                        <div className="p-3 bg-muted/20 border rounded-md space-y-3">
                            <div className="flex items-center gap-2">
                                {contract.source === "uploaded"
                                    ? <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    : <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                <span className="text-sm font-medium">Complete the contract before sending</span>
                            </div>

                            {pendingCount > 0 && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    {pendingCount} field{pendingCount > 1 ? "s" : ""} couldn't be filled from this Lead's data.{" "}
                                    Fill {pendingCount > 1 ? "them" : "it"} in below before sending — the signer only signs, they don't fill in any fields.
                                </p>
                            )}
                            {pendingCount > 0 && (
                                <div className="max-h-72 overflow-auto">
                                    <ContractInlineFields
                                        sections={contract.resolved_content || []}
                                        values={fieldValues}
                                        labels={Object.fromEntries((contract.pending_variables || []).map((v) => [v.name, v.label]))}
                                        onChange={handleFieldChange}
                                    />
                                </div>
                            )}

                            {pendingRoles.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs">
                                        Who signs as each role? (name + email — different for every deal)
                                    </Label>
                                    {pendingRoles.map((role) => (
                                        // Fixed-width role column (not `auto`) so the Name/Email
                                        // fields line up across every signer regardless of how
                                        // long each role label is. Rows align at the top so the
                                        // role badge sits level with the field labels.
                                        <div key={role} className="grid grid-cols-1 md:grid-cols-[8rem_1fr_1fr] gap-2 items-start">
                                            <Badge variant="outline" className="justify-self-start md:mt-6 truncate max-w-full">{role}</Badge>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Name</Label>
                                                <Input
                                                    value={signerValues[role]?.signer_name || ""}
                                                    onChange={(e) => handleSignerFieldChange(role, "signer_name", e.target.value)}
                                                    placeholder="Full name"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Email</Label>
                                                <Input
                                                    type="email"
                                                    value={signerValues[role]?.signer_email || ""}
                                                    onChange={(e) => handleSignerFieldChange(role, "signer_email", e.target.value)}
                                                    placeholder="name@company.com"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button type="button" size="sm" onClick={handleSubmitFields} disabled={submittingFields}>
                                <Send className="h-4 w-4 mr-1.5" />
                                {submittingFields ? "Saving…" : contract.requires_signature ? "Send for Signature" : "Complete Document"}
                            </Button>
                        </div>
                    ) : (
                        <div className="p-3 bg-muted/20 border rounded-md space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {contract.source === "uploaded"
                                        ? <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        : <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                    <span className="text-sm font-medium">Contract document</span>
                                </div>
                                {contract.generated_pdf_url ? (
                                    <a href={contract.generated_pdf_url} target="_blank" rel="noreferrer" className="text-xs font-medium underline shrink-0">
                                        Download PDF
                                    </a>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic shrink-0">
                                        PDF available once the contract is completed
                                    </span>
                                )}
                            </div>

                            {pendingCount > 0 && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {pendingCount} field{pendingCount > 1 ? "s" : ""} will be completed by the signer(s) when they sign.
                                </p>
                            )}

                            <div className="max-h-72 overflow-auto">
                                <ContractInlineFields sections={contract.resolved_content || []} readOnly />
                            </div>
                        </div>
                    )}

                    {contract.requires_signature && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Signers</Label>
                            {(contract.signers || []).map((signer) => (
                                <div key={signer.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {signer.signer_name} <span className="text-muted-foreground">· {signer.role_label}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{signer.signer_email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant={statusVariant[signer.status] || "secondary"} className="capitalize">
                                            {signer.status}
                                        </Badge>
                                        {signer.status !== "signed" && (
                                            <Button size="sm" variant="ghost" onClick={() => handleResend(signer.id)} disabled={resendingId === signer.id}>
                                                <RefreshCw className="h-4 w-4 mr-1" />
                                                {resendingId === signer.id ? "Resending…" : "Resend"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
