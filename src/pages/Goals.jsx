import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { getPeriods } from "../services/periodService";
import { getTeams } from "../services/teamService";
import { getGoals, updateGoal, bulkSetTeamGoal } from "../services/goalService";
import { getIndicators, createIndicator } from "../services/indicatorService";
import { GoalProgressBoard } from "../components/GoalProgressBoard";
import { formatGoalValue } from "../lib/goalFormat";
import Swal from 'sweetalert2';

export const Goals = () => {
    const [periods, setPeriods] = useState([]);
    const [teams, setTeams] = useState([]);
    const [periodId, setPeriodId] = useState("");
    const [teamId, setTeamId] = useState("");
    const [indicators, setIndicators] = useState([]);
    const [indicatorId, setIndicatorId] = useState("");
    const [boardRefresh, setBoardRefresh] = useState(0);

    const [bulkTarget, setBulkTarget] = useState("");
    const [applying, setApplying] = useState(false);

    const [individualGoals, setIndividualGoals] = useState([]);
    const [loadingGoals, setLoadingGoals] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [p, t, ind] = await Promise.all([getPeriods(), getTeams(), getIndicators({ is_active: true })]);
                setPeriods(Array.isArray(p) ? p : []);
                setTeams(Array.isArray(t) ? t : []);
                setIndicators(Array.isArray(ind) ? ind : []);
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load periods/teams/indicators', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            }
        })();
    }, []);

    useEffect(() => {
        if (periodId && teamId && indicatorId) {
            loadGoals();
        } else {
            setIndividualGoals([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodId, teamId, indicatorId]);

    const loadGoals = async () => {
        setLoadingGoals(true);
        try {
            const data = await getGoals({ period: periodId, team: teamId, scope: 'individual', indicator: indicatorId });
            setIndividualGoals(Array.isArray(data) ? data : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load goals', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoadingGoals(false);
        }
    };

    const handleApplyToAll = async () => {
        if (!periodId || !teamId || !indicatorId || bulkTarget === "") return;
        setApplying(true);
        try {
            const res = await bulkSetTeamGoal({ periodId, teamId, indicatorId, targetValue: bulkTarget });
            setIndividualGoals(res.individual_goals);
            setBoardRefresh(n => n + 1);
            Swal.fire({ icon: 'success', title: 'Applied', text: `Target set for ${res.individual_goals.length} member(s).`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setApplying(false);
        }
    };

    const handleRowChange = async (goal, field, value) => {
        try {
            const updated = await updateGoal(goal.id, { [field]: value === "" ? null : value });
            setIndividualGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
            setBoardRefresh(n => n + 1);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handleNewIndicator = async () => {
        const { value: name } = await Swal.fire({
            title: 'New manual indicator',
            text: 'For anything the CRM cannot measure by itself (e.g. Calls Made). Progress is typed in by hand.',
            input: 'text',
            inputPlaceholder: 'Indicator name',
            showCancelButton: true,
            inputValidator: v => (!v || !v.trim()) ? 'Name is required' : undefined,
        });
        if (!name) return;
        try {
            const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'indicator';
            const created = await createIndicator({ key, name: name.trim(), unit: 'count', source: 'manual' });
            setIndicators(prev => [...prev, created]);
            setIndicatorId(created.id);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const selectedIndicator = indicators.find(i => i.id === indicatorId);
    const unit = selectedIndicator?.unit;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <Target className="h-5 w-5 text-primary-text" />
                </div>
                <div>
                    <p className="text-base font-semibold">Goals</p>
                    <p className="text-sm text-muted-foreground">Set a target for the whole team, then fine-tune each member.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Period</Label>
                        <Select value={periodId} onValueChange={setPeriodId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select a period" /></SelectTrigger>
                            <SelectContent>
                                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Team</Label>
                        <Select value={teamId} onValueChange={setTeamId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select a team" /></SelectTrigger>
                            <SelectContent>
                                {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Indicator</Label>
                        <div className="flex gap-2">
                            <Select value={indicatorId} onValueChange={setIndicatorId}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select an indicator" /></SelectTrigger>
                                <SelectContent>
                                    {indicators.map(i => (
                                        <SelectItem key={i.id} value={i.id}>
                                            {i.name}{i.is_automatic ? "" : " (manual)"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" onClick={handleNewIndicator} title="New manual indicator">+</Button>
                        </div>
                        {selectedIndicator?.is_automatic && (
                            <p className="text-xs text-muted-foreground">Calculated automatically from the CRM.</p>
                        )}
                    </div>
                </div>

                <div className="flex items-end gap-3 max-w-md pt-2 border-t">
                    <div className="space-y-2">
                        <Label>Target for everyone</Label>
                        <Input type="number" value={bulkTarget} onChange={e => setBulkTarget(e.target.value)} className="w-40" />
                    </div>
                    <Button
                        type="button"
                        onClick={handleApplyToAll}
                        disabled={applying || !periodId || !teamId || !indicatorId || bulkTarget === ""}
                    >
                        {applying ? "Applying..." : "Apply to All Members"}
                    </Button>
                </div>
            </div>

            {periodId && teamId && indicatorId && (
                <div className="bg-card p-6 rounded-lg border shadow-sm space-y-3">
                    <h3 className="font-medium text-lg border-b pb-2">Per-Member Targets</h3>
                    {loadingGoals ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : individualGoals.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                            No goals yet for this indicator — use "Apply to All Members" above to create them.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {individualGoals.map(g => (
                                <div key={g.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-3 bg-muted/20 border rounded-md">
                                    <span className="text-sm font-medium">{g.user?.name}</span>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Target</Label>
                                        <Input
                                            type="number" defaultValue={g.target_value}
                                            onBlur={e => e.target.value !== String(g.target_value) && handleRowChange(g, 'target_value', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Actual</Label>
                                        {g.indicator?.is_automatic ? (
                                            <p className="h-9 flex items-center text-sm tabular-nums">{formatGoalValue(g.actual_value, unit)}</p>
                                        ) : (
                                            <Input
                                                type="number" defaultValue={g.actual_value ?? ""}
                                                onBlur={e => e.target.value !== String(g.actual_value ?? "") && handleRowChange(g, 'actual_value', e.target.value)}
                                            />
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${Math.min(g.progress_pct ?? 0, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {g.progress_pct != null ? `${g.progress_pct}%` : "No progress recorded"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-3">
                <h3 className="font-medium text-lg border-b pb-2">Progress{periodId ? "" : " (select a period)"}</h3>
                <GoalProgressBoard periodId={periodId} refreshKey={boardRefresh} />
            </div>
        </div>
    );
};
