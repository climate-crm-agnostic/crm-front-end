import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInventoryMovements } from "../../services/inventoryService";
import { formatDateTime } from "../../utils/tz";
import { formatCount } from "@/lib/utils";

/** Stock going out when something is sold (and coming back when an invoice is voided or a line removed). */
export const StockMovements = ({ inventoryId }) => {
    const [moves, setMoves] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getInventoryMovements(inventoryId).then((data) => { if (!cancelled) setMoves(data); }).catch(() => { if (!cancelled) setMoves([]); });
        return () => { cancelled = true; };
    }, [inventoryId]);

    return (
        <div className="space-y-3 rounded-lg border bg-card p-6 shadow-sm">
            <div className="border-b pb-2">
                <h3 className="text-lg font-medium">Stock movements</h3>
                <p className="text-sm text-muted-foreground">Selling takes stock out automatically. Voiding an invoice or removing a line puts it back.</p>
            </div>
            {moves === null ? (
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
            ) : moves.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales have moved this stock yet.</p>
            ) : (
                <ul className="divide-y">
                    {moves.map((m) => {
                        const change = Number(m.quantity_change);
                        return (
                            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {m.reason === "sale" ? "Sold" : "Returned to stock"}
                                        {m.invoice && (
                                            <> · <Link to={`/invoice/${m.invoice}`} className="underline" style={{ color: "var(--secondary-text)" }}>{m.invoice_number}</Link></>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</p>
                                </div>
                                <span className={`shrink-0 font-heading text-base font-bold tabular-nums ${change < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                    {change > 0 ? "+" : "−"}{formatCount(Math.abs(change))}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
