import { useEffect, useState } from "react";
import { PayablesWidget } from "../components/payables/PayablesWidget";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { API_URL, getHeaders } from "@/services/api";
import { getMyTasks } from "@/services/taskService";
import { Modal } from "../components/Modal";
import { Magnet, Building2, Receipt, Laptop, ArrowUpRight, ClipboardList, ChevronLeft, ChevronRight, Target, Wallet, Repeat, Gauge, Plus, Bot } from "lucide-react";
import { getDashboardSummary, getRevenueSeries } from "@/services/dashboardService";
import { getPeriods } from "@/services/periodService";
import { getGoalsProgress } from "@/services/goalService";
import { compactMoney } from "@/lib/chartPaths";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { GoalGauge } from "@/components/dashboard/GoalGauge";
import { LatestWins } from "@/components/dashboard/LatestWins";
import { formatCount } from "@/lib/utils";

const fetchCount = async (endpoint) => {
    const res = await fetch(`${API_URL}/${endpoint}/?page_size=1`, { headers: getHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.count ?? null;
};

// Brand Manual accent configs per card
const CARD_ACCENTS = {
    Leads:    { bar: "var(--primary)", badge: { bg: "var(--muted)", text: "var(--foreground)" }, link: "var(--primary-text)", icon: { bg: "var(--primary)", fg: "var(--primary-foreground)" } },
    Clients:  { bar: "var(--secondary-text)", badge: { bg: "var(--sidebar-accent)", text: "var(--secondary-text)" }, link: "var(--secondary-text)", icon: { bg: "var(--secondary)", fg: "var(--secondary-foreground)" } },
    Invoices: { bar: "var(--accent)", badge: { bg: "var(--sidebar-accent)", text: "var(--secondary-text)" }, link: "var(--secondary-text)", icon: { bg: "var(--accent)", fg: "var(--accent-foreground)" } },
    Assets:   { bar: "var(--border)", badge: { bg: "var(--card)", text: "var(--muted-foreground)" }, link: "var(--muted-foreground)", icon: { bg: "var(--muted-foreground)", fg: "var(--background)" } },
};

const TASK_COLORS = {
    lead:    { dot: "var(--secondary)", fg: "var(--secondary-foreground)", bg: "var(--sidebar-accent)", text: "var(--secondary-text)", label: "Lead" },
    client:  { dot: "#3B82F6", fg: "#fff", bg: "#dbeafe", text: "#1d4ed8", label: "Client" },
    service: { dot: "#7C3AED", fg: "#fff", bg: "#ede9fe", text: "#5b21b6", label: "Service" },
    task:    { dot: "#c0622a", fg: "#fff", bg: "var(--muted)", text: "#c0622a", label: "Task" },
};

const ENTITY_PATHS = { lead: "/lead", client: "/client", service: "/service", task: "/task" };

// Single source of truth for a task row — used by both the calendar's
// "Selected day" panel and the Tasks-KPI modals, so the two never visually
// drift apart. `navigate` decides what a click does; the modal version wraps
// it to also close the modal.
const TaskRow = ({ task, navigate }) => {
    const colors = TASK_COLORS[task.entity_type];
    // Standalone tasks (Feature: Tasks module) don't have a per-task detail
    // route yet — send those to the Tasks list instead of a 404.
    const path = task.entity_type === "task"
        ? ENTITY_PATHS.task
        : `${ENTITY_PATHS[task.entity_type]}/${task.entity_id}`;
    return (
        <div
            onClick={() => navigate(path)}
            className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted transition-colors"
            style={{ backgroundColor: "var(--card)" }}
        >
            <span
                className="mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.bg, color: colors.text }}
            >
                {colors.label}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{task.task}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9b948e" }}>{task.entity_name}</p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#9b948e" }} />
        </div>
    );
};

// Opens from a Tasks-KPI card — shows every pending task for that entity
// type assigned to the logged-in user (same data already loaded via
// getMyTasks(), just filtered by entity_type — no new request).
const TaskListModal = ({ isOpen, entityType, tasks, onClose, navigate }) => {
    const colors = TASK_COLORS[entityType];
    const title = colors ? `${colors.label} Tasks` : "Tasks";

    const goToTask = (path) => {
        onClose();
        navigate(path);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            {tasks.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "#9b948e" }}>
                    No pending tasks assigned to you.
                </p>
            ) : (
                <div className="rounded-lg overflow-hidden divide-y divide-border" style={{ border: "1px solid var(--border)" }}>
                    {tasks.map(task => (
                        <TaskRow key={task.id} task={task} navigate={goToTask} />
                    ))}
                </div>
            )}
            {entityType && ENTITY_PATHS[entityType] && (
                <button
                    onClick={() => goToTask(ENTITY_PATHS[entityType])}
                    className="mt-4 flex items-center gap-1.5 text-xs font-semibold hover:gap-2.5 transition-all cursor-pointer"
                    style={{ color: colors?.text ?? "var(--secondary-text)" }}
                >
                    <span>View all {colors?.label}s</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
            )}
        </Modal>
    );
};

const StatCard = ({ title, count, icon: Icon, href, loading, navigate }) => {
    const accent = CARD_ACCENTS[title] ?? CARD_ACCENTS.Assets;

    return (
        <div
            className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
            style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"}
            onClick={() => navigate(href)}
        >
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent.bar }} />

            <div className="relative p-6 flex flex-col gap-5 pt-7">
                {/* Icon + badge */}
                <div className="flex items-start justify-between">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: accent.icon.bg }}
                    >
                        <Icon className="h-5 w-5" style={{ color: accent.icon.fg }} />
                    </div>
                    <span
                        className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: accent.badge.bg, color: accent.badge.text, border: `1px solid color-mix(in srgb, ${accent.bar} 19%, transparent)` }}
                    >
                        Active
                    </span>
                </div>

                {/* Count */}
                <div>
                    <p
                        className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                        style={{ color: "var(--muted-foreground)", fontFamily: 'var(--font-body)' }}
                    >
                        {title}
                    </p>
                    {loading ? (
                        <div className="h-10 w-24 rounded animate-pulse" style={{ backgroundColor: "var(--border)" }} />
                    ) : (
                        <span
                            className="text-4xl font-bold"
                            style={{ color: "var(--foreground)", fontFamily: 'var(--font-body)', letterSpacing: "-0.02em" }}
                        >
                            {count == null ? "—" : formatCount(count)}
                        </span>
                    )}
                </div>

                {/* View all */}
                <div
                    className="flex items-center gap-1.5 text-xs font-semibold pt-3 group-hover:gap-2.5 transition-all"
                    style={{
                        color: accent.link,
                        borderTop: "1px solid var(--border)",
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    <span>View all</span>
                    <ArrowUpRight className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                </div>
            </div>
        </div>
    );
};

const TaskKpiCard = ({ title, count, color, entityKey, onOpenModal, loading }) => (
    <div
        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"}
        onClick={() => onOpenModal(entityKey)}
    >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color.dot }} />
        <div className="relative p-5 flex flex-col gap-4 pt-6">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color.dot }}>
                    <ClipboardList className="h-4 w-4" style={{ color: color.fg }} />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: color.bg, color: color.text }}>
                    Pending
                </span>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted-foreground)", fontFamily: 'var(--font-body)' }}>
                    {title}
                </p>
                {loading ? (
                    <div className="h-9 w-16 rounded animate-pulse" style={{ backgroundColor: "var(--border)" }} />
                ) : (
                    <span className="text-3xl font-bold" style={{ color: "var(--foreground)", fontFamily: 'var(--font-body)', letterSpacing: "-0.02em" }}>
                        {formatCount(count)}
                    </span>
                )}
            </div>
        </div>
    </div>
);

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toISOString().slice(0, 10);
    } catch {
        return null;
    }
};

const TaskCalendar = ({ tasks, navigate }) => {
    const today = new Date();
    const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [selectedDay, setSelectedDay] = useState(null);

    const prevMonth = () => setCurrent(c => {
        const d = new Date(c.year, c.month - 1, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const nextMonth = () => setCurrent(c => {
        const d = new Date(c.year, c.month + 1, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    // Build calendar grid
    const firstDay = new Date(current.year, current.month, 1);
    const lastDay = new Date(current.year, current.month + 1, 0);
    // Monday-based: 0=Mon ... 6=Sun
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    const cells = Array.from({ length: totalCells }, (_, i) => {
        const dayNum = i - startOffset + 1;
        if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
        const dateStr = `${current.year}-${String(current.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => normalizeDate(t.date) === dateStr);
        return { dayNum, dateStr, tasks: dayTasks };
    });

    const todayStr = today.toISOString().slice(0, 10);
    const selectedTasks = selectedDay ? tasks.filter(t => normalizeDate(t.date) === selectedDay) : [];

    return (
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: "var(--foreground)", fontFamily: 'var(--font-body)' }}>
                    {MONTHS[current.month]} {current.year}
                </h3>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[var(--border)] transition-colors cursor-pointer">
                        <ChevronLeft className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                    </button>
                    <button onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[var(--border)] transition-colors cursor-pointer">
                        <ChevronRight className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-semibold uppercase tracking-widest py-1" style={{ color: "#9b948e" }}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: "var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                {cells.map((cell, i) => {
                    if (!cell) return (
                        <div key={i} className="py-2 px-1 min-h-[52px]" style={{ backgroundColor: "var(--card)", opacity: 0.4 }} />
                    );

                    const isToday = cell.dateStr === todayStr;
                    const isSelected = cell.dateStr === selectedDay;
                    const hasTasks = cell.tasks.length > 0;

                    const typesInDay = [...new Set(cell.tasks.map(t => t.entity_type))];

                    return (
                        <div
                            key={i}
                            onClick={() => hasTasks && setSelectedDay(isSelected ? null : cell.dateStr)}
                            className="py-2 px-1 min-h-[52px] flex flex-col items-center gap-1 transition-colors"
                            style={{
                                backgroundColor: isSelected ? "var(--sidebar-accent)" : "var(--card)",
                                cursor: hasTasks ? "pointer" : "default",
                            }}
                            onMouseEnter={e => hasTasks && !isSelected && (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--foreground) 6%, transparent)")}
                            onMouseLeave={e => hasTasks && !isSelected && (e.currentTarget.style.backgroundColor = "var(--card)")}
                        >
                            <span
                                className="text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full"
                                style={{
                                    color: isToday ? "var(--background)" : "var(--foreground)",
                                    backgroundColor: isToday ? "var(--secondary)" : "transparent",
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {cell.dayNum}
                            </span>
                            {/* Dots */}
                            {typesInDay.length > 0 && (
                                <div className="flex gap-0.5">
                                    {typesInDay.map(type => (
                                        <span
                                            key={type}
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ backgroundColor: TASK_COLORS[type]?.dot }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Selected day task panel */}
            {selectedDay && selectedTasks.length > 0 && (
                <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                        <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                            Tasks for {new Date(selectedDay + 'T00:00:00').toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </span>
                        <button onClick={() => setSelectedDay(null)} className="text-xs text-muted-foreground hover:text-gray-600 cursor-pointer">✕</button>
                    </div>
                    <div className="divide-y divide-border">
                        {selectedTasks.map(task => (
                            <TaskRow key={task.id} task={task} navigate={navigate} />
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-3">
                {Object.entries(TASK_COLORS).map(([type, colors]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.dot }} />
                        <span className="text-xs" style={{ color: "#9b948e" }}>{colors.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Dashboard = () => {
    const { user, isFeatureEnabled } = useAuth();
    const canSeeChett = isFeatureEnabled("ai") &&
        (user?.is_superuser === true || (user?.permissions || []).includes("app.view_aiconversation"));
    const canSeePayables = isFeatureEnabled("accounts_payable") &&
        (user?.is_superuser === true || (user?.permissions || []).includes("app.view_supplierbill"));
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ leads: null, clients: null, invoices: null, assets: null });
    const [loading, setLoading] = useState(true);
    const [taskData, setTaskData] = useState({ totals: { leads: 0, clients: 0, services: 0, tasks: 0 }, tasks: [] });
    const [tasksLoading, setTasksLoading] = useState(true);
    const [openTaskModal, setOpenTaskModal] = useState(null); // 'lead' | 'client' | 'service' | null

    // New top of the dashboard: the three indicators, revenue, the team goal and the latest wins.
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [granularity, setGranularity] = useState("month");
    const [kind, setKind] = useState("all");
    const [series, setSeries] = useState(null);
    const [seriesLoading, setSeriesLoading] = useState(true);
    const [goalEntries, setGoalEntries] = useState([]);
    const [goalKey, setGoalKey] = useState(null);
    const [goalLoading, setGoalLoading] = useState(true);
    const canSeeGoals = isFeatureEnabled("goals") &&
        (user?.is_superuser === true || (user?.permissions || []).includes("app.view_goal"));

    useEffect(() => {
        getDashboardSummary().then(setSummary).catch(() => setSummary(null)).finally(() => setSummaryLoading(false));
    }, []);

    useEffect(() => {
        let cancelled = false;
        setSeriesLoading(true);
        getRevenueSeries({ granularity, kind })
            .then((data) => { if (!cancelled) setSeries(data); })
            .catch(() => { if (!cancelled) setSeries(null); })
            .finally(() => { if (!cancelled) setSeriesLoading(false); });
        return () => { cancelled = true; };
    }, [granularity, kind]);

    useEffect(() => {
        if (!canSeeGoals) { setGoalLoading(false); return; }
        (async () => {
            try {
                const today = new Date().toISOString().slice(0, 10);
                const periods = await getPeriods();
                const current = (Array.isArray(periods) ? periods : []).find((p) => p.start_date <= today && today <= p.end_date);
                if (!current) return;
                const progress = await getGoalsProgress({ periodId: current.id });
                // The team the user belongs to; anyone else (e.g. an admin) sees the first team.
                const team = progress.teams.find((t) => t.indicators.some((i) => i.members.some((m) => m.user?.id === user?.id))) || progress.teams[0];
                if (!team) return;
                setGoalEntries(team.indicators.map((entry) => ({ ...entry, periodName: current.name })));
            } catch {
                // a missing goal card is not worth an error on the dashboard
            } finally {
                setGoalLoading(false);
            }
        })();
    }, [canSeeGoals, user?.id]);

    useEffect(() => {
        const load = async () => {
            const [leads, clients, invoices, assets] = await Promise.allSettled([
                fetchCount("leads"), fetchCount("clients"), fetchCount("invoices"), fetchCount("assets"),
            ]);
            setCounts({
                leads:    leads.status    === "fulfilled" ? leads.value    : null,
                clients:  clients.status  === "fulfilled" ? clients.value  : null,
                invoices: invoices.status === "fulfilled" ? invoices.value : null,
                assets:   assets.status   === "fulfilled" ? assets.value   : null,
            });
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        const loadTasks = async () => {
            try {
                const data = await getMyTasks();
                setTaskData(data);
            } catch (e) {
                console.error("Error fetching tasks", e);
            } finally {
                setTasksLoading(false);
            }
        };
        loadTasks();
    }, []);

    const cards = [
        { title: "Leads",    count: counts.leads,    icon: Magnet,    href: "/lead" },
        { title: "Clients",  count: counts.clients,  icon: Building2, href: "/client" },
        { title: "Invoices", count: counts.invoices,  icon: Receipt,   href: "/invoice" },
        { title: "Assets",   count: counts.assets,   icon: Laptop,    href: "/asset" },
    ];

    const taskCards = [
        { title: "Tasks in Leads",    count: taskData.totals.leads,    color: TASK_COLORS.lead,    entityKey: "lead" },
        { title: "Tasks in Clients",  count: taskData.totals.clients,  color: TASK_COLORS.client,  entityKey: "client" },
        { title: "Tasks in Services", count: taskData.totals.services, color: TASK_COLORS.service, entityKey: "service" },
        { title: "Standalone Tasks",  count: taskData.totals.tasks,    color: TASK_COLORS.task,    entityKey: "task" },
    ];

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    // The team-goal gauge follows the KPIs chosen for the Dashboard (in their order); any other KPI with a goal is the fallback.
    const chosenKeys = (summary?.indicators ?? []).map((i) => i.key);
    const chosenEntries = chosenKeys.map((key) => goalEntries.find((e) => e.indicator.key === key)).filter(Boolean);
    const goalOptions = chosenEntries.length ? chosenEntries : goalEntries;
    const goal = goalOptions.find((e) => e.indicator.key === goalKey) ?? goalOptions[0] ?? null;
    const money = (value) => compactMoney(Number(value));
    // The KPIs chosen for the Dashboard (KPIs → "Show on the Dashboard"); placeholders while loading.
    const KPI_ICONS = { "closed-deals": Target, revenue: Wallet, "recurrent-invoice": Repeat };
    const kpiCards = summary?.indicators ?? (summaryLoading ? [null, null, null] : []);
    const formatKpi = (data) => (data.unit === "currency" ? money(data.value) : formatCount(data.value));
    const canCreateLead = user?.is_superuser === true || (user?.permissions || []).includes("app.add_lead");
    const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    return (
        <div className="flex flex-col gap-4">

            {/* Greeting + the three indicators */}
            <div className="flex flex-wrap items-stretch gap-4">
                <section className="flex flex-[1_1_280px] flex-col justify-center gap-3.5 px-2 py-3">
                    <span className="inline-flex items-center gap-2 self-start rounded-full border bg-card px-3 py-1 text-[13px] text-muted-foreground shadow-sm">
                        <span className="size-2 rounded-full bg-primary" />{dateLabel}
                    </span>
                    <h1 className="text-[40px] leading-[1.08]">{greeting},<br />{user?.username || "User"}</h1>
                    {summary && <p className="max-w-sm text-muted-foreground">{summary.month.label}: {summary.scope === "all" ? "the whole company" : "your own deals"}.</p>}
                    <div className="flex flex-wrap gap-2.5">
                        {canCreateLead && (
                            <button type="button" onClick={() => navigate("/lead/new")} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring">
                                <Plus className="size-4" />New lead
                            </button>
                        )}
                        {canSeeChett && (
                            <button type="button" onClick={() => navigate("/chett-ai")} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border bg-card px-5 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                                <Bot className="size-4" />Ask Chett
                            </button>
                        )}
                    </div>
                </section>
                <section aria-label="Key indicators" className="grid flex-[3_1_520px] gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]">
                    {kpiCards.map((data, index) => (
                        <KpiCard
                            key={data?.key ?? index} label={data?.label ?? ""} loading={summaryLoading || !data}
                            icon={KPI_ICONS[data?.key] ?? (data?.unit === "currency" ? Wallet : Gauge)}
                            value={data ? formatKpi(data) : "—"} change={data?.change_pct} series={data?.series}
                            caption={data?.problem ? `Needs attention: ${data.problem}` : "This month vs the same days last month"}
                        />
                    ))}
                    {!summaryLoading && kpiCards.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No KPIs chosen for the Dashboard. <Link to="/indicator" className="font-semibold underline">Choose them in KPIs</Link>.
                        </p>
                    )}
                </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
                <RevenueChart series={series} loading={seriesLoading} granularity={granularity} kind={kind} onGranularity={setGranularity} onKind={setKind} />
                <GoalGauge goal={goal} options={goalOptions} onSelect={setGoalKey} loading={goalLoading} canManage={user?.is_superuser === true || (user?.permissions || []).includes("app.add_goal")} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
                <LatestWins wins={summary?.latest_wins ?? []} loading={summaryLoading} />
                <section className="space-y-3">
                    <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overview</p>
                    <div className="grid grid-cols-2 gap-4">
                        {cards.map((card) => (
                            <StatCard key={card.title} {...card} loading={loading} navigate={navigate} />
                        ))}
                    </div>
                </section>
            </div>

            <div className="space-y-8 pt-2">
                {canSeePayables && <PayablesWidget navigate={navigate} />}

                {/* My Pending Tasks KPIs */}
                <section className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9b948e", fontFamily: 'var(--font-body)' }}>
                        My Pending Tasks
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {taskCards.map(card => (
                            <TaskKpiCard key={card.title} {...card} loading={tasksLoading} onOpenModal={setOpenTaskModal} />
                        ))}
                    </div>
                </section>

                {/* Calendar */}
                <section className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9b948e", fontFamily: 'var(--font-body)' }}>
                        Task Calendar
                    </p>
                    {tasksLoading ? (
                        <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "var(--border)" }} />
                    ) : (
                        <TaskCalendar tasks={taskData.tasks} navigate={navigate} />
                    )}
                </section>

            </div>

            <TaskListModal
                isOpen={!!openTaskModal}
                entityType={openTaskModal}
                tasks={taskData.tasks.filter(t => t.entity_type === openTaskModal)}
                onClose={() => setOpenTaskModal(null)}
                navigate={navigate}
            />
        </div>
    );
};
