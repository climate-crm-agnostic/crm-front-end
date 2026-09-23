import { useEffect, useRef, useState } from "react";
import { Plus, X, CheckCircle2, Eye } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { RichTextEditor } from "./RichTextEditor";
import { MergeFieldPicker } from "./MergeFieldPicker";
import {
    getContractTemplate, createContractTemplate, updateContractTemplate,
    approveContractTemplate, getContractMergeFields, previewContractTemplate,
} from "../services/contractTemplateService";
import Swal from "sweetalert2";

const emptySection = () => ({ clause_key: "custom", title: "", body: "" });
const emptyForm = () => ({ name: "", content: [emptySection()], default_signer_roles: "Client" });

/**
 * Name + sections + merge fields + Preview/Save/Approve for one
 * ContractTemplate. `templateId` null means "new, blank template" (used by
 * ContractTemplates.jsx's own create form); a real id fetches and edits that
 * template in place (used both by that same page and by ContractDraftModal's
 * "edit" step after the AI hands off a draft).
 */
export const ContractTemplateEditor = ({ templateId, onSaved, onApproved, onCancel, showCancel = true }) => {
    const [form, setForm] = useState(emptyForm());
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(!!templateId);
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);

    const bodyEditorRefs = useRef({});

    useEffect(() => {
        if (!templateId) {
            setForm(emptyForm());
            setIsActive(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        getContractTemplate(templateId)
            .then((t) => {
                setForm({
                    name: t.name,
                    content: t.content && t.content.length ? t.content : [emptySection()],
                    default_signer_roles: (t.default_signer_roles || []).join(", "),
                });
                setIsActive(!!t.is_active);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [templateId]);

    const addSection = () => setForm(f => ({ ...f, content: [...f.content, emptySection()] }));
    const removeSection = (index) => setForm(f => ({ ...f, content: f.content.filter((_, i) => i !== index) }));
    const updateSectionTitle = (index, title) =>
        setForm(f => ({ ...f, content: f.content.map((s, i) => (i === index ? { ...s, title } : s)) }));
    const updateSectionBody = (index, body) =>
        setForm(f => ({ ...f, content: f.content.map((s, i) => (i === index ? { ...s, body } : s)) }));
    const insertIntoSection = (index, token) => {
        bodyEditorRefs.current[index]?.insertText(token);
    };

    const isFormValid = form.name.trim() && form.content.every(s => s.title.trim() && s.body.trim());

    const handleSave = async () => {
        if (!isFormValid) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                content: form.content,
                default_signer_roles: form.default_signer_roles.split(",").map(r => r.trim()).filter(Boolean),
            };
            const saved = templateId
                ? await updateContractTemplate(templateId, payload)
                : await createContractTemplate(payload);
            onSaved?.(saved);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async () => {
        if (!templateId) return;
        setPreviewing(true);
        try {
            const data = await previewContractTemplate(templateId);
            setPreview(data);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setPreviewing(false);
        }
    };

    const handleApprove = async () => {
        if (!templateId) return;
        setApproving(true);
        try {
            const approved = await approveContractTemplate(templateId);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Services Agreement" />
                </div>
                <div className="space-y-2">
                    <Label>Default Signer Roles</Label>
                    <Input
                        value={form.default_signer_roles}
                        onChange={e => setForm(f => ({ ...f, default_signer_roles: e.target.value }))}
                        placeholder="e.g. Client, Co-signer"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated. Just a suggestion — edited per-Contract.</p>
                </div>
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
                            key={`${templateId || 'new'}-${index}`}
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

            <div className="flex gap-2 items-center flex-wrap pt-2 border-t">
                <Button type="button" onClick={handleSave} disabled={saving || !isFormValid}>
                    {saving ? "Saving..." : templateId ? "Save Changes" : "Create Template"}
                </Button>
                {showCancel && onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
                {templateId && (
                    <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
                        <Eye className="h-4 w-4 mr-1.5" /> {previewing ? "Rendering..." : "Preview with Real Lead"}
                    </Button>
                )}
                {templateId && !isActive && (
                    <Button
                        type="button"
                        onClick={handleApprove}
                        disabled={approving}
                        className="text-green-700 hover:text-green-800"
                        variant="outline"
                    >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> {approving ? "Approving..." : "Approve"}
                    </Button>
                )}
            </div>

            {preview && (
                <div className="space-y-3 pt-2 border-t">
                    <Label className="text-xs">Previewing against: {preview.lead_name}</Label>
                    {preview.missing_fields.length > 0 && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                            This Lead has no data for: {preview.missing_fields.join(", ")} — those fields would be asked manually when creating a Contract from this template.
                        </p>
                    )}
                    <div className="border rounded-md p-4 bg-white max-h-96 overflow-auto space-y-4">
                        {preview.sections.map((section, i) => (
                            <div key={i}>
                                <p className="text-sm font-semibold mb-1">{section.title}</p>
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{section.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
