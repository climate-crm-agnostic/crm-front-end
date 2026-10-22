import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { DateInput } from "../ui/date-input";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Modal } from "../Modal";
import { STATUSES } from "./taskStatus";

/**
 * Create or edit one task: a title, who is responsible, its state and (optionally) dates.
 * It only closes with Cancel or the X — never by clicking outside — so a half-written task is not lost.
 */
export const TaskModal = ({ isOpen, onClose, task, defaultStatus = "todo", defaultAssigneeId, users, onSave, onDelete }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [status, setStatus] = useState("todo");
    const [startDate, setStartDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(task?.title ?? "");
        setDescription(task?.description ?? "");
        setAssigneeId(task ? String(task.assignee?.id ?? "") : String(defaultAssigneeId ?? ""));
        setStatus(task?.status ?? defaultStatus);
        setStartDate(task?.start_date ?? "");
        setDueDate(task?.due_date ?? "");
    }, [isOpen, task, defaultStatus, defaultAssigneeId]);

    const save = async () => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            await onSave({
                title: title.trim(), description, status,
                assignee_id: assigneeId ? Number(assigneeId) : null,
                start_date: startDate || null, due_date: dueDate || null,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={task ? "Edit task" : "New task"} widthClass="sm:w-[560px]">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="task-title">Task</Label>
                    <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare the Q1 proposal" autoFocus />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="task-description">Details (optional)</Label>
                    <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Responsible</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Nobody yet" /></SelectTrigger>
                            <SelectContent>
                                {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.username}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Start date (optional)</Label>
                        <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Due date (optional)</Label>
                        <DateInput value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-4">
                    {task && onDelete ? (
                        <Button type="button" variant="ghost" className="text-red-500" onClick={() => onDelete(task)}>Delete task</Button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="button" onClick={save} disabled={saving || !title.trim()}>{saving ? "Saving..." : "Save"}</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
