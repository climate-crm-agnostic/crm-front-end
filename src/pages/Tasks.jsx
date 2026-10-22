import { useEffect, useMemo, useState } from "react";
import { ChartGantt, ListTodo, MoreHorizontal, Pencil, Plus, Trash2, LayoutGrid } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Modal } from "../components/Modal";
import { TaskBoardView } from "../components/tasks/TaskBoardView";
import { TaskModal } from "../components/tasks/TaskModal";
import { TaskTimeline } from "../components/tasks/TaskTimeline";
import { createTask, deleteTask, getTasks, updateTask } from "../services/taskService";
import { createProject, deleteProject, getProjects, updateProject } from "../services/projectService";
import { getUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";

const BOARD_STORAGE_KEY = "task_board_id";
const NO_BOARD = "__none__";
const SUGGESTIONS = ["Internal tasks", "Client tasks"];

const toast = (icon, text) =>
    Swal.fire({ icon, title: icon === "error" ? "Error" : undefined, text, toast: true, position: "top-end", showConfirmButton: false, timer: 3500 });

const remembered = () => {
    try { return localStorage.getItem(BOARD_STORAGE_KEY); } catch { return null; }
};

export const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [boards, setBoards] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [boardId, setBoardId] = useState(remembered);
    const [view, setView] = useState("board");
    const [mineOnly, setMineOnly] = useState(false);

    const [taskModal, setTaskModal] = useState({ open: false, task: null });
    const [boardModal, setBoardModal] = useState({ open: false, board: null, name: "" });

    const load = async () => {
        try {
            const [t, b, u] = await Promise.all([getTasks(), getProjects(), getUsers()]);
            setTasks(Array.isArray(t) ? t : []);
            setBoards(Array.isArray(b) ? b : []);
            setUsers(Array.isArray(u) ? u : []);
        } catch {
            toast("error", "Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Tasks with no board (created before boards existed) get a board of their own, shown only while there are some.
    const hasOrphans = tasks.some((t) => !t.project);
    const tabs = useMemo(() => {
        const list = [...boards].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ id: b.id, name: b.name }));
        return hasOrphans ? [...list, { id: NO_BOARD, name: "No board" }] : list;
    }, [boards, hasOrphans]);

    // A remembered board that no longer exists must not leave an empty page.
    const current = tabs.find((t) => t.id === boardId) ?? tabs[0] ?? null;
    useEffect(() => {
        if (current && current.id !== boardId) setBoardId(current.id);
        if (current) { try { localStorage.setItem(BOARD_STORAGE_KEY, current.id); } catch { /* storage is optional */ } }
    }, [current, boardId]);

    const inBoard = (task, id) => (id === NO_BOARD ? !task.project : task.project === id);
    const boardTasks = useMemo(() => {
        if (!current) return [];
        return tasks
            .filter((t) => inBoard(t, current.id))
            .filter((t) => !mineOnly || t.assignee?.id === user?.id)
            .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999") || a.created_at.localeCompare(b.created_at));
    }, [tasks, current, mineOnly, user?.id]);

    const projectFor = (id) => (id === NO_BOARD ? null : id);

    // ── tasks ────────────────────────────────────────────────────────────
    const replace = (updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    const quickAdd = async (title) => {
        try {
            const created = await createTask({ title, assignee_id: user?.id ?? null, project: projectFor(current.id) });
            setTasks((prev) => [...prev, created]);
        } catch (err) { toast("error", err.message); }
    };

    const move = async (task, status) => {
        const before = task;
        replace({ ...task, status });  // optimistic
        try {
            replace(await updateTask(task.id, { status }));
        } catch (err) {
            replace(before);
            toast("error", err.message);
        }
    };

    const saveTask = async (payload) => {
        try {
            if (taskModal.task) {
                replace(await updateTask(taskModal.task.id, payload));
            } else {
                const created = await createTask({ ...payload, project: projectFor(current.id) });
                setTasks((prev) => [...prev, created]);
            }
            setTaskModal({ open: false, task: null });
        } catch (err) { toast("error", err.message); }
    };

    const removeTask = async (task) => {
        const result = await Swal.fire({ title: `Delete "${task.title}"?`, icon: "warning", showCancelButton: true, confirmButtonColor: "var(--secondary)", cancelButtonColor: "#9b948e", confirmButtonText: "Yes, delete it" });
        if (!result.isConfirmed) return;
        try {
            await deleteTask(task.id);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            setTaskModal({ open: false, task: null });
        } catch (err) { toast("error", err.message); }
    };

    // ── boards ───────────────────────────────────────────────────────────
    const saveBoard = async () => {
        const name = boardModal.name.trim();
        if (!name) return;
        try {
            if (boardModal.board) {
                const updated = await updateProject(boardModal.board.id, { name });
                setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            } else {
                const created = await createProject({ name });
                setBoards((prev) => [...prev, created]);
                setBoardId(created.id);
            }
            setBoardModal({ open: false, board: null, name: "" });
        } catch (err) { toast("error", err.message); }
    };

    const removeBoard = async () => {
        const count = tasks.filter((t) => inBoard(t, current.id)).length;
        const result = await Swal.fire({
            title: `Delete the board "${current.name}"?`, icon: "warning", showCancelButton: true,
            text: count ? `Its ${count} task${count === 1 ? "" : "s"} will be deleted too.` : undefined,
            confirmButtonColor: "var(--secondary)", cancelButtonColor: "#9b948e", confirmButtonText: "Yes, delete it",
        });
        if (!result.isConfirmed) return;
        try {
            await deleteProject(current.id);
            setBoards((prev) => prev.filter((b) => b.id !== current.id));
            setTasks((prev) => prev.filter((t) => !inBoard(t, current.id)));
            setBoardId(null);
        } catch (err) { toast("error", err.message); }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>;

    return (
        <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-primary/10">
                        <ListTodo className="h-5 w-5 text-primary-text" />
                    </div>
                    <div>
                        <p className="text-base font-semibold">Tasks</p>
                        <p className="text-sm text-muted-foreground">A board per topic — internal work, a client, a project. Move tasks from Created to Finished.</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => setBoardModal({ open: true, board: null, name: "" })}>
                    <Plus className="mr-2 h-4 w-4" /> New board
                </Button>
            </div>

            {tabs.length === 0 ? (
                <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
                    <p className="font-heading text-lg font-semibold">Create your first board</p>
                    <p className="text-sm text-muted-foreground">A board holds the tasks of one topic, like “Internal tasks” or a client.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {SUGGESTIONS.map((name) => (
                            <Button key={name} variant="outline" onClick={() => setBoardModal({ open: true, board: null, name })}>{name}</Button>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Boards">
                        {tabs.map((tab) => {
                            const open = tasks.filter((t) => inBoard(t, tab.id) && t.status !== "done").length;
                            const active = tab.id === current?.id;
                            return (
                                <button
                                    key={tab.id} type="button" role="tab" aria-selected={active} onClick={() => setBoardId(tab.id)}
                                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                                >
                                    {tab.name}
                                    <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-black/15" : "bg-muted text-muted-foreground"}`}>{open}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="inline-flex rounded-full border bg-card p-0.5" role="group" aria-label="View">
                                {[["board", "Board", LayoutGrid], ["timeline", "Timeline", ChartGantt]].map(([key, label, viewIcon]) => {
                                    const ViewIcon = viewIcon;
                                    return (
                                        <button
                                            key={key} type="button" onClick={() => setView(key)} aria-pressed={view === key}
                                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                        >
                                            <ViewIcon className="size-4" aria-hidden="true" />{label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox id="mine-only" checked={mineOnly} onCheckedChange={(v) => setMineOnly(Boolean(v))} />
                                <Label htmlFor="mine-only" className="text-sm">Only my tasks</Label>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setTaskModal({ open: true, task: null })}><Plus className="mr-2 h-4 w-4" /> New task</Button>
                            {current && current.id !== NO_BOARD && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" aria-label="Board options"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setBoardModal({ open: true, board: current, name: current.name })}><Pencil className="h-4 w-4" /> Rename board</DropdownMenuItem>
                                        <DropdownMenuItem onClick={removeBoard}><Trash2 className="h-4 w-4" /> Delete board</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {view === "board" ? (
                        <TaskBoardView tasks={boardTasks} onOpen={(task) => setTaskModal({ open: true, task })} onMove={move} onQuickAdd={quickAdd} />
                    ) : (
                        <TaskTimeline tasks={boardTasks} />
                    )}
                </>
            )}

            <TaskModal
                isOpen={taskModal.open} task={taskModal.task} users={users} defaultAssigneeId={user?.id}
                onClose={() => setTaskModal({ open: false, task: null })} onSave={saveTask} onDelete={removeTask}
            />

            <Modal
                isOpen={boardModal.open} onClose={() => setBoardModal({ open: false, board: null, name: "" })}
                title={boardModal.board ? "Rename board" : "New board"} widthClass="sm:w-[440px]"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="board-name">Board name</Label>
                        <Input
                            id="board-name" autoFocus value={boardModal.name} placeholder="e.g. Internal tasks, or Client — Acme"
                            onChange={(e) => setBoardModal((m) => ({ ...m, name: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") saveBoard(); }}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setBoardModal({ open: false, board: null, name: "" })}>Cancel</Button>
                        <Button onClick={saveBoard} disabled={!boardModal.name.trim()}>{boardModal.board ? "Save" : "Create board"}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
