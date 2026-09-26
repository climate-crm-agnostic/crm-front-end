import { useEffect, useRef, useState } from "react";
import { Plus, X, CheckCircle2, Eye, FileText, UploadCloud, Trash2, Info } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { RichTextEditor } from "./RichTextEditor";
import { MergeFieldPicker } from "./MergeFieldPicker";
import {
    getContractTemplate, createContractTemplate, updateContractTemplate,
    approveContractTemplate, getContractMergeFields, previewContractTemplate,
    getContractTemplateVersions, republishContractTemplateVersion, deleteContractTemplate,
} from "../services/contractTemplateService";
import Swal from "sweetalert2";

const emptySection = () => ({ clause_key: "custom", title: "", body: "" });
const emptySignerRole = () => ({ role_label: "" });
const emptyForm = () => ({ name: "", content: [emptySection()], signers: [] });

// The AI/legal disclaimer is no longer a section inside the contract (it never
// reaches the PDF). It's shown here as an informational alert so whoever builds
// the template is aware AI-generated contracts aren't legal advice. Kept in sync
// with MANDATORY_DISCLAIMER in app/ai/contract_prompt.py.
const AI_DISCLAIMER = (
    "This document was generated using an AI assistant based on standard templates " +
    "and does not constitute legal advice. Review by a licensed attorney in the " +
    "applicable jurisdiction is recommended before execution."
);

const MARKER_RE = /\{\{\s*([a-zA-Z0-9_.\- ]+?)\s*\}\}|\{([a-zA-Z_]\w*\.[a-zA-Z_]\w*)\}/g;
function extractVariables(sections) {
    const seen = new Set();
    const out = [];
    for (const s of sections || []) {
        let m;
        MARKER_RE.lastIndex = 0;
        while ((m = MARKER_RE.exec((s && s.body) || "")) !== null) {
            const name = (m[1] || m[2] || "").trim();
            if (name && !seen.has(name)) { seen.add(name); out.push(name); }
        }
    }
    return out;
}

/**
 * Name + sections + merge fields + Preview/Save/Approve for one
 * ContractTemplate. Used by the ContractAIChat page's "edit" step (right
 * after the AI hands off a draft), by the pipeline's ContractTemplatesPage
 * (editing a template — an approved edit forks a new version server-side),
 * and by LeadContractPanel's "Edit Template" dialog. `leadId` is optional —
 * when given, "Preview with Real Lead" resolves against that specific Lead.
 */
export const ContractTemplateEditor = ({
    templateId, leadId, onSaved, onApproved, onCancel, showCancel = true,
    // Called instead of loading a picked version internally when the parent
    // page can navigate to it (keeps the URL in sync — see
    // ContractTemplateEditPage). When omitted, version switches are handled
    // in-place with loadTemplate().
    onVersionSelect,
    // Called after deleting the last remaining version in the family (there's
    // nothing left to load into the editor) — the parent navigates away.
    onDeleted,
}) => {
    const [form, setForm] = useState(emptyForm());
    const [isActive, setIsActive] = useState(false);
    const [source, setSource] = useState("template_ai");
    const [loading, setLoading] = useState(!!templateId);
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    // The row this editor actually operates on. Starts as the `templateId`
    // prop, but saving an APPROVED template forks a new version server-side
    // (ContractTemplateSerializer.update) — every call after that first save
    // (Preview, Approve, further Saves) must target that new row, or Approve
    // would activate the old, un-edited version while this session's changes
    // sit on an orphaned draft nobody ever approves. See CONTRACT_MODULE_CHANGES.md.
    const [currentId, setCurrentId] = useState(templateId);
    // Distinguishes "approving this template for the first time ever" from
    // "approving a version that was forked from a previously-live one" — the
    // Approve button's label reflects which, since saving an edit to an
    // approved template silently forks a new version and it wasn't obvious
    // that the resulting "Approve" click applies to that new draft, not a
    // re-approval of the one that was already live.
    const [version, setVersion] = useState(null);
    // The family root id (null when currentId itself IS the root, i.e. v1).
    // Used to fetch sibling versions for the version selector.
    const [parentTemplateId, setParentTemplateId] = useState(null);
    const [versions, setVersions] = useState([]);
    const [republishing, setRepublishing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const bodyEditorRefs = useRef({});

    // Whichever version is currently loaded — the family's highest is safe to
    // edit/save/approve directly; anything older is view-only aside from
    // Republish As-Is (one click) or editing, which always forks (enforced
    // server-side by ContractTemplateSerializer.update).
    const highestVersion = versions.reduce((max, v) => Math.max(max, v.version), 0);
    const isHighestVersion = !version || version === highestVersion;

    // Loads one row of the family into the form. Used both for the initial
    // templateId prop and for in-place version switches (handleVersionSelect)
    // — `loading` doubles as the busy flag for both, since either way the
    // whole form is being replaced.
    const loadTemplate = (id) => {
        setLoading(true);
        return getContractTemplate(id)
            .then((t) => {
                setForm({
                    name: t.name,
                    content: t.content && t.content.length ? t.content : [emptySection()],
                    signers: Array.isArray(t.signers) ? t.signers : [],
                });
                setSource(t.source || "template_ai");
                setIsActive(!!t.is_active);
                setVersion(t.version);
                setParentTemplateId(t.parent_template || null);
                setCurrentId(t.id);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!templateId) {
            setCurrentId(null);
            setForm(emptyForm());
            setIsActive(false);
            setVersion(null);
            setParentTemplateId(null);
            setLoading(false);
            return;
        }
        loadTemplate(templateId).catch(() => { });
    }, [templateId]);

    // Sibling versions for the version selector — refetched whenever the
    // editor switches to a different row in the family.
    const refreshVersions = (familyId) => {
        if (!familyId) { setVersions([]); return Promise.resolve([]); }
        return getContractTemplateVersions(familyId)
            .then((list) => {
                const rows = Array.isArray(list) ? list : (list.results || []);
                setVersions(rows);
                return rows;
            })
            .catch(() => { setVersions([]); return []; });
    };

    useEffect(() => {
        refreshVersions(currentId ? (parentTemplateId || currentId) : null);
    }, [currentId, parentTemplateId]);

    const handleVersionSelect = (id) => {
        if (!id || id === currentId) return;
        // Just loads that row for viewing — never writes anything. Saving or
        // approving an old version is handled safely wherever it happens
        // (server-side fork in update(), Republish As-Is button below).
        if (onVersionSelect) {
            onVersionSelect(id);
            return;
        }
        loadTemplate(id).catch((err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        });
    };

    const handleRepublish = async () => {
        if (!currentId) return;
        setRepublishing(true);
        try {
            // Reactivates this exact row in place — no fork, no new version
            // number, same id in and out. Refresh both the form's own
            // is_active flag and the sibling list (another row just got
            // deactivated) since currentId itself won't change to retrigger it.
            const republished = await republishContractTemplateVersion(currentId);
            setIsActive(!!republished.is_active);
            await refreshVersions(parentTemplateId || currentId);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setRepublishing(false);
        }
    };

    const handleDeleteVersion = async () => {
        if (!currentId) return;
        const result = await Swal.fire({
            title: `Delete v${version}?`,
            text: isActive
                ? "This is the currently published version — deleting it removes it entirely. Contracts already created from it keep working."
                : "This deletes only this version. Contracts already created from it keep working.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#5E6A43',
            confirmButtonText: 'Yes, delete it',
        });
        if (!result.isConfirmed) return;

        setDeleting(true);
        try {
            const deletedId = currentId;
            await deleteContractTemplate(deletedId);
            const familyId = parentTemplateId || deletedId;
            const survivors = await refreshVersions(familyId);
            if (survivors.length === 0) {
                onDeleted?.();
                return;
            }
            const next = survivors.reduce((best, v) => (!best || v.version > best.version ? v : best), null);
            if (onVersionSelect) onVersionSelect(next.id);
            else await loadTemplate(next.id);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setDeleting(false);
        }
    };

    const addSection = () => setForm(f => ({ ...f, content: [...f.content, emptySection()] }));
    const removeSection = (index) => setForm(f => ({ ...f, content: f.content.filter((_, i) => i !== index) }));
    const updateSectionTitle = (index, title) =>
        setForm(f => ({ ...f, content: f.content.map((s, i) => (i === index ? { ...s, title } : s)) }));
    const updateSectionBody = (index, body) =>
        setForm(f => ({ ...f, content: f.content.map((s, i) => (i === index ? { ...s, body } : s)) }));
    const insertIntoSection = (index, token) => {
        bodyEditorRefs.current[index]?.insertText(token);
    };

    const addSignerRole = () => setForm(f => ({ ...f, signers: [...f.signers, emptySignerRole()] }));
    const removeSignerRole = (index) => setForm(f => ({ ...f, signers: f.signers.filter((_, i) => i !== index) }));
    const updateSignerRole = (index, role_label) =>
        setForm(f => ({ ...f, signers: f.signers.map((s, i) => (i === index ? { ...s, role_label } : s)) }));

    // A section's body comes from the RichTextEditor as HTML — an "empty"
    // editor yields markup like "<p></p>"/"<p><br></p>", not "", so strip tags
    // and &nbsp; before checking emptiness. null-safe on title/body too, since
    // a section loaded from the backend (or a freshly added one) can be missing
    // either key. Without this the Save button could stay disabled forever with
    // no indication of which section is the problem.
    const stripHtml = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    const invalidSectionIndex = form.content.findIndex(
        (s) => !String(s.title || "").trim() || !stripHtml(s.body)
    );
    const isFormValid = !!form.name.trim() && invalidSectionIndex === -1;

    const handleSave = async () => {
        if (!isFormValid) return;
        setSaving(true);
        try {
            // Only non-empty role rows are kept. An empty list means the
            // contract requires no signature. Who actually fills each role is
            // asked per-Lead (LeadContractPanel), not fixed here.
            const cleanSigners = form.signers.filter(s => s.role_label && s.role_label.trim());
            const payload = {
                name: form.name,
                content: form.content,
                signers: cleanSigners,
            };
            const saved = currentId
                ? await updateContractTemplate(currentId, payload)
                : await createContractTemplate(payload);
            // A fork returns a different id (and starts unapproved) — point
            // every subsequent action at it.
            setCurrentId(saved.id);
            setIsActive(!!saved.is_active);
            setVersion(saved.version);
            setParentTemplateId(saved.parent_template || null);
            onSaved?.(saved);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async () => {
        if (!currentId) return;
        setPreviewing(true);
        try {
            const data = await previewContractTemplate(currentId, leadId);
            setPreview(data);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setPreviewing(false);
        }
    };

    const handleApprove = async () => {
        if (!currentId) return;
        setApproving(true);
        try {
            const approved = await approveContractTemplate(currentId);
            setIsActive(true);
            onApproved?.(approved);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setApproving(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground italic p-4">Loading template…</p>;
    }

    return (
        <div className="space-y-4">
            {/* AI/legal disclaimer — shown as an alert here, not baked into the
                contract body or the final PDF (see AI_DISCLAIMER above). Only for
                AI-drafted templates: an uploaded PDF was written by a human, so
                "generated using an AI assistant" wouldn't apply to it. */}
            {source === "template_ai" && (
                <div
                    className="flex items-start gap-2 rounded-md border p-3 text-xs"
                    style={{ background: "#FEF9C3", borderColor: "#FDE68A", color: "#854D0E" }}
                >
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{AI_DISCLAIMER}</p>
                </div>
            )}

            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 px-4 py-3 rounded-t-lg border-b bg-card flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !isFormValid}
                    title={
                        isFormValid
                            ? undefined
                            : !form.name.trim()
                                ? "Add a template name to save"
                                : `Section ${invalidSectionIndex + 1} needs a title and body`
                    }
                >
                    {saving ? "Saving..." : currentId ? "Save Changes" : "Create Template"}
                </Button>
                {!isFormValid && (
                    <span className="text-xs text-amber-600">
                        {!form.name.trim()
                            ? "Add a template name to enable saving."
                            : `Section ${invalidSectionIndex + 1} needs both a title and body.`}
                    </span>
                )}
                {showCancel && onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
                {currentId && (
                    <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
                        <Eye className="h-4 w-4 mr-1.5" /> {previewing ? "Rendering..." : "Preview with Real Lead"}
                    </Button>
                )}
                {currentId && !isActive && isHighestVersion && (
                    <Button
                        type="button"
                        onClick={handleApprove}
                        disabled={approving}
                        className="text-green-700 hover:text-green-800"
                        variant="outline"
                    >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {approving ? "Approving..." : version > 1 ? "Approve New Version" : "Approve"}
                    </Button>
                )}
                {currentId && !isHighestVersion && !isActive && (
                    <Button
                        type="button"
                        onClick={handleRepublish}
                        disabled={republishing}
                        className="text-green-700 hover:text-green-800"
                        variant="outline"
                        title={`Makes v${version} the published version again, immediately`}
                    >
                        <UploadCloud className="h-4 w-4 mr-1.5" />
                        {republishing ? "Publishing..." : "Republish As-Is"}
                    </Button>
                )}
                {currentId && versions.length > 1 && (
                    <Select value={currentId} onValueChange={handleVersionSelect}>
                        <SelectTrigger className="w-[170px]">
                            <SelectValue placeholder="Version" />
                        </SelectTrigger>
                        <SelectContent>
                            {versions.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                    v{v.version} {v.is_active ? "· Approved" : "· Draft"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {currentId && (
                    <Button
                        type="button"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={handleDeleteVersion}
                        disabled={deleting}
                        title={`Delete v${version} only — other versions in this family are unaffected`}
                    >
                        <Trash2 className="h-4 w-4 mr-1.5" /> {deleting ? "Deleting..." : "Delete Version"}
                    </Button>
                )}
                {currentId && !isHighestVersion && !isActive && (
                    <p className="w-full text-xs text-muted-foreground">
                        You're viewing v{version}, an older version — editing and saving will create a new
                        version on top of the family. Use Republish As-Is to make this exact content live
                        with no changes.
                    </p>
                )}
                {currentId && !isHighestVersion && isActive && (
                    <p className="w-full text-xs text-muted-foreground">
                        You're viewing v{version} — it's the currently published version, even though a
                        newer draft exists in this family.
                    </p>
                )}
                {currentId && isHighestVersion && !isActive && version > 1 && (
                    <p className="w-full text-xs text-muted-foreground">
                        This is version {version}, a new draft — the previously approved version stays live
                        until you approve this one.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Services Agreement" />
            </div>

            {/* For an uploaded PDF, show the fields the AI detected so the user
                can confirm/adjust them before approving. */}
            {source === "uploaded" && (() => {
                const detected = extractVariables(form.content);
                return (
                    <div className="border rounded-md p-3 bg-primary/5 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="h-4 w-4" /> Fields detected in the PDF
                        </div>
                        {detected.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No fill-in fields were detected. You can add them manually as
                                <code className="mx-1 px-1 rounded bg-muted">{"{{field_name}}"}</code> in the text below.
                            </p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-1.5">
                                    {detected.map((v) => (
                                        <Badge key={v} variant="secondary" className="text-[11px]">{v}</Badge>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    These become the fields signers fill in. Edit the text below to add or remove them.
                                </p>
                            </>
                        )}
                    </div>
                );
            })()}

            {/* The template only names which signer ROLES are required — who
                actually fills each role (name/email) is different on every
                deal, so that's asked in the Lead's Contract panel once it's
                created, not fixed here. Leave empty for a contract that needs
                no signature. */}
            <div className="space-y-2 border rounded-md p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                    <Label>Required signer roles</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSignerRole}>
                        <Plus className="h-4 w-4 mr-1" /> Add role
                    </Button>
                </div>
                {form.signers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No roles — this contract won't require a signature.</p>
                ) : (
                    form.signers.map((signer, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
                            <div className="space-y-1">
                                <Label className="text-xs">Role</Label>
                                <Input value={signer.role_label} onChange={e => updateSignerRole(index, e.target.value)} placeholder="e.g. Client, Provider" />
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-500" onClick={() => removeSignerRole(index)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-4">
                {form.content.map((section, index) => (
                    <div key={index} className="space-y-2 border rounded-md p-4 bg-muted/10">
                        <div className="flex items-center justify-between">
                            <Input
                                value={section.title}
                                onChange={e => updateSectionTitle(index, e.target.value)}
                                placeholder="Section title, e.g. Payment Terms"
                                className="max-w-sm font-medium"
                            />
                            <div className="flex items-center gap-2">
                                <MergeFieldPicker
                                    entity="lead"
                                    fetchFields={getContractMergeFields}
                                    onInsert={(token) => insertIntoSection(index, token)}
                                />
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="h-8 w-8 p-0 text-red-500"
                                    onClick={() => removeSection(index)}
                                    disabled={form.content.length === 1}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <RichTextEditor
                            key={`${currentId || 'new'}-${index}`}
                            ref={(el) => { bodyEditorRefs.current[index] = el; }}
                            value={section.body}
                            onChange={html => updateSectionBody(index, html)}
                            placeholder="Section text — click Insert Variable to add {lead.x} or {client.x} fields..."
                        />
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-1" /> Add Section
                </Button>
            </div>

            <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Previewing against: {preview?.lead_name}</DialogTitle>
                    </DialogHeader>
                    {preview?.missing_fields.length > 0 && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 shrink-0">
                            This Lead has no data for: {preview.missing_fields.join(", ")} — those fields would be asked manually when creating a Contract from this template.
                        </p>
                    )}
                    <div className="border rounded-md p-4 bg-white overflow-y-auto space-y-4">
                        {preview?.sections.map((section, i) => (
                            <div key={i}>
                                <p className="text-sm font-semibold mb-1">{section.title}</p>
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{section.body}</p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
