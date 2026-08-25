import { useEffect, useMemo, useState } from "react";
import { ListTodo, GanttChartSquare, Trash2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { DateInput } from "../components/ui/date-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { getTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import { getProjects, createProject } from "../services/projectService";
import { getUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import Swal from 'sweetalert2';

const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const PRIORITY_COLORS = { low: "#9b948e", medium: "#c0622a", high: "#c0392b" };

const Pill = ({ label, color }) => (
    <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}66`, color }}
    >
        {label}
    </span>
);

export const Tasks = () => {
    const { user } = useAuth();
    const [view, setView] = useState("list");
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [priority, setPriority] = useState("medium");
    const [startDate, setStartDate] = useState("");
    const [dueDate, setDueDate] = useState("");

    const [newProjectName, setNewProjectName] = useState("");

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [t, p, u] = await Promise.all([getTasks(), getProjects(), getUsers()]);
            setTasks(Array.isArray(t) ? t : []);
            setProjects(Array.isArray(p) ? p : []);
            setUsers(Array.isArray(u) ? u : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load tasks', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return;
        try {
            await createTask({
                title,
                assignee_id: assigneeId || user?.id || null,
                project: projectId || null,
                priority,
                start_date: startDate || null,
                due_date: dueDate || null,
            });
            setTitle(""); setAssigneeId(""); setProjectId(""); setPriority("medium"); setStartDate(""); setDueDate("");
            loadAll();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handleStatusChange = async (task, status) => {
        try {
            const updated = await updateTask(task.id, { status });
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#5E6A43', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteTask(id);
            loadAll();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete task', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const handleAddProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const p = await createProject({ name: newProjectName });
            setProjects(prev => [...prev, p]);
            setProjectId(p.id);
            setNewProjectName("");
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                        <ListTodo className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-base font-semibold">Tasks</p>
                        <p className="text-sm text-muted-foreground">Standalone tasks — not tied to a Client, Lead, or Service.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>
                        <ListTodo className="h-4 w-4 mr-1" /> List
                    </Button>
                    <Button variant={view === "gantt" ? "default" : "outline"} size="sm" onClick={() => setView("gantt")}>
                        <GanttChartSquare className="h-4 w-4 mr-1" /> Gantt
                    </Button>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">New Task</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-3">
                        <Label>Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Prepare Q1 proposal" />
                    </div>
                    <div className="space-y-2">
                        <Label>Assignee</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                            <SelectContent>
                                {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.username}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Project (optional)</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="No project" /></SelectTrigger>
                            <SelectContent>
                                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Start Date (for Gantt)</Label>
                        <DateInput value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <DateInput value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                </div>
                <div className="flex items-end gap-3 pt-2 border-t max-w-md">
                    <div className="space-y-2 w-full">
                        <Label className="text-xs">Quick-add a project</Label>
                        <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" />
                    </div>
                    <Button type="button" variant="secondary" onClick={handleAddProject} disabled={!newProjectName.trim()}>Add Project</Button>
                </div>
                <Button type="button" onClick={handleCreate} disabled={!title.trim()}>Create Task</Button>
            </div>

            {view === "list" ? (
                <TaskListView tasks={tasks} onStatusChange={handleStatusChange} onDelete={handleDelete} />
            ) : (
                <TaskGanttView tasks={tasks} projects={projects} />
            )}
        </div>
    );
};

const TaskListView = ({ tasks, onStatusChange, onDelete }) => {
    if (tasks.length === 0) {
        return <p className="text-sm text-muted-foreground italic px-1">No tasks yet.</p>;
    }
    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            <div className="overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ backgroundColor: "#5E6A43" }}>
                            {["Title", "Assignee", "Status", "Priority", "Due", "Actions"].map((h, i) => (
                                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-left" style={{ color: "#FBF7EF", textAlign: i === 5 ? "right" : "left" }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map(t => (
                            <tr key={t.id} className="border-t">
                                <td className="px-4 py-2.5 font-medium">{t.title}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{t.assignee?.name || "Unassigned"}</td>
                                <td className="px-4 py-2.5">
                                    <Select value={t.status} onValueChange={v => onStatusChange(t, v)}>
                                        <SelectTrigger className="w-[130px] h-8">
                                            <SelectValue>{STATUS_LABELS[t.status]}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todo">To Do</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="done">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td className="px-4 py-2.5"><Pill label={t.priority} color={PRIORITY_COLORS[t.priority]} /></td>
                                <td className="px-4 py-2.5 text-muted-foreground">{t.due_date || "—"}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const dayMs = 24 * 60 * 60 * 1000;

const TaskGanttView = ({ tasks, projects }) => {
    const ganttable = tasks.filter(t => t.due_date);

    const { minDate, maxDate } = useMemo(() => {
        if (ganttable.length === 0) return { minDate: new Date(), maxDate: new Date(Date.now() + 7 * dayMs) };
        const starts = ganttable.map(t => new Date(t.start_date || t.due_date).getTime());
        const ends = ganttable.map(t => new Date(t.due_date).getTime());
        return { minDate: new Date(Math.min(...starts)), maxDate: new Date(Math.max(...ends)) };
    }, [ganttable]);

    const totalDays = Math.max(1, Math.round((maxDate - minDate) / dayMs) + 1);

    const grouped = useMemo(() => {
        const byProject = {};
        for (const t of ganttable) {
            const key = t.project || "__none__";
            if (!byProject[key]) byProject[key] = [];
            byProject[key].push(t);
        }
        return byProject;
    }, [ganttable]);

    const projectName = (id) => projects.find(p => p.id === id)?.name || "No Project";

    if (ganttable.length === 0) {
        return <p className="text-sm text-muted-foreground italic px-1">No tasks with a due date yet — add one to see it on the Gantt.</p>;
    }

    return (
        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-6 overflow-x-auto">
            {Object.entries(grouped).map(([projectKey, projectTasks]) => (
                <div key={projectKey} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                        {projectKey === "__none__" ? "No Project" : projectName(projectKey)}
                    </h4>
                    {projectTasks.map(t => {
                        const start = new Date(t.start_date || t.due_date);
                        const end = new Date(t.due_date);
                        const offsetDays = Math.round((start - minDate) / dayMs);
                        const durationDays = Math.max(1, Math.round((end - start) / dayMs) + 1);
                        const leftPct = (offsetDays / totalDays) * 100;
                        const widthPct = Math.max((durationDays / totalDays) * 100, 1.5);
                        return (
                            <div key={t.id} className="flex items-center gap-3">
                                <span className="w-40 shrink-0 text-sm truncate" title={t.title}>{t.title}</span>
                                <div className="relative flex-1 h-6 bg-muted rounded" style={{ minWidth: 300 }}>
                                    <div
                                        className="absolute h-full rounded"
                                        style={{
                                            left: `${leftPct}%`, width: `${widthPct}%`,
                                            backgroundColor: PRIORITY_COLORS[t.priority] || "#5E6A43",
                                        }}
                                        title={`${t.start_date || t.due_date} → ${t.due_date}`}
                                    />
                                </div>
                                <span className="w-24 shrink-0 text-xs text-muted-foreground">{t.due_date}</span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
