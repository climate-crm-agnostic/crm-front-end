import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Input } from "../ui/input";
import { STATUSES } from "./taskStatus";

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";

const TaskCard = ({ task, onOpen, onDragStart }) => {
    const overdue = task.status !== "done" && task.due_date && task.due_date < new Date().toISOString().slice(0, 10);
    return (
        <article
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onClick={() => onOpen(task)}
            onKeyDown={(e) => { if (e.key === "Enter") onOpen(task); }}
            tabIndex={0}
            role="button"
            aria-label={`${task.title}. Open to edit.`}
            className="cursor-grab space-y-2.5 rounded-xl border bg-card p-3.5 shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
            <p className={`text-sm font-semibold leading-snug ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
            {task.description && <p className="line-clamp-2 text-[13px] text-muted-foreground">{task.description}</p>}
            <div className="flex items-center justify-between gap-2">
                {task.assignee ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                            {initials(task.assignee.name)}
                        </span>
                        <span className="truncate">{task.assignee.name}</span>
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">Nobody yet</span>
                )}
                {task.due_date && (
                    <span className={`inline-flex shrink-0 items-center gap-1 text-xs ${overdue ? "font-semibold text-red-500" : "text-muted-foreground"}`}>
                        <CalendarDays className="size-3.5" aria-hidden="true" />{task.due_date}
                    </span>
                )}
            </div>
        </article>
    );
};

const QuickAdd = ({ onAdd }) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");

    const submit = async () => {
        const text = title.trim();
        if (!text) return;
        setTitle("");
        await onAdd(text);
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                <Plus className="size-4" aria-hidden="true" /> Add a task
            </button>
        );
    }
    return (
        <Input
            autoFocus value={title} placeholder="Task title, then Enter"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setTitle(""); setOpen(false); } }}
            onBlur={() => { if (!title.trim()) setOpen(false); }}
        />
    );
};

/** Three columns — Created, In progress, Finished. Drag a card to another column, or open it to change anything. */
export const TaskBoardView = ({ tasks, onOpen, onMove, onQuickAdd }) => {
    const [overColumn, setOverColumn] = useState(null);

    const drop = (e, status) => {
        e.preventDefault();
        setOverColumn(null);
        const id = e.dataTransfer.getData("taskId");
        const task = tasks.find((t) => String(t.id) === id);
        if (task && task.status !== status) onMove(task, status);
    };

    return (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {STATUSES.map((column) => {
                const items = tasks.filter((t) => t.status === column.value);
                return (
                    <section
                        key={column.value}
                        aria-label={column.label}
                        onDragOver={(e) => { e.preventDefault(); setOverColumn(column.value); }}
                        onDragLeave={() => setOverColumn((c) => (c === column.value ? null : c))}
                        onDrop={(e) => drop(e, column.value)}
                        className={`min-h-[220px] space-y-3 rounded-2xl p-3 transition-colors ${overColumn === column.value ? "bg-primary/10 outline-2 outline-dashed outline-primary" : "bg-muted/50"}`}
                    >
                        <header className="flex items-center justify-between px-1 pt-1">
                            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
                                <span className="size-2.5 rounded-full" style={{ background: column.dot }} aria-hidden="true" />
                                {column.label}
                            </h3>
                            <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{items.length}</span>
                        </header>
                        {items.map((task) => (
                            <TaskCard key={task.id} task={task} onOpen={onOpen} onDragStart={(e, t) => e.dataTransfer.setData("taskId", String(t.id))} />
                        ))}
                        {column.value === "todo" && <QuickAdd onAdd={onQuickAdd} />}
                    </section>
                );
            })}
        </div>
    );
};
