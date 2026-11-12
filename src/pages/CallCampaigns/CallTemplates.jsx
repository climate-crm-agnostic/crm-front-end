import { useEffect, useState } from "react";
import { PhoneCall, Trash2, Edit, Sparkles } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { getCallTemplates, createCallTemplate, updateCallTemplate, deleteCallTemplate, polishCallPrompt } from "../../services/callTemplateService";
import Swal from 'sweetalert2';

const emptyForm = { name: "", prompt: "" };

/**
 * Reusable rules/system-prompt for the outbound AI calling agent — the
 * phone-call sibling of Campaigns/EmailTemplates.jsx. Plain text only: no
 * rich text, merge fields, or image upload, because the prompt is sent to
 * Bedrock verbatim as a system prompt (see app/models/calling.py::CallTemplate),
 * not rendered as a document.
 */
export const CallTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [polishing, setPolishing] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await getCallTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load call templates', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t) => {
        setEditingId(t.id);
        setForm({ name: t.name, prompt: t.prompt });
    };

    const handleCancel = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.prompt.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateCallTemplate(editingId, form);
            } else {
                await createCallTemplate(form);
            }
            handleCancel();
            loadTemplates();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setSaving(false);
        }
    };

    const handlePolish = async () => {
        if (!form.prompt.trim()) return;
        setPolishing(true);
        try {
            const { polished_text } = await polishCallPrompt(form.prompt);
            setForm(f => ({ ...f, prompt: polished_text }));
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setPolishing(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: 'var(--secondary)', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteCallTemplate(id);
            loadTemplates();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete call template', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading call templates...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <PhoneCall className="h-5 w-5 text-primary-text" />
                </div>
                <div>
                    <p className="text-base font-semibold">Call Templates</p>
                    <p className="text-sm text-muted-foreground">Reusable rules for the AI agent — written once, used by one or more call campaigns.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">{editingId ? "Edit Template" : "New Template"}</h3>
                <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Renewal Reminder" />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Agent Prompt</Label>
                        <Button
                            type="button" variant="outline" size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={handlePolish}
                            disabled={polishing || !form.prompt.trim()}
                            title="Rewrite this draft into a well-structured voice-agent prompt"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {polishing ? "Polishing..." : "Polish with AI"}
                        </Button>
                    </div>
                    <Textarea
                        value={form.prompt}
                        onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                        placeholder="You are a friendly agent calling on behalf of... Your goal is to..."
                        rows={6}
                    />
                    <p className="text-xs text-muted-foreground">Sent to the AI agent as its system prompt on every call that uses this template.</p>
                </div>
                <div className="flex gap-2">
                    <Button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.prompt.trim()}>
                        {saving ? "Saving..." : editingId ? "Save Changes" : "Create Template"}
                    </Button>
                    {editingId && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-2">
                <h3 className="font-medium text-lg border-b pb-2">All Templates</h3>
                {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No call templates yet.</p>
                ) : (
                    templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md gap-3">
                            <div className="min-w-0">
                                <span className="text-sm font-medium">{t.name}</span>
                                <p className="text-xs text-muted-foreground truncate">{t.prompt}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>
                                    <Edit className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:hover:text-red-300">
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
