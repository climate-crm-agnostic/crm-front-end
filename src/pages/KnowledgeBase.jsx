import { useCallback, useEffect, useMemo, useState } from "react";
import { FileAudio, FileImage, FileText, FolderLock, Lock, Pencil, Plus, Trash2, Upload, Users as UsersIcon } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader } from "@/components/SectionCard";
import { AI_NAME } from "@/lib/brand";
import { getUsers } from "@/services/userService";
import {
    createKnowledgeGroup, deleteKnowledgeDocument, deleteKnowledgeGroup, getKnowledgeDocuments,
    getKnowledgeGroups, updateKnowledgeDocument, updateKnowledgeGroup, uploadKnowledgeDocument,
} from "@/services/knowledgeService";

const ACCEPT = ".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.flac,.ogg,.mp4,.mov";

const STATUS = {
    pending_sync: { label: "Waiting to sync", cls: "bg-amber-100 text-amber-800" },
    syncing: { label: "Syncing", cls: "bg-blue-100 text-blue-800" },
    synced: { label: "Ready", cls: "bg-green-100 text-green-800" },
    failed: { label: "Failed", cls: "bg-red-100 text-red-800" },
};
const KIND = {
    document: { label: "Document", Icon: FileText },
    image: { label: "Image", Icon: FileImage },
    media: { label: "Audio / video", Icon: FileAudio },
};

const formatBytes = (n) => {
    const v = Number(n) || 0;
    if (v < 1024) return `${v} B`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
    if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`;
    return `${(v / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const fail = (err) => Swal.fire("Error", err?.message || "Something went wrong.", "error");

// A modal with content the admin composed must not close by clicking the backdrop.
const noOutsideClose = { onInteractOutside: (e) => e.preventDefault(), onPointerDownOutside: (e) => e.preventDefault() };

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/* ── Documents ───────────────────────────────────────────────────────────── */
function GroupChip({ name, everyone }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" }}>
            {everyone ? <UsersIcon className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
            {name}
        </span>
    );
}

function UploadDialog({ open, onClose, groups, onUploaded }) {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState("");
    const [group, setGroup] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (open) { setFile(null); setTitle(""); setGroup(""); setBusy(false); } }, [open]);

    const submit = async () => {
        setBusy(true);
        try {
            await uploadKnowledgeDocument({ file, group, title: title.trim() });
            onUploaded();
            onClose();
        } catch (err) {
            await fail(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
            <DialogContent {...noOutsideClose}>
                <DialogHeader>
                    <DialogTitle>Upload to the knowledge base</DialogTitle>
                    <DialogDescription>{AI_NAME} will answer questions using this file, only for the people you allow.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="kb-file">File</Label>
                        <Input id="kb-file" type="file" accept={ACCEPT}
                            onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setFile(f);
                                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                            }} />
                        <p className="text-xs text-muted-foreground">Documents, images, audio and video. Documents up to 50 MB, media up to 200 MB.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="kb-title">Title</Label>
                        <Input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to the file name" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="kb-group">Who can consult it?</Label>
                        <select id="kb-group" className={selectClass} value={group} onChange={(e) => setGroup(e.target.value)}>
                            <option value="">Choose a group…</option>
                            {groups.map((g) => <option key={g.id} value={g.id}>{g.is_everyone ? "Everyone (all users)" : g.name}</option>)}
                        </select>
                        <p className="text-xs text-muted-foreground">Only the people in this group will be able to consult it.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={submit} disabled={!file || !group || busy}>{busy ? "Uploading…" : "Upload"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MoveDialog({ doc, onClose, groups, onSaved }) {
    const [group, setGroup] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { setGroup(doc?.group || ""); }, [doc]);

    const save = async () => {
        setBusy(true);
        try {
            await updateKnowledgeDocument(doc.id, { group });
            onSaved();
            onClose();
        } catch (err) {
            await fail(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={Boolean(doc)} onOpenChange={(o) => !o && !busy && onClose()}>
            <DialogContent {...noOutsideClose}>
                <DialogHeader>
                    <DialogTitle>Who can consult “{doc?.title}”?</DialogTitle>
                    <DialogDescription>The change applies immediately. The document is queued to sync again.</DialogDescription>
                </DialogHeader>
                <select aria-label="Group" className={selectClass} value={group} onChange={(e) => setGroup(e.target.value)}>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.is_everyone ? "Everyone (all users)" : g.name}</option>)}
                </select>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={save} disabled={busy || group === doc?.group}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DocumentsTab({ groups }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [moving, setMoving] = useState(null);

    const load = useCallback(async () => {
        try { setDocs(await getKnowledgeDocuments()); } catch (err) { await fail(err); } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const remove = async (doc) => {
        const ok = await Swal.fire({
            title: "Delete this document?",
            text: `“${doc.title}” will stop being used by ${AI_NAME}.`,
            icon: "warning", showCancelButton: true, confirmButtonText: "Yes, delete", confirmButtonColor: "#DC2626",
        });
        if (!ok.isConfirmed) return;
        try { await deleteKnowledgeDocument(doc.id); await load(); } catch (err) { await fail(err); }
    };

    return (
        <Card>
            <CardHeader icon={FolderLock} title="Documents" subtitle="Files the assistant can answer from"
                right={<Button onClick={() => setUploading(true)}><Upload className="size-4" />Upload</Button>} />
            <div className="px-2 py-2">
                {loading ? (
                    <div className="m-4 h-24 animate-pulse rounded-lg bg-muted" />
                ) : docs.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground" data-testid="kb-empty">
                        No documents yet. Upload the first one and choose who can consult it.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead><TableHead>Who can consult it</TableHead><TableHead>Type</TableHead>
                                <TableHead>Size</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docs.map((d) => {
                                const k = KIND[d.kind] || KIND.document;
                                const st = STATUS[d.status] || STATUS.pending_sync;
                                const everyone = groups.find((g) => g.id === d.group)?.is_everyone;
                                return (
                                    <TableRow key={d.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <k.Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{d.title}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{d.original_filename}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><GroupChip name={d.group_name} everyone={everyone} /></TableCell>
                                        <TableCell>{k.label}</TableCell>
                                        <TableCell className="tabular-nums">{formatBytes(d.size_bytes)}</TableCell>
                                        <TableCell><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" aria-label={`Change who can consult ${d.title}`} onClick={() => setMoving(d)}><Pencil className="size-4" /></Button>
                                            <Button variant="ghost" size="icon" aria-label={`Delete ${d.title}`} onClick={() => remove(d)}><Trash2 className="size-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
            <UploadDialog open={uploading} onClose={() => setUploading(false)} groups={groups} onUploaded={load} />
            <MoveDialog doc={moving} onClose={() => setMoving(null)} groups={groups} onSaved={load} />
        </Card>
    );
}

/* ── Access groups ───────────────────────────────────────────────────────── */
function GroupDialog({ group, open, onClose, users, onSaved }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [memberIds, setMemberIds] = useState([]);
    const [busy, setBusy] = useState(false);
    const editing = Boolean(group?.id);

    useEffect(() => {
        if (!open) return;
        setName(group?.name || "");
        setDescription(group?.description || "");
        setMemberIds((group?.members || []).map((m) => m.id));
        setBusy(false);
    }, [open, group]);

    const options = useMemo(() => users.map((u) => ({ value: u.id, label: u.full_name ? `${u.full_name} (${u.username})` : u.username })), [users]);

    const save = async () => {
        setBusy(true);
        try {
            const payload = { name: name.trim(), description: description.trim(), member_ids: memberIds };
            if (editing) await updateKnowledgeGroup(group.id, payload); else await createKnowledgeGroup(payload);
            onSaved();
            onClose();
        } catch (err) {
            await fail(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
            <DialogContent {...noOutsideClose}>
                <DialogHeader>
                    <DialogTitle>{editing ? "Edit group" : "New access group"}</DialogTitle>
                    <DialogDescription>People in this group can consult the documents assigned to it. A person can be in several groups.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="kg-name">Name</Label>
                        <Input id="kg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="kg-desc">Description</Label>
                        <Textarea id="kg-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>People</Label>
                        <MultiSelect value={memberIds} onChange={setMemberIds} options={options} display="searchable" placeholder="Add people…" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={save} disabled={busy || !name.trim()}>{editing ? "Save" : "Create group"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GroupsTab({ groups, reload }) {
    const [users, setUsers] = useState([]);
    const [editing, setEditing] = useState(null); // null = closed, {} = new, group = edit

    useEffect(() => { getUsers().then((u) => setUsers(Array.isArray(u) ? u.filter((x) => x.is_active !== false) : [])).catch(() => setUsers([])); }, []);

    const remove = async (g) => {
        const ok = await Swal.fire({
            title: "Delete this group?", text: `“${g.name}” will be removed. It must have no documents.`,
            icon: "warning", showCancelButton: true, confirmButtonText: "Yes, delete", confirmButtonColor: "#DC2626",
        });
        if (!ok.isConfirmed) return;
        try { await deleteKnowledgeGroup(g.id); await reload(); } catch (err) { await fail(err); }
    };

    return (
        <Card>
            <CardHeader icon={UsersIcon} title="Access groups" subtitle="Decide who can consult which documents"
                right={<Button onClick={() => setEditing({})}><Plus className="size-4" />New group</Button>} />
            <ul className="divide-y">
                {groups.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-4 px-6 py-4" data-testid="kb-group">
                        <div className="min-w-0">
                            <p className="flex items-center gap-2 font-medium">
                                {g.name}
                                {g.is_everyone && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">All users</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {g.is_everyone ? "Every person who can use the assistant." : `${g.member_count} ${g.member_count === 1 ? "person" : "people"}`}
                                {" · "}{g.document_count} {g.document_count === 1 ? "document" : "documents"}
                            </p>
                            {!g.is_everyone && g.members.length > 0 && (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {g.members.slice(0, 5).map((m) => m.full_name || m.username).join(", ")}
                                    {g.members.length > 5 ? ` and ${g.members.length - 5} more` : ""}
                                </p>
                            )}
                        </div>
                        {!g.is_everyone && (
                            <div className="flex shrink-0 gap-1">
                                <Button variant="ghost" size="icon" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)}><Pencil className="size-4" /></Button>
                                <Button variant="ghost" size="icon" aria-label={`Delete ${g.name}`} onClick={() => remove(g)}><Trash2 className="size-4" /></Button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            <GroupDialog open={editing !== null} group={editing} onClose={() => setEditing(null)} users={users} onSaved={reload} />
        </Card>
    );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export const KnowledgeBase = () => {
    const [groups, setGroups] = useState([]);
    const loadGroups = useCallback(async () => {
        try { setGroups(await getKnowledgeGroups()); } catch (err) { await fail(err); }
    }, []);
    useEffect(() => { loadGroups(); }, [loadGroups]);

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <div>
                <h1 className="font-heading text-2xl font-bold">Knowledge base</h1>
                <p className="text-sm text-muted-foreground">Upload your company files and choose who can consult each one through {AI_NAME}.</p>
            </div>
            <Tabs defaultValue="documents">
                <TabsList>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="groups">Access groups</TabsTrigger>
                </TabsList>
                <TabsContent value="documents" className="mt-4"><DocumentsTab groups={groups} /></TabsContent>
                <TabsContent value="groups" className="mt-4"><GroupsTab groups={groups} reload={loadGroups} /></TabsContent>
            </Tabs>
        </div>
    );
};
