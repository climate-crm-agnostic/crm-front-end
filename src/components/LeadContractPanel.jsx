import React, { useEffect, useRef, useState } from "react";
import { Upload, RefreshCw, Plus, X, FileText, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
    listContractsForLead,
    createContract,
    uploadContractFile,
    resendSignerLink,
} from "../services/contractService";
import { getContractTemplates } from "../services/contractTemplateService";
import { ContractDraftModal } from "./ContractDraftModal";

const statusVariant = {
    signed: "success",
    pending: "secondary",
    expired: "destructive",
};

const emptySigner = () => ({ role_label: "", signer_name: "", signer_email: "" });

/**
 * A Lead has at most one Contract. Two ways to create it: upload a PDF
 * directly, or build one from an approved ContractTemplate (see
 * ContractAIChat.jsx / ContractTemplates.jsx for how those get created and
 * approved). Shown only while the Lead is in the reserved "Contract" stage.
 */
export const LeadContractPanel = ({ leadId }) => {
    const [loading, setLoading] = useState(true);
    const [contract, setContract] = useState(null);
    const [error, setError] = useState("");

    // Draft state for the "not created yet" form
    const [enabled, setEnabled] = useState(false);
    const [sourceMode, setSourceMode] = useState("uploaded"); // 'uploaded' | 'template_ai'
    const [requiresSignature, setRequiresSignature] = useState(false);
    const [signers, setSigners] = useState([emptySigner()]);
    const [creating, setCreating] = useState(false);

    // "Create with AI" — template selection + missing-fields round trip
    const [templates, setTemplates] = useState([]);
    const [templatesLoaded, setTemplatesLoaded] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [missingFields, setMissingFields] = useState([]);
    const [fieldOverrides, setFieldOverrides] = useState({});

    // "Upload PDF" — file is required before Create Contract is enabled
    const [draftFile, setDraftFile] = useState(null);
    const draftFileInputRef = useRef(null);

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [resendingId, setResendingId] = useState(null);

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

    const refreshTemplates = async () => {
        try {
            const data = await getContractTemplates();
            const list = Array.isArray(data) ? data : (data.results || []);
            setTemplates(list.filter((t) => t.is_active));
        } catch {
            setTemplates([]);
        } finally {
            setTemplatesLoaded(true);
        }
    };

    useEffect(() => {
        if (sourceMode !== "template_ai" || templatesLoaded) return;
        refreshTemplates();
    }, [sourceMode, templatesLoaded]);

    // "Create with AI" guided modal — chat, then review/approve the draft,
    // all inline over this page (ContractDraftModal.jsx).
    const [showDraftModal, setShowDraftModal] = useState(false);
    const handleTemplateApproved = async (template) => {
        await refreshTemplates();
        if (template?.id) setSelectedTemplateId(template.id);
    };

    const addSignerRow = () => setSigners((s) => [...s, emptySigner()]);
    const removeSignerRow = (index) => setSigners((s) => s.filter((_, i) => i !== index));
    const updateSignerRow = (index, field, value) =>
        setSigners((s) => s.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

    const buildCreatePayload = () => {
        const cleanSigners = requiresSignature
            ? signers.filter((s) => s.signer_name && s.signer_email && s.role_label)
            : [];
        const payload = {
            requires_signature: requiresSignature,
            signers: cleanSigners,
            source: sourceMode,
        };
        if (sourceMode === "template_ai") {
            payload.template = selectedTemplateId;
            payload.attributes = fieldOverrides;
        }
        return { payload, cleanSigners };
    };

    const handleCreate = async () => {
        setError("");
        const { payload, cleanSigners } = buildCreatePayload();

        if (requiresSignature && cleanSigners.length === 0) {
            setError("Add at least one signer (name, email and role) or turn off 'Requires signature'.");
            return;
        }
        if (sourceMode === "template_ai" && !selectedTemplateId) {
            setError("Select a template.");
            return;
        }
        if (sourceMode === "uploaded" && !draftFile) {
            setError("Select a PDF file.");
            return;
        }

        setCreating(true);
        try {
            const created = await createContract(leadId, payload);
            setMissingFields([]);
            if (sourceMode === "uploaded" && draftFile) {
                // Two backend calls, one user action — the create endpoint is
                // JSON-only, the file goes through the separate upload-file
                // action right after using the id we just got back.
                try {
                    const res = await uploadContractFile(leadId, created.id, draftFile);
                    setContract({ ...created, uploaded_file_url: res.uploaded_file_url });
                } catch (uploadErr) {
                    // Contract exists but the file didn't make it — leave the
                    // normal post-creation "Upload PDF" button as the retry path.
                    setContract(created);
                    setError(uploadErr.message || "Contract created, but the PDF failed to upload. Try again below.");
                }
            } else {
                setContract(created);
            }
        } catch (e) {
            // The backend responds 400 {missing_fields: [...]} when a
            // template references Lead data this record doesn't have —
            // surface those as a form instead of a generic error.
            if (Array.isArray(e.missingFields) && e.missingFields.length) {
                setMissingFields(e.missingFields);
            } else {
                setError(e.message || "Error creating contract");
            }
        } finally {
            setCreating(false);
        }
    };

    const handleDraftFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== "application/pdf") {
            setError("Only PDF files are accepted.");
            if (draftFileInputRef.current) draftFileInputRef.current.value = "";
            return;
        }
        setError("");
        setDraftFile(file);
    };

    const hasValidSigners = !requiresSignature || signers.some((s) => s.signer_name && s.signer_email && s.role_label);
    const isSourceReady = sourceMode === "uploaded" ? !!draftFile : !!selectedTemplateId;
    const canCreate = isSourceReady && hasValidSigners;

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !contract) return;
        if (file.type !== "application/pdf") {
            setError("Only PDF files are accepted.");
            return;
        }
        setUploading(true);
        setError("");
        try {
            const res = await uploadContractFile(leadId, contract.id, file);
            setContract((c) => ({ ...c, uploaded_file_url: res.uploaded_file_url }));
        } catch (e) {
            setError(e.message || "Error uploading file");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
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

    return (
        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
            <ContractDraftModal
                open={showDraftModal}
                onOpenChange={setShowDraftModal}
                onApproved={handleTemplateApproved}
            />

            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-medium text-lg">Contract</h3>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">{error}</div>
            )}

            {!contract ? (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Enable contract</p>
                            <p className="text-xs text-muted-foreground">
                                Optional. If left off, this lead can move to "Won" without a contract.
                            </p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>

                    {enabled && (
                        <div className="space-y-4 pt-2 border-t">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={sourceMode === "uploaded" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSourceMode("uploaded")}
                                >
                                    <Upload className="h-4 w-4 mr-1" /> Upload PDF
                                </Button>
                                <Button
                                    type="button"
                                    variant={sourceMode === "template_ai" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSourceMode("template_ai")}
                                >
                                    <Sparkles className="h-4 w-4 mr-1" /> Create with AI
                                </Button>
                            </div>

                            {sourceMode === "uploaded" && (
                                <div className="space-y-2">
                                    <Label className="text-xs">PDF File</Label>
                                    <input
                                        ref={draftFileInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleDraftFileChange}
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => draftFileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-1" /> Choose PDF
                                        </Button>
                                        <span className="text-xs text-muted-foreground">
                                            {draftFile ? draftFile.name : "No file chosen"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {sourceMode === "template_ai" && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Approved Template</Label>
                                    <Select value={selectedTemplateId} onValueChange={(v) => { setSelectedTemplateId(v); setMissingFields([]); }}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={templatesLoaded && templates.length === 0 ? "No approved templates yet" : "Select a template"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <button
                                        type="button"
                                        onClick={() => setShowDraftModal(true)}
                                        className="text-xs underline text-muted-foreground"
                                    >
                                        No templates yet? Create one with AI →
                                    </button>

                                    {missingFields.length > 0 && (
                                        <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                            <p className="text-xs font-medium text-amber-800">
                                                This template needs a few details this Lead doesn't have on file:
                                            </p>
                                            {missingFields.map((path) => (
                                                <div key={path} className="space-y-1">
                                                    <Label className="text-xs">{path}</Label>
                                                    <Input
                                                        value={fieldOverrides[path] || ""}
                                                        onChange={(e) => setFieldOverrides((f) => ({ ...f, [path]: e.target.value }))}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Requires signature</p>
                                    <p className="text-xs text-muted-foreground">
                                        Blocks moving to "Won" until every signer signs.
                                    </p>
                                </div>
                                <Switch checked={requiresSignature} onCheckedChange={setRequiresSignature} />
                            </div>

                            {requiresSignature && (
                                <div className="space-y-3">
                                    {signers.map((signer, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Name</Label>
                                                <Input
                                                    value={signer.signer_name}
                                                    onChange={(e) => updateSignerRow(index, "signer_name", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Email</Label>
                                                <Input
                                                    type="email"
                                                    value={signer.signer_email}
                                                    onChange={(e) => updateSignerRow(index, "signer_email", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Role</Label>
                                                <Input
                                                    placeholder="e.g. Client"
                                                    value={signer.role_label}
                                                    onChange={(e) => updateSignerRow(index, "role_label", e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 text-red-500"
                                                onClick={() => removeSignerRow(index)}
                                                disabled={signers.length === 1}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addSignerRow}>
                                        <Plus className="h-4 w-4 mr-1" /> Add signer
                                    </Button>
                                </div>
                            )}

                            <Button onClick={handleCreate} disabled={creating || !canCreate}>
                                {creating ? "Creating…" : "Create Contract"}
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    {contract.source === "uploaded" ? (
                        <div className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {contract.uploaded_file_url ? (
                                    <a
                                        href={contract.uploaded_file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-medium underline truncate"
                                    >
                                        View uploaded PDF
                                    </a>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">No PDF uploaded yet</span>
                                )}
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    <Upload className="h-4 w-4 mr-1" />
                                    {uploading ? "Uploading…" : contract.uploaded_file_url ? "Replace PDF" : "Upload PDF"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-muted/20 border rounded-md space-y-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm font-medium">Generated from an AI template</span>
                            </div>
                            {(contract.resolved_content || []).map((section, i) => (
                                <div key={i} className="text-xs">
                                    <p className="font-semibold">{section.title}</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{section.body}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {contract.requires_signature && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Signers</p>
                            {(contract.signers || []).map((signer) => (
                                <div
                                    key={signer.id}
                                    className="flex items-center justify-between p-3 bg-muted/20 border rounded-md"
                                >
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
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleResend(signer.id)}
                                                disabled={resendingId === signer.id}
                                            >
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
