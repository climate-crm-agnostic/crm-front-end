import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, FileInput } from "lucide-react";
import { formatDate } from "../../utils/date";
import { getPayablesSummary, getSupplierBills } from "../../services/payablesService";
import { addDays, money, today } from "./payablesUi";

const WITHIN_DAYS = 7;

// Dashboard section: what the company owes suppliers, what is overdue and
// what falls due this week, plus the next bills to pay.
export const PayablesWidget = ({ navigate }) => {
    const [summary, setSummary] = useState(null);
    const [nextBills, setNextBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                // Only overdue and soon-due bills are fetched, so the list stays small.
                const [summaryData, bills] = await Promise.all([
                    getPayablesSummary(WITHIN_DAYS),
                    getSupplierBills({ payable: "true", due_to: addDays(today(), WITHIN_DAYS) }),
                ]);
                setSummary(summaryData);
                setNextBills(
                    bills
                        .filter((b) => Number(b.balance_due) > 0)
                        .sort((a, b) => a.due_date.localeCompare(b.due_date))
                        .slice(0, 5),
                );
            } catch (err) {
                console.error("Error loading payables summary", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Largest balance first, so the main currency leads.
    const currencies = [...(summary?.currencies || [])].sort((a, b) => Number(b.open_balance) - Number(a.open_balance));
    // Nothing owed at all: keep the dashboard quiet.
    if (!loading && currencies.length === 0) return null;

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Accounts Payable</p>
                <div className="flex items-center gap-3 text-xs font-semibold">
                    <button type="button" onClick={() => navigate("/payables-aging")} className="text-secondary-text hover:underline cursor-pointer">
                        Aging report
                    </button>
                    <button type="button" onClick={() => navigate("/supplier-bill")} className="inline-flex items-center gap-1 text-secondary-text hover:underline cursor-pointer">
                        All bills <ArrowRight className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-32 rounded-xl animate-pulse bg-border" />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5 content-start">
                        {currencies.map((c) => (
                            <React.Fragment key={c.currency}>
                                <Figure
                                    icon={FileInput}
                                    label={`Owed (${c.currency})`}
                                    value={money(c.currency, c.open_balance)}
                                    onClick={() => navigate("/supplier-bill")}
                                />
                                <Figure
                                    icon={AlertTriangle}
                                    label="Overdue"
                                    value={money(c.currency, c.overdue_balance)}
                                    hint={`${c.overdue_bills} bill${c.overdue_bills === 1 ? "" : "s"}`}
                                    danger={Number(c.overdue_balance) > 0}
                                    onClick={() => navigate("/supplier-bill")}
                                />
                                <Figure
                                    icon={CalendarClock}
                                    label={`Due in ${WITHIN_DAYS} days`}
                                    value={money(c.currency, c.due_soon_balance)}
                                    hint={`${c.due_soon_bills} bill${c.due_soon_bills === 1 ? "" : "s"}`}
                                    onClick={() => navigate("/supplier-bill")}
                                />
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="rounded-xl p-4 bg-card border border-border">
                        <p className="text-sm font-semibold text-foreground mb-3">Next to pay</p>
                        {nextBills.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nothing overdue or due this week.</p>
                        ) : (
                            <ul className="space-y-2">
                                {nextBills.map((bill) => (
                                    <li key={bill.id}>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/supplier-bill/${bill.id}`)}
                                            className="w-full flex items-center justify-between gap-3 text-left rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate text-foreground">{bill.supplier_name}</p>
                                                <p className={`text-xs ${bill.is_overdue ? "text-destructive" : "text-muted-foreground"}`}>
                                                    {bill.is_overdue ? `${bill.days_overdue}d overdue` : `Due ${formatDate(bill.due_date)}`}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold whitespace-nowrap text-foreground">
                                                {money(bill.currency, bill.balance_due)}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

const Figure = ({ icon, label, value, hint, danger = false, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="text-left rounded-xl p-5 bg-card border border-border hover:bg-muted/40 transition-colors cursor-pointer"
    >
        <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            {React.createElement(icon, { className: `h-4 w-4 ${danger ? "text-destructive" : "text-secondary-text"}` })}
        </div>
        <p className={`text-lg font-bold ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
        {hint && <p className="text-xs mt-1 text-muted-foreground">{hint}</p>}
    </button>
);
