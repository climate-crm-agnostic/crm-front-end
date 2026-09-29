import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import { Swal } from "../components/payables/payablesUi";
import { Download, Plus } from "lucide-react";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { DateInput } from "../components/ui/date-input";
import { formatDate } from "../utils/date";
import { exportSupplierPaymentsExcel, getSupplierPayments } from "../services/payablesService";
import { methodLabel, money, sumByCurrency, today, useCan } from "../components/payables/payablesUi";

const hasCredit = (row) => row.status === "posted" && Number(row.amount_unapplied) > 0;

const STATUS_TABS = [
    { value: "all", label: "All" },
    {
        value: "applied", label: "Fully applied", color: "var(--secondary)",
        match: (row) => row.status === "posted" && !hasCredit(row),
    },
    { value: "credit", label: "With credit", color: "var(--primary)", match: hasCredit },
    { value: "void", label: "Void", color: "var(--border)", match: (row) => row.status === "void" },
];

export const SupplierPayments = () => {
    const navigate = useNavigate();
    const can = useCan();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                setPayments(await getSupplierPayments());
            } catch (err) {
                console.error("Error fetching payments", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const visible = useMemo(() => payments.filter((p) => {
        if (dateFrom && p.payment_date < dateFrom) return false;
        if (dateTo && p.payment_date > dateTo) return false;
        return true;
    }), [payments, dateFrom, dateTo]);

    const posted = visible.filter((p) => p.status === "posted");
    const monthStart = `${today().slice(0, 8)}01`;
    const stats = [
        { label: "Paid this month", value: sumByCurrency(posted.filter((p) => p.payment_date >= monthStart), "amount") },
        { label: "Paid in view", value: sumByCurrency(posted, "amount") },
        { label: "Unapplied credit", value: sumByCurrency(posted.filter(hasCredit), "amount_unapplied") },
    ];

    const handleExport = async () => {
        try {
            saveAs(await exportSupplierPaymentsExcel(), "supplier_payments.xlsx");
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const renderCard = (p) => {
        const isVoid = p.status === "void";
        const billCount = p.allocations?.length || 0;
        return (
            <div
                className={`flex items-center justify-between gap-3 rounded-lg p-4 transition-colors bg-background border border-border cursor-pointer hover:bg-muted/40 ${isVoid ? "opacity-60" : ""}`}
                onClick={() => navigate(`/supplier-payment/${p.id}`)}
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{p.supplier_name}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground truncate">
                        {p.payment_number} · {methodLabel(p.method)}{p.reference ? ` · ${p.reference}` : ""}
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {isVoid ? (
                        <Badge variant="outline">Void</Badge>
                    ) : hasCredit(p) ? (
                        <Badge variant="secondary">Credit {money(p.currency, p.amount_unapplied)}</Badge>
                    ) : (
                        <Badge variant="default">{billCount} bill{billCount === 1 ? "" : "s"}</Badge>
                    )}
                    <div className="text-right">
                        <p className={`text-sm font-bold text-foreground ${isVoid ? "line-through" : ""}`}>{money(p.currency, p.amount)}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">{formatDate(p.payment_date)}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Supplier Payments</h1>
                    <p className="text-sm text-muted-foreground">Money paid to suppliers and the bills it settled.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    {can("app.add_supplierpayment") && (
                        <Button onClick={() => navigate("/supplier-payment/new")}>
                            <Plus className="mr-2 h-4 w-4" /> Record Payment
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={visible}
                    stats={stats}
                    statusTabs={STATUS_TABS}
                    renderCard={renderCard}
                    searchKeys={["supplier_name", "payment_number", "reference"]}
                    loading={loading}
                    emptyLabel="No supplier payments yet."
                    headerActions={
                        <div className="flex flex-wrap items-center gap-2">
                            <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" className="w-[130px]" />
                            <span className="text-sm text-muted-foreground">to</span>
                            <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" className="w-[130px]" />
                            {(dateFrom || dateTo) && (
                                <button
                                    type="button"
                                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                                    className="text-xs underline text-muted-foreground cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    }
                />
            </div>
        </div>
    );
};
