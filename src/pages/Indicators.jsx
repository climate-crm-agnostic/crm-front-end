import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Gauge, Plus, SquarePen, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../components/ui/button";
import { deleteIndicator, getIndicators, updateIndicator } from "../services/indicatorService";

// The Dashboard reads these by key, so they can be edited but not deleted.
const USED_BY_DASHBOARD = ["closed-deals", "revenue", "recurrent-invoice"];

const toast = (icon, text) =>
    Swal.fire({ icon, title: icon === "error" ? "Error" : undefined, text, toast: true, position: "top-end", showConfirmButton: false, timer: 3500 });

export const Indicators = () => {
    const navigate = useNavigate();
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await getIndicators();
            setIndicators(Array.isArray(data) ? data : []);
        } catch {
            toast("error", "Failed to load KPIs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Dashboard cards: the shown KPIs in order, and a way to show/hide and move them.
    const shown = indicators.filter((i) => i.show_on_dashboard && i.is_active).sort((a, b) => a.dashboard_order - b.dashboard_order || a.name.localeCompare(b.name));

    const toggleDashboard = async (indicator) => {
        try {
            await updateIndicator(indicator.id, { show_on_dashboard: !indicator.show_on_dashboard });
            load();
        } catch (err) {
            toast("error", err.message);
        }
    };

    const move = async (indicator, direction) => {
        const index = shown.findIndex((i) => i.id === indicator.id);
        const other = shown[index + direction];
        if (!other) return;
        // Give both a clean, distinct position so equal or gappy orders never leave them tied.
        const positions = shown.map((_, i) => i);
        [positions[index], positions[index + direction]] = [positions[index + direction], positions[index]];
        try {
            await Promise.all(shown.map((item, i) => item.dashboard_order === positions[i] ? null : updateIndicator(item.id, { dashboard_order: positions[i] })));
            load();
        } catch (err) {
            toast("error", err.message);
        }
    };

    const handleDelete = async (indicator) => {
        const result = await Swal.fire({
            title: `Delete "${indicator.name}"?`, icon: "warning", showCancelButton: true,
            confirmButtonColor: "var(--secondary)", cancelButtonColor: "#9b948e", confirmButtonText: "Yes, delete it",
        });
        if (!result.isConfirmed) return;
        try {
            await deleteIndicator(indicator.id);
            load();
        } catch (err) {
            toast("error", err.message);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                        <Gauge className="h-5 w-5 text-primary-text" />
                    </div>
                    <div>
                        <p className="text-base font-semibold">KPIs</p>
                        <p className="text-sm text-muted-foreground">
                            Each KPI is a rule over the CRM’s own data. Its value is calculated live — nothing is typed in by hand.
                        </p>
                    </div>
                </div>
                <Button onClick={() => navigate("/indicator/new")}>
                    <Plus className="mr-2 h-4 w-4" /> New KPI
                </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="px-4 py-3 font-semibold">KPI</th>
                            <th className="px-4 py-3 font-semibold">How it is measured</th>
                            <th className="px-4 py-3 font-semibold text-right">Goals</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">On Dashboard</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                        ) : indicators.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">No KPIs yet.</td></tr>
                        ) : indicators.map((indicator) => {
                            const protectedKey = USED_BY_DASHBOARD.includes(indicator.key);
                            const canDelete = !protectedKey && indicator.goal_count === 0;
                            return (
                                <tr key={indicator.id} className="border-t align-top">
                                    <td className="px-4 py-3">
                                        <button type="button" onClick={() => navigate(`/indicator/${indicator.id}`)} className="font-semibold text-left cursor-pointer hover:underline">
                                            {indicator.name}
                                        </button>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <span>{indicator.unit === "currency" ? "Amount" : "Number"}</span>
                                            {protectedKey && <span className="rounded border px-1.5 py-0.5">used by the Dashboard</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground max-w-xl">
                                        {indicator.summary}
                                        {indicator.problem && <p className="mt-1 text-xs font-medium text-amber-700">⚠ {indicator.problem}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">{indicator.goal_count}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${indicator.is_active ? "bg-muted text-[var(--secondary-text)]" : "bg-muted/50 text-muted-foreground"}`}>
                                            {indicator.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button" role="switch" aria-checked={indicator.show_on_dashboard && indicator.is_active}
                                                disabled={!indicator.is_active} onClick={() => toggleDashboard(indicator)}
                                                aria-label={`Show ${indicator.name} on the Dashboard`}
                                                className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${indicator.show_on_dashboard && indicator.is_active ? "bg-primary" : "bg-border"}`}
                                            >
                                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${indicator.show_on_dashboard && indicator.is_active ? "left-[18px]" : "left-0.5"}`} />
                                            </button>
                                            {shown.some((i) => i.id === indicator.id) && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={shown[0].id === indicator.id} onClick={() => move(indicator, -1)} aria-label="Move earlier"><ArrowUp className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={shown[shown.length - 1].id === indicator.id} onClick={() => move(indicator, 1)} aria-label="Move later"><ArrowDown className="h-4 w-4" /></Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/indicator/${indicator.id}`)} aria-label={`Edit ${indicator.name}`}>
                                                <SquarePen className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon" disabled={!canDelete}
                                                onClick={() => handleDelete(indicator)}
                                                aria-label={`Delete ${indicator.name}`}
                                                title={protectedKey ? "The Dashboard uses this KPI" : indicator.goal_count ? "This KPI has goals" : "Delete"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
