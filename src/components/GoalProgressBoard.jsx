import { useEffect, useMemo, useState } from "react";
import { getGoalsProgress, updateGoal } from "../services/goalService";
import { formatGoalValue } from "../lib/goalFormat";
import { formatDecimal } from "../lib/utils";

// Evaluation (executed / target) colour: met, close, or behind.
const evaluationTone = (pct) => {
    if (pct == null) return "text-muted-foreground";
    if (pct >= 100) return "text-emerald-600";
    if (pct >= 70) return "text-amber-600";
    return "text-red-500";
};

const Evaluation = ({ pct }) => (
    <span className={`tabular-nums font-medium ${evaluationTone(pct)}`}>
        {pct != null ? `${formatDecimal(pct, 1)}%` : "—"}
    </span>
);

const HEADERS = ["KPI", "Target", "Executed", "Evaluation", "Weight", "Result"];

// Whole-number weights read cleaner ("35", not "35.00"); keep decimals only when present.
const weightText = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    return Number.isInteger(n) ? String(n) : formatDecimal(n, 2);
};

const WeightInput = ({ goal, onSave }) => (
    <input
        type="number" min="0" max="100" step="1"
        defaultValue={weightText(goal.weight)}
        key={`${goal.id}:${goal.weight ?? ""}`}
        placeholder="—"
        aria-label="Weight"
        onBlur={(e) => {
            const next = e.target.value.trim();
            if (next === weightText(goal.weight)) return;
            onSave(goal, next === "" ? null : Number(next));
        }}
        className="w-16 rounded-md border bg-background px-2 py-1 text-right text-sm tabular-nums"
    />
);

/**
 * Progress for one period as a table per team: the team's own totals first, then
 * one block per person with a row per KPI. Per KPI: target, executed, evaluation
 * (executed / target), weight and result (evaluation × weight). A person's
 * results add up to their evaluation, and their weights may not exceed 100.
 * Pass teamId to narrow to a single team (used inside TeamDetail).
 */
export const GoalProgressBoard = ({ periodId, teamId, refreshKey }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [version, setVersion] = useState(0);

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
    }, [periodId, teamId, refreshKey, version]);

    const saveWeight = async (goal, weight) => {
        setSaveError(null);
        try {
            await updateGoal(goal.id, { weight });
        } catch (err) {
            setSaveError(err.message);
        }
        setVersion((v) => v + 1); // reload either way: shows the saved value, or restores the old one
    };

    // team → { team, kpis (team-level rows), people: [{ user, goals, weightTotal, resultTotal }] }
    const teams = useMemo(() => (data?.teams ?? []).map((t) => {
        const people = new Map();
        for (const ind of t.indicators) {
            for (const goal of ind.members) {
                const id = goal.user?.id ?? goal.id;
                if (!people.has(id)) people.set(id, { id, name: goal.user?.name ?? "—", goals: [] });
                people.get(id).goals.push({ indicator: ind.indicator, goal });
            }
        }
        const rows = [...people.values()].map((p) => ({
            ...p,
            weightTotal: p.goals.reduce((sum, g) => sum + Number(g.goal.weight ?? 0), 0),
            resultTotal: p.goals.reduce((sum, g) => sum + Number(g.goal.result ?? 0), 0),
            hasWeights: p.goals.some((g) => g.goal.weight != null),
        }));
        rows.sort((a, b) => b.resultTotal - a.resultTotal || a.name.localeCompare(b.name));
        return { team: t.team, kpis: t.indicators.filter((i) => i.team_goal), people: rows };
    }), [data]);

    if (!periodId) return <p className="text-sm text-muted-foreground italic">Select a period to see progress.</p>;
    if (loading && !data) return <p className="text-sm text-muted-foreground">Loading...</p>;
    if (error) return <p className="text-sm text-red-500">{error}</p>;
    if (!data || data.teams.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No goals set for this period yet.</p>;
    }

    return (
        <div className="space-y-8">
            {saveError && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/15 dark:border-red-500/30">
                    {saveError}
                </p>
            )}
            {teams.map(({ team, kpis, people }) => (
                <section key={team.id} className="space-y-2">
                    {!teamId && <h4 className="font-medium">{team.name}</h4>}
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                    {HEADERS.map((h, i) => (
                                        <th key={h} className={`px-3 py-2 font-semibold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="bg-muted/20">
                                    <th colSpan={HEADERS.length} className="px-3 py-2 text-left font-semibold">Team</th>
                                </tr>
                                {kpis.map(({ indicator, team_goal: goal }) => (
                                    <tr key={goal.id} className="border-t">
                                        <td className="px-3 py-2">
                                            {indicator.name}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatGoalValue(goal.target_value, indicator.unit)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatGoalValue(goal.actual_value, indicator.unit)}</td>
                                        <td className="px-3 py-2 text-right"><Evaluation pct={goal.progress_pct} /></td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                                    </tr>
                                ))}
                            </tbody>

                            {people.map((person) => (
                                <tbody key={person.id}>
                                    <tr className="border-t-2 bg-muted/20">
                                        <th colSpan={4} className="px-3 py-2 text-left font-semibold">{person.name}</th>
                                        <td
                                            className={`px-3 py-2 text-right font-semibold tabular-nums ${person.hasWeights && person.weightTotal < 100 ? "text-amber-600" : ""}`}
                                            title={person.weightTotal < 100 ? "Weights do not add up to 100 yet" : undefined}
                                        >
                                            {person.hasWeights ? `${weightText(person.weightTotal) || 0} / 100` : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums" title="Sum of results = evaluation of the person">
                                            {person.hasWeights ? formatDecimal(person.resultTotal, 2) : "—"}
                                        </td>
                                    </tr>
                                    {person.goals.map(({ indicator, goal }) => (
                                        <tr key={goal.id} className="border-t">
                                            <td className="px-3 py-2 pl-6">
                                                {indicator.name}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatGoalValue(goal.target_value, indicator.unit)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatGoalValue(goal.actual_value, indicator.unit)}</td>
                                            <td className="px-3 py-2 text-right"><Evaluation pct={goal.progress_pct} /></td>
                                            <td className="px-3 py-1.5 text-right"><WeightInput goal={goal} onSave={saveWeight} /></td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {goal.result != null ? formatDecimal(goal.result, 2) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            ))}
                        </table>
                    </div>
                </section>
            ))}
        </div>
    );
};
