import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import { Swal } from "../components/payables/payablesUi";
import { Download, HandCoins, Plus } from "lucide-react";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { DateInput } from "../components/ui/date-input";
import { formatDate } from "../utils/date";
import { exportSupplierBillsExcel, getSupplierBills } from "../services/payablesService";
import {
    BILL_STATUS, PAYABLE_STATUSES, addDays, money, sumByCurrency, today, useCan,
} from "../components/payables/payablesUi";

const STATUS_TABS = [
    { value: "all", label: "All" },
    {
        value: "open", label: "To pay", color: BILL_STATUS.open.color,
        match: (row) => PAYABLE_STATUSES.includes(row.status) && !row.is_overdue,
    },
    { value: "overdue", label: "Overdue", color: "var(--destructive)", match: (row) => row.is_overdue },
    { value: "paid", label: "Paid", color: BILL_STATUS.paid.color, match: (row) => row.status === "paid" },
    { value: "draft", label: "Draft", color: BILL_STATUS.draft.color, match: (row) => row.status === "draft" },
    { value: "void", label: "Void", match: (row) => row.status === "void" },
];

export const SupplierBills = () => {
    const navigate = useNavigate();
    const can = useCan();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dueFrom, setDueFrom] = useState("");
    const [dueTo, setDueTo] = useState("");

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                setBills(await getSupplierBills());
            } catch (err) {
                console.error("Error fetching bills", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Filters by due date — what matters for deciding what to pay next.
    const visible = useMemo(() => bills.filter((b) => {
        if (dueFrom && b.due_date < dueFrom) return false;
        if (dueTo && b.due_date > dueTo) return false;
        return true;
    }), [bills, dueFrom, dueTo]);

    const payable = visible.filter((b) => PAYABLE_STATUSES.includes(b.status));
    const horizon = addDays(today(), 7);
    const stats = [
        { label: "Outstanding", value: sumByCurrency(payable, "balance_due") },
        { label: "Overdue", value: sumByCurrency(payable.filter((b) => b.is_overdue), "balance_due") },
        {
            label: "Due in 7 days",
            value: sumByCurrency(payable.filter((b) => !b.is_overdue && b.due_date <= horizon), "balance_due"),
        },
    ];

    const handleExport = async () => {
        try {
            saveAs(await exportSupplierBillsExcel(), "supplier_bills.xlsx");
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const renderCard = (bill) => {
        const status = BILL_STATUS[bill.status] || BILL_STATUS.open;
        const showBalance = PAYABLE_STATUSES.includes(bill.status);
        return (
            <div
                className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors bg-background border border-border cursor-pointer hover:bg-muted/40"
                onClick={() => navigate(`/supplier-bill/${bill.id}`)}
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{bill.supplier_name}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground truncate">
                        {bill.bill_number ? `#${bill.bill_number} · ` : ""}{bill.reference}
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    {bill.is_overdue ? (
                        <Badge variant="destructive">{bill.days_overdue}d overdue</Badge>
                    ) : (
                        <Badge variant={status.variant}>{status.label}</Badge>
                    )}
                    <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{money(bill.currency, bill.total)}</p>
                        <p className={`text-xs mt-0.5 ${bill.is_overdue ? "text-destructive" : "text-muted-foreground"}`}>
                            Due {formatDate(bill.due_date)}
                            {showBalance && Number(bill.amount_paid) > 0 && ` · Balance ${money(bill.currency, bill.balance_due)}`}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Accounts Payable</h1>
                    <p className="text-sm text-muted-foreground">Supplier bills and what is still owed on them.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    {can("app.add_supplierpayment") && (
                        <Button variant="outline" onClick={() => navigate("/supplier-payment/new")}>
                            <HandCoins className="mr-2 h-4 w-4" /> Record Payment
                        </Button>
                    )}
                    <Button onClick={() => navigate("/supplier-bill/new")}>
                        <Plus className="mr-2 h-4 w-4" /> New Bill
                    </Button>
                </div>
            </div>

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={visible}
                    stats={stats}
                    statusTabs={STATUS_TABS}
                    renderCard={renderCard}
                    searchKeys={["supplier_name", "bill_number", "reference"]}
                    loading={loading}
                    emptyLabel="No supplier bills yet."
                    headerActions={
                        <div className="flex flex-wrap items-center gap-2">
                            <DateInput value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} placeholder="Due from" className="w-[130px]" />
                            <span className="text-sm text-muted-foreground">to</span>
                            <DateInput value={dueTo} onChange={(e) => setDueTo(e.target.value)} placeholder="Due to" className="w-[130px]" />
                            {(dueFrom || dueTo) && (
                                <button
                                    type="button"
                                    onClick={() => { setDueFrom(""); setDueTo(""); }}
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
