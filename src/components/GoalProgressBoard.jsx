import { useEffect, useState } from "react";
import { getGoalsProgress } from "../services/goalService";
import { formatGoalValue } from "../lib/goalFormat";

const ProgressBar = ({ pct }) => (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
    </div>
);

const GoalLine = ({ label, goal, unit, strong }) => (
    <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={strong ? "font-medium" : ""}>{label}</span>
            <span className="text-muted-foreground tabular-nums">
                {formatGoalValue(goal.actual_value, unit)} / {formatGoalValue(goal.target_value, unit)}
                <span className="ml-2 font-medium text-foreground">
                    {goal.progress_pct != null ? `${goal.progress_pct}%` : "—"}
                </span>
            </span>
        </div>
        <ProgressBar pct={goal.progress_pct} />
    </div>
);

/**
 * Progress for one period, grouped team → indicator → members (best first).
 * Pass teamId to narrow to a single team (used inside TeamDetail).
 */
export const GoalProgressBoard = ({ periodId, teamId, refreshKey }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!periodId) { setData(null); return; }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getGoalsProgress({ periodId, teamId });
                if (!cancelled) setData(res);
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [periodId, teamId, refreshKey]);

    if (!periodId) return <p className="text-sm text-muted-foreground italic">Select a period to see progress.</p>;
    if (loading && !data) return <p className="text-sm text-muted-foreground">Loading...</p>;
    if (error) return <p className="text-sm text-red-500">{error}</p>;
    if (!data || data.teams.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No goals set for this period yet.</p>;
    }

    return (
        <div className="space-y-6">
            {data.teams.map(t => (
                <div key={t.team.id} className="space-y-4">
                    {!teamId && <h4 className="font-medium">{t.team.name}</h4>}
                    {t.indicators.map(ind => (
                        <div key={ind.indicator.id} className="rounded-md border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{ind.indicator.name}</span>
                                {!ind.indicator.is_automatic && (
                                    <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">manual</span>
                                )}
                            </div>
                            {ind.team_goal && (
                                <GoalLine label="Team" goal={ind.team_goal} unit={ind.indicator.unit} strong />
                            )}
                            <div className="space-y-3 pl-3 border-l">
                                {ind.members.map(m => (
                                    <GoalLine key={m.id} label={m.user?.name} goal={m} unit={ind.indicator.unit} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};
