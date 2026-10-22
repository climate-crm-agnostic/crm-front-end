import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gauge, Plus, SquarePen, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../components/ui/button";
import { deleteIndicator, getIndicators } from "../services/indicatorService";

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
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                        ) : indicators.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">No KPIs yet.</td></tr>
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
                                    <td className="px-4 py-3 text-muted-foreground max-w-xl">{indicator.summary}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{indicator.goal_count}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${indicator.is_active ? "bg-muted text-[var(--secondary-text)]" : "bg-muted/50 text-muted-foreground"}`}>
                                            {indicator.is_active ? "Active" : "Inactive"}
                                        </span>
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
