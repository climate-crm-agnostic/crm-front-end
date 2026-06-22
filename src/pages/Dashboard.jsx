import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { API_URL, getHeaders } from "@/services/api";
import { getMyTasks } from "@/services/taskService";
import { Magnet, Building2, Receipt, Laptop, ArrowUpRight, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

const fetchCount = async (endpoint) => {
    const res = await fetch(`${API_URL}/${endpoint}/?page_size=1`, { headers: getHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.count ?? null;
};

// Brand Manual accent configs per card
const CARD_ACCENTS = {
    Leads:    { bar: "#F29B6B", badge: { bg: "#FFDCC8", text: "#2E2A26" }, link: "#F29B6B", icon: { bg: "#F29B6B" } },
    Clients:  { bar: "#5E6A43", badge: { bg: "#e8edde", text: "#5E6A43" }, link: "#5E6A43", icon: { bg: "#5E6A43" } },
    Invoices: { bar: "#B8C76A", badge: { bg: "#f0f4dc", text: "#5E6A43" }, link: "#8f9a3e", icon: { bg: "#B8C76A" } },
    Assets:   { bar: "#D8D2C4", badge: { bg: "#F2EBDD", text: "#6b6560" }, link: "#6b6560", icon: { bg: "#6b6560" } },
};

const TASK_COLORS = {
    lead:    { dot: "#5E6A43", bg: "#e8edde", text: "#5E6A43", label: "Lead" },
    client:  { dot: "#3B82F6", bg: "#dbeafe", text: "#1d4ed8", label: "Client" },
    service: { dot: "#7C3AED", bg: "#ede9fe", text: "#5b21b6", label: "Service" },
};

const ENTITY_PATHS = { lead: "/lead", client: "/client", service: "/service" };

const StatCard = ({ title, count, icon: Icon, href, loading, navigate }) => {
    const accent = CARD_ACCENTS[title] ?? CARD_ACCENTS.Assets;

    return (
        <div
            className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
            style={{
                backgroundColor: "#F2EBDD",
                border: "1px solid #D8D2C4",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(46,42,38,0.06)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(46,42,38,0.12)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(46,42,38,0.06)"}
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
                        <Icon className="h-5 w-5" style={{ color: "#FBF7EF" }} />
                    </div>
                    <span
                        className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: accent.badge.bg, color: accent.badge.text, border: `1px solid ${accent.bar}30` }}
                    >
                        Active
                    </span>
                </div>

                {/* Count */}
                <div>
                    <p
                        className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                        style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                        {title}
                    </p>
                    {loading ? (
                        <div className="h-10 w-24 rounded animate-pulse" style={{ backgroundColor: "#D8D2C4" }} />
                    ) : (
                        <span
                            className="text-4xl font-bold"
                            style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif', letterSpacing: "-0.02em" }}
                        >
                            {count ?? "—"}
                        </span>
                    )}
                </div>

                {/* View all */}
                <div
                    className="flex items-center gap-1.5 text-xs font-semibold pt-3 group-hover:gap-2.5 transition-all"
                    style={{
                        color: accent.link,
                        borderTop: "1px solid #D8D2C4",
                        fontFamily: '"Source Sans 3", Arial, sans-serif',
                    }}
                >
                    <span>View all</span>
                    <ArrowUpRight className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                </div>
            </div>
        </div>
    );
};

const TaskKpiCard = ({ title, count, color, href, loading, navigate }) => (
    <div
        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
        style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4", borderRadius: "8px", boxShadow: "0 1px 3px rgba(46,42,38,0.06)" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(46,42,38,0.12)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(46,42,38,0.06)"}
        onClick={() => navigate(href)}
    >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color.dot }} />
        <div className="relative p-5 flex flex-col gap-4 pt-6">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color.dot }}>
                    <ClipboardList className="h-4 w-4" style={{ color: "#FBF7EF" }} />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: color.bg, color: color.text }}>
                    Pending
                </span>
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    {title}
                </p>
                {loading ? (
                    <div className="h-9 w-16 rounded animate-pulse" style={{ backgroundColor: "#D8D2C4" }} />
                ) : (
                    <span className="text-3xl font-bold" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif', letterSpacing: "-0.02em" }}>
                        {count}
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
        <div className="rounded-xl p-5" style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    {MONTHS[current.month]} {current.year}
                </h3>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#D8D2C4] transition-colors cursor-pointer">
                        <ChevronLeft className="h-4 w-4" style={{ color: "#6b6560" }} />
                    </button>
                    <button onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#D8D2C4] transition-colors cursor-pointer">
                        <ChevronRight className="h-4 w-4" style={{ color: "#6b6560" }} />
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
            <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: "#D8D2C4", borderRadius: "8px", overflow: "hidden" }}>
                {cells.map((cell, i) => {
                    if (!cell) return (
                        <div key={i} className="py-2 px-1 min-h-[52px]" style={{ backgroundColor: "#F2EBDD", opacity: 0.4 }} />
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
                                backgroundColor: isSelected ? "#e8edde" : "#F2EBDD",
                                cursor: hasTasks ? "pointer" : "default",
                            }}
                            onMouseEnter={e => hasTasks && !isSelected && (e.currentTarget.style.backgroundColor = "#EDE8DC")}
                            onMouseLeave={e => hasTasks && !isSelected && (e.currentTarget.style.backgroundColor = "#F2EBDD")}
                        >
                            <span
                                className="text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full"
                                style={{
                                    color: isToday ? "#FBF7EF" : "#2E2A26",
                                    backgroundColor: isToday ? "#5E6A43" : "transparent",
                                    fontFamily: '"Source Sans 3", Arial, sans-serif',
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
                <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid #D8D2C4" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: "#EDE8DC", borderBottom: "1px solid #D8D2C4" }}>
                        <span className="text-xs font-semibold" style={{ color: "#2E2A26" }}>
                            Tasks for {new Date(selectedDay + 'T00:00:00').toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </span>
                        <button onClick={() => setSelectedDay(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {selectedTasks.map(task => {
                            const colors = TASK_COLORS[task.entity_type];
                            const path = `${ENTITY_PATHS[task.entity_type]}/${task.entity_id}`;
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => navigate(path)}
                                    className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                    style={{ backgroundColor: "#FAFAF8" }}
                                >
                                    <span
                                        className="mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: colors.bg, color: colors.text }}
                                    >
                                        {colors.label}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "#2E2A26" }}>{task.task}</p>
                                        <p className="text-xs mt-0.5" style={{ color: "#9b948e" }}>{task.entity_name}</p>
                                    </div>
                                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#9b948e" }} />
                                </div>
                            );
                        })}
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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ leads: null, clients: null, invoices: null, assets: null });
    const [loading, setLoading] = useState(true);
    const [taskData, setTaskData] = useState({ totals: { leads: 0, clients: 0, services: 0 }, tasks: [] });
    const [tasksLoading, setTasksLoading] = useState(true);

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
        { title: "Leads",    count: counts.leads,    icon: Magnet,   href: "/lead" },
        { title: "Clients",  count: counts.clients,  icon: Building2, href: "/client" },
        { title: "Invoices", count: counts.invoices,  icon: Receipt,  href: "/invoice" },
        { title: "Assets",   count: counts.assets,   icon: Laptop,   href: "/asset" },
    ];

    const taskCards = [
        { title: "Tasks in Leads",    count: taskData.totals.leads,    color: TASK_COLORS.lead,    href: "/lead" },
        { title: "Tasks in Clients",  count: taskData.totals.clients,  color: TASK_COLORS.client,  href: "/client" },
        { title: "Tasks in Services", count: taskData.totals.services, color: TASK_COLORS.service, href: "/service" },
    ];

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    return (
        <div className="h-full flex flex-col w-full transition-colors duration-300" style={{ backgroundColor: "#FBF7EF" }}>

            {/* Page header */}
            <header
                className="sticky top-0 z-30 w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{
                    backgroundColor: "rgba(251,247,239,0.85)",
                    borderBottom: "1px solid #D8D2C4",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                }}
            >
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1
                            className="text-2xl font-semibold"
                            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: "italic", color: "#2E2A26", letterSpacing: "-0.01em" }}
                        >
                            Dashboard
                        </h1>
                        <span
                            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest rounded-full px-2 py-0.5"
                            style={{ backgroundColor: "#e8edde", border: "1px solid #B8C76A", color: "#5E6A43" }}
                        >
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#B8C76A" }} />
                            Live
                        </span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                        {greeting},{" "}
                        <span className="font-semibold" style={{ color: "#2E2A26" }}>{user?.username || "User"}</span>
                        {user?.groups?.[0] && <span style={{ color: "#9b948e" }}> · {user.groups[0]}</span>}
                    </p>
                </div>
                <p
                    className="text-xs hidden sm:block"
                    style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif', letterSpacing: "0.04em" }}
                >
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
            </header>

            {/* Content */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">

                {/* Overview */}
                <section className="space-y-4">
                    <p
                        className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "#9b948e", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                        Overview
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {cards.map((card) => (
                            <StatCard key={card.title} {...card} loading={loading} navigate={navigate} />
                        ))}
                    </div>
                </section>

                {/* My Pending Tasks KPIs */}
                <section className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9b948e", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                        My Pending Tasks
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {taskCards.map(card => (
                            <TaskKpiCard key={card.title} {...card} loading={tasksLoading} navigate={navigate} />
                        ))}
                    </div>
                </section>

                {/* Calendar */}
                <section className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9b948e", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                        Task Calendar
                    </p>
                    {tasksLoading ? (
                        <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "#E8E3DA" }} />
                    ) : (
                        <TaskCalendar tasks={taskData.tasks} navigate={navigate} />
                    )}
                </section>

            </div>
        </div>
    );
};
