import { useMemo } from "react";
import { STATUSES } from "./taskStatus";

const dayMs = 24 * 60 * 60 * 1000;
const colorOf = (status) => STATUSES.find((s) => s.value === status)?.dot ?? "var(--secondary)";

/** The board's tasks that have a due date, as bars from their start (or due) date to their due date. */
export const TaskTimeline = ({ tasks }) => {
    const dated = tasks.filter((t) => t.due_date);

    const { minDate, maxDate } = useMemo(() => {
        if (dated.length === 0) return { minDate: new Date(), maxDate: new Date(Date.now() + 7 * dayMs) };
        const starts = dated.map((t) => new Date(t.start_date || t.due_date).getTime());
        const ends = dated.map((t) => new Date(t.due_date).getTime());
        return { minDate: new Date(Math.min(...starts)), maxDate: new Date(Math.max(...ends)) };
    }, [dated]);

    const totalDays = Math.max(1, Math.round((maxDate - minDate) / dayMs) + 1);

    if (dated.length === 0) {
        return <p className="px-1 text-sm text-muted-foreground">No tasks with a due date on this board yet — give one a due date to see it here.</p>;
    }

    return (
        <div className="space-y-2 overflow-x-auto rounded-xl border bg-card p-6 shadow-sm">
            {dated.map((t) => {
                const start = new Date(t.start_date || t.due_date);
                const end = new Date(t.due_date);
                const left = (Math.round((start - minDate) / dayMs) / totalDays) * 100;
                const width = Math.max((Math.max(1, Math.round((end - start) / dayMs) + 1) / totalDays) * 100, 1.5);
                return (
                    <div key={t.id} className="flex items-center gap-3">
                        <span className="w-44 shrink-0 truncate text-sm" title={t.title}>{t.title}</span>
                        <div className="relative h-6 flex-1 rounded bg-muted" style={{ minWidth: 300 }}>
                            <div className="absolute h-full rounded" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: colorOf(t.status) }} title={`${t.start_date || t.due_date} → ${t.due_date}`} />
                        </div>
                        <span className="w-24 shrink-0 text-xs text-muted-foreground">{t.due_date}</span>
                    </div>
                );
            })}
        </div>
    );
};
