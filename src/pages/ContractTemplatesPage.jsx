import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Pencil, Trash2, CheckCircle2, Clock, Upload, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getPipeline } from "../services/pipelineService";
import {
    getContractTemplatesForPipeline, uploadContractTemplatePdf, deleteContractTemplateFamily,
} from "../services/contractTemplateService";
import Swal from "sweetalert2";

/**
 * Pipeline-scoped contract template administration. Templates belong to a
 * pipeline, so this lives under /pipeline/:pipelineId/contracts. Shows the
 * latest version of each template family and lets you create (via the AI
 * chat page) or edit one — version history, restoring, and republishing an
 * older version all live inside the editor (ContractTemplateEditPage), not
 * here.
 */
export const ContractTemplatesPage = () => {
    const { pipelineId } = useParams();
    const navigate = useNavigate();

    const [pipeline, setPipeline] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const pdfInputRef = useRef(null);

    const handlePdfChosen = async (e) => {
        const file = e.target.files?.[0];
        if (pdfInputRef.current) pdfInputRef.current.value = "";
        if (!file) return;
        if (file.type !== "application/pdf") {
            setError("Only PDF files are accepted.");
            return;
        }
        setUploading(true);
        setError("");
        try {
            const created = await uploadContractTemplatePdf(file, { pipelineId });
            // The template + original PDF are always saved, but detection can
            // come back empty (e.g. a scanned/image-only PDF with no text
            // layer). Surface that so the user knows why the editor opened with
            // no sections, instead of a silently blank template.
            if (created.detection_warning) {
                await Swal.fire({
                    icon: "warning",
                    title: "Couldn't read the PDF's fields",
                    text: created.detection_warning,
                    confirmButtonColor: "#5E6A43",
                });
            }
            // Full page, not a modal — reviewing/editing the detected fields can
            // take a while, and a Dialog can be dismissed (Escape, backdrop
            // click) losing all of that progress.
            navigate(`/pipeline/${pipelineId}/contracts/${created.id}/edit`);
        } catch (err) {
            setError(err.message || "Error uploading PDF");
        } finally {
            setUploading(false);
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const list = await getContractTemplatesForPipeline(pipelineId, { latestOnly: true });
            const rows = Array.isArray(list) ? list : (list.results || []);
            setTemplates(rows);
        } catch (e) {
            setError(e.message || "Error loading templates");
        } finally {
            setLoading(false);
        }
    }, [pipelineId]);

    useEffect(() => {
        getPipeline(pipelineId).then(setPipeline).catch(() => setPipeline(null));
        load();
    }, [pipelineId, load]);

    const handleDelete = async (template) => {
        const result = await Swal.fire({
            title: `Delete "${template.name}"?`,
            text: template.is_active
                ? "This deletes every version of this template, including the currently approved one. Contracts already created from it keep working — they don't reference it live."
                : "This deletes every version of this template. Contracts already created from it keep working — they don't reference it live.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#5E6A43",
            confirmButtonText: "Yes, delete it",
        });
        if (!result.isConfirmed) return;

        setDeletingId(template.id);
        try {
            await deleteContractTemplateFamily(template.id);
            setTemplates((prev) => prev.filter((t) => t.id !== template.id));
        } catch (err) {
            setError(err.message || "Error deleting template");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="space-y-4">
                <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => navigate("/pipeline")}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Pipelines
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Contract Templates</h1>
                        {pipeline && <p className="text-sm text-muted-foreground mt-0.5">Pipeline: {pipeline.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfChosen} />
                        <Button type="button" variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={uploading}>
                            <Upload className="h-4 w-4 mr-1.5" /> {uploading ? "Uploading…" : "Upload PDF"}
                        </Button>
                        <Button type="button" onClick={() => navigate(`/pipeline/${pipelineId}/contracts/ai`)}>
                            <Sparkles className="h-4 w-4 mr-1.5" /> Create with AI
                        </Button>
                    </div>
                </div>
            </div>

            {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

            {loading ? (
                <p className="text-sm text-muted-foreground italic">Loading templates…</p>
            ) : templates.length === 0 ? (
                <div className="border rounded-lg p-10 text-center text-muted-foreground space-y-3">
                    <p>No contract templates for this pipeline yet.</p>
                    <div className="flex items-center justify-center gap-2">
                        <Button type="button" variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={uploading}>
                            <Upload className="h-4 w-4 mr-1.5" /> {uploading ? "Uploading…" : "Upload PDF"}
                        </Button>
                        <Button type="button" onClick={() => navigate(`/pipeline/${pipelineId}/contracts/ai`)}>
                            <Sparkles className="h-4 w-4 mr-1.5" /> Create one with AI
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {templates.map((t) => (
                        <div
                            key={t.id}
                            className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-card"
                        >
                            <div className="min-w-0 flex-1 space-y-2">
                                {/* Name on its own line so it isn't squeezed by the badges. */}
                                <p className="font-medium text-sm sm:text-base break-words">{t.name}</p>

                                {/* Metadata badges below the name, wrapping as needed. */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge variant="secondary">v{t.version}</Badge>
                                    {t.is_active ? (
                                        <Badge className="bg-green-100 text-green-800">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">
                                            <Clock className="h-3 w-3 mr-1" /> Draft
                                        </Badge>
                                    )}
                                    {t.source === "uploaded" ? (
                                        <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> PDF</Badge>
                                    ) : (
                                        <Badge variant="outline"><Sparkles className="h-3 w-3 mr-1" /> AI</Badge>
                                    )}
                                    {t.pipeline == null && <Badge variant="outline">Unscoped</Badge>}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    {(t.default_signer_roles || []).join(", ") || "No default signer roles"}
                                </p>
                            </div>

                            {/* Actions pinned to the right, top-aligned with the name. */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    type="button" variant="outline" size="sm"
                                    onClick={() => navigate(`/pipeline/${pipelineId}/contracts/${t.id}/edit`)}
                                >
                                    <Pencil className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => handleDelete(t)}
                                    disabled={deletingId === t.id}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" /> {deletingId === t.id ? "Deleting…" : "Delete"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
