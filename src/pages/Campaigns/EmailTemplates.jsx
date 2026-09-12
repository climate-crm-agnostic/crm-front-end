import { useEffect, useRef, useState } from "react";
import { Mail, Trash2, Edit, Eye } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { RichTextEditor } from "../../components/RichTextEditor";
import { MergeFieldPicker } from "../../components/MergeFieldPicker";
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate, previewEmailTemplate, uploadEmailTemplateImage } from "../../services/emailTemplateService";
import Swal from 'sweetalert2';

const emptyForm = { name: "", subject: "", campaign_type: "one_time", entity: "client", html_body: "" };

export const EmailTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [subjectCursor, setSubjectCursor] = useState(0);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);

    const subjectRef = useRef(null);
    const bodyEditorRef = useRef(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await getEmailTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load templates', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t) => {
        setEditingId(t.id);
        setForm({ name: t.name, subject: t.subject, campaign_type: t.campaign_type, entity: t.entity || "client", html_body: t.html_body });
        setPreview(null);
    };

    const handleCancel = () => {
        setEditingId(null);
        setForm(emptyForm);
        setPreview(null);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.subject.trim() || !form.html_body.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateEmailTemplate(editingId, form);
            } else {
                await createEmailTemplate(form);
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
            await deleteEmailTemplate(id);
            loadTemplates();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete template — it may still be used by a campaign.', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    // Inserts {contact.x} / {client.x} into whichever field the picker sits
    // next to — the subject line (plain input, tracked cursor position
    // since shadcn's Input doesn't forward a ref) or the rich text body
    // (via RichTextEditor's own insertText, which restores its own cursor).
    const insertIntoSubject = (token) => {
        setForm(f => {
            const before = f.subject.slice(0, subjectCursor);
            const after = f.subject.slice(subjectCursor);
            const next = `${before}${token}${after}`;
            setSubjectCursor(before.length + token.length);
            return { ...f, subject: next };
        });
        subjectRef.current?.focus();
    };

    const insertIntoBody = (token) => {
        bodyEditorRef.current?.insertText(token);
    };

    const handleUploadImage = async (file) => {
        try {
            const res = await uploadEmailTemplateImage(file);
            return res.url;
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
            return null;
        }
    };

    const handlePreview = async () => {
        if (!editingId) return;
        setPreviewing(true);
        try {
            const data = await previewEmailTemplate(editingId);
            setPreview(data);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setPreviewing(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading templates...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-base font-semibold">Email Templates</p>
                    <p className="text-sm text-muted-foreground">Reusable content for one-time blasts or the recurring birthday campaign.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">{editingId ? "Edit Template" : "New Template"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spring Sale" />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.campaign_type} onValueChange={v => setForm(f => ({ ...f, campaign_type: v }))}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one_time">One-time blast</SelectItem>
                                <SelectItem value="birthday">Birthday (recurring)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Entity</Label>
                        <Select value={form.entity} onValueChange={v => setForm(f => ({ ...f, entity: v }))}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="lead">Lead</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Determines which variables you can insert and who the campaign targets.
                        </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <Label>Subject Line</Label>
                            <MergeFieldPicker onInsert={insertIntoSubject} label="Insert Variable" entity={form.entity} />
                        </div>
                        <Input
                            ref={subjectRef}
                            value={form.subject}
                            onChange={e => { setForm(f => ({ ...f, subject: e.target.value })); setSubjectCursor(e.target.selectionStart); }}
                            onSelect={e => setSubjectCursor(e.target.selectionStart)}
                            placeholder="e.g. Happy Birthday {contact.first_name}!"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <Label>Body</Label>
                            <MergeFieldPicker onInsert={insertIntoBody} label="Insert Variable" entity={form.entity} />
                        </div>
                        <RichTextEditor
                            key={editingId || 'new'}
                            ref={bodyEditorRef}
                            value={form.html_body}
                            onChange={html => setForm(f => ({ ...f, html_body: html }))}
                            placeholder="Write the email content — click Insert Variable to add {contact.x} or {client.x} fields..."
                            onUploadImage={handleUploadImage}
                        />
                        <p className="text-xs text-muted-foreground">An unsubscribe link is appended automatically — no need to add one.</p>
                    </div>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                    <Button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.subject.trim() || !form.html_body.trim()}>
                        {saving ? "Saving..." : editingId ? "Save Changes" : "Create Template"}
                    </Button>
                    {editingId && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
                    {editingId && (
                        <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
                            <Eye className="h-4 w-4 mr-1.5" /> {previewing ? "Rendering..." : "Preview with Real Contact"}
                        </Button>
                    )}
                </div>

                {preview && (
                    <div className="space-y-2 pt-2 border-t">
                        <Label className="text-xs">Rendered Preview</Label>
                        <p className="text-sm font-medium">{preview.subject}</p>
                        <div className="border rounded-md p-4 bg-white max-h-64 overflow-auto" dangerouslySetInnerHTML={{ __html: preview.html_body }} />
                    </div>
                )}
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-2">
                <h3 className="font-medium text-lg border-b pb-2">All Templates</h3>
                {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No templates yet.</p>
                ) : (
                    templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div>
                                <span className="text-sm font-medium">{t.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                    {t.campaign_type === 'birthday' ? 'Birthday' : 'One-time'} · {t.subject}
                                </span>
                            </div>
                            <div className="flex gap-1">
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
