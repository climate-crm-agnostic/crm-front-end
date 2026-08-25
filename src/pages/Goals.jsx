import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { getPeriods } from "../services/periodService";
import { getTeams } from "../services/teamService";
import { getGoals, updateGoal, bulkSetTeamGoal } from "../services/goalService";
import Swal from 'sweetalert2';

export const Goals = () => {
    const [periods, setPeriods] = useState([]);
    const [teams, setTeams] = useState([]);
    const [periodId, setPeriodId] = useState("");
    const [teamId, setTeamId] = useState("");
    const [metricLabel, setMetricLabel] = useState("Revenue");

    const [bulkTarget, setBulkTarget] = useState("");
    const [applying, setApplying] = useState(false);

    const [individualGoals, setIndividualGoals] = useState([]);
    const [loadingGoals, setLoadingGoals] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [p, t] = await Promise.all([getPeriods(), getTeams()]);
                setPeriods(Array.isArray(p) ? p : []);
                setTeams(Array.isArray(t) ? t : []);
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load periods/teams', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            }
        })();
    }, []);

    useEffect(() => {
        if (periodId && teamId && metricLabel.trim()) {
            loadGoals();
        } else {
            setIndividualGoals([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodId, teamId, metricLabel]);

    const loadGoals = async () => {
        setLoadingGoals(true);
        try {
            const data = await getGoals({ period: periodId, team: teamId, scope: 'individual' });
            const filtered = (Array.isArray(data) ? data : []).filter(g => g.metric_label === metricLabel);
            setIndividualGoals(filtered);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load goals', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoadingGoals(false);
        }
    };

    const handleApplyToAll = async () => {
        if (!periodId || !teamId || !metricLabel.trim() || bulkTarget === "") return;
        setApplying(true);
        try {
            const res = await bulkSetTeamGoal({ periodId, teamId, metricLabel, targetValue: bulkTarget });
            setIndividualGoals(res.individual_goals);
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
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <Target className="h-5 w-5 text-primary" />
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
                        <Label>Metric</Label>
                        <Input value={metricLabel} onChange={e => setMetricLabel(e.target.value)} placeholder="e.g. Revenue" />
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
                        disabled={applying || !periodId || !teamId || !metricLabel.trim() || bulkTarget === ""}
                    >
                        {applying ? "Applying..." : "Apply to All Members"}
                    </Button>
                </div>
            </div>

            {periodId && teamId && metricLabel.trim() && (
                <div className="bg-card p-6 rounded-lg border shadow-sm space-y-3">
                    <h3 className="font-medium text-lg border-b pb-2">Per-Member Targets</h3>
                    {loadingGoals ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : individualGoals.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                            No goals yet for this metric — use "Apply to All Members" above to create them.
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
                                        <Input
                                            type="number" defaultValue={g.actual_value ?? ""}
                                            onBlur={e => e.target.value !== String(g.actual_value ?? "") && handleRowChange(g, 'actual_value', e.target.value)}
                                        />
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
        </div>
    );
};
