import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileSignature, Trash2, Edit, Plus, X, CheckCircle2, Eye } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { RichTextEditor } from "../components/RichTextEditor";
import { MergeFieldPicker } from "../components/MergeFieldPicker";
import {
    getContractTemplates, getContractTemplate, createContractTemplate, updateContractTemplate,
    deleteContractTemplate, approveContractTemplate, getContractMergeFields, previewContractTemplate,
} from "../services/contractTemplateService";
import Swal from 'sweetalert2';

const emptySection = () => ({ clause_key: "custom", title: "", body: "" });
const emptyForm = () => ({ name: "", content: [emptySection()], default_signer_roles: "Client" });

export const ContractTemplates = () => {
    const location = useLocation();

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm());
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [approvingId, setApprovingId] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);

    const bodyEditorRefs = useRef({});

    useEffect(() => {
        loadTemplates();
    }, []);

    // Deep-link from ContractAIChat.jsx: after the AI finishes a draft, the
    // "Review Draft" button lands here with the new template's id so the
    // user falls straight into editing it instead of hunting for it below.
    useEffect(() => {
        const editId = location.state?.editId;
        if (!editId) return;
        getContractTemplate(editId).then(handleEdit).catch(() => { });
    }, [location.state]);

    const loadTemplates = async () => {
        try {
            const data = await getContractTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load contract templates', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t) => {
        setEditingId(t.id);
        setForm({
            name: t.name,
            content: t.content && t.content.length ? t.content : [emptySection()],
            default_signer_roles: (t.default_signer_roles || []).join(", "),
        });
        setPreview(null);
    };

    const handleCancel = () => {
        setEditingId(null);
        setForm(emptyForm());
        setPreview(null);
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
            if (editingId) {
                await updateContractTemplate(editingId, payload);
            } else {
                await createContractTemplate(payload);
            }
            handleCancel();
            loadTemplates();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#5E6A43', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteContractTemplate(id);
            loadTemplates();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete template — it may still be used by a contract.', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handlePreview = async () => {
        if (!editingId) return;
        setPreviewing(true);
        try {
            const data = await previewContractTemplate(editingId);
            setPreview(data);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setPreviewing(false);
        }
    };

    const handleApprove = async (id) => {
        setApprovingId(id);
        try {
            await approveContractTemplate(id);
            loadTemplates();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setApprovingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading contract templates...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-base font-semibold">Contract Templates</p>
                    <p className="text-sm text-muted-foreground">
                        Reusable contract sections with merge fields. New templates start as a draft — approve them before they're selectable on a Lead.
                    </p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">{editingId ? "Edit Template" : "New Template"}</h3>

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
                                key={`${editingId || 'new'}-${index}`}
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
                        {saving ? "Saving..." : editingId ? "Save Changes" : "Create Template"}
                    </Button>
                    {editingId && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
                    {editingId && (
                        <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
                            <Eye className="h-4 w-4 mr-1.5" /> {previewing ? "Rendering..." : "Preview with Real Lead"}
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

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-2">
                <h3 className="font-medium text-lg border-b pb-2">All Templates</h3>
                {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No contract templates yet.</p>
                ) : (
                    templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium truncate">{t.name}</span>
                                <Badge variant={t.is_active ? "success" : "secondary"}>
                                    {t.is_active ? "Approved" : "Draft"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{(t.content || []).length} section(s)</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                {!t.is_active && (
                                    <Button
                                        variant="ghost" size="sm"
                                        onClick={() => handleApprove(t.id)}
                                        disabled={approvingId === t.id}
                                        className="text-green-700 hover:text-green-800"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        {approvingId === t.id ? "Approving..." : "Approve"}
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} className="h-8 w-8 p-0">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
