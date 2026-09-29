import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { saveAs } from "file-saver";
import { ArrowLeft, Download, HandCoins, Pencil, Plus } from "lucide-react";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { DateInput } from "../components/ui/date-input";
import { formatDate } from "../utils/date";
import { getSupplierById } from "../services/supplierService";
import {
    exportSupplierStatementExcel, getSupplierBalance, getSupplierBills, getSupplierStatement,
} from "../services/payablesService";
import { BILL_STATUS, Swal, money, useCan } from "../components/payables/payablesUi";

// A supplier's account: what we owe them per currency, the bills still open,
// and a statement (bills as charges, payments as credits) with a running balance.
export const SupplierAccount = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const can = useCan();

    const [supplier, setSupplier] = useState(null);
    const [balances, setBalances] = useState([]);
    const [openBills, setOpenBills] = useState([]);
    const [statement, setStatement] = useState([]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingStatement, setLoadingStatement] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [supplierData, balanceData, billData] = await Promise.all([
                    getSupplierById(id),
                    getSupplierBalance(id),
                    getSupplierBills({ supplier: id, payable: "true" }),
                ]);
                setSupplier(supplierData);
                setBalances(balanceData.balances || []);
                setOpenBills(
                    billData
                        .filter((b) => Number(b.balance_due) > 0)
                        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
                );
            } catch (err) {
                setError(err.message || "Failed to load the supplier account.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const filters = () => ({
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
    });

    useEffect(() => {
        (async () => {
            setLoadingStatement(true);
            try {
                const data = await getSupplierStatement(id, filters());
                setStatement(data.sections || []);
            } catch (err) {
                Swal.fire("Error", err.message, "error");
            } finally {
                setLoadingStatement(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, dateFrom, dateTo]);

    const handleExport = async () => {
        try {
            const safeName = (supplier?.name || "supplier").replace(/[^\w -]/g, "").trim() || "supplier";
            saveAs(await exportSupplierStatementExcel(id, filters()), `statement_${safeName}.xlsx`);
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    if (loading) return <div className="p-10 flex justify-center">Loading...</div>;
    if (!supplier) return <div className="p-10 text-center text-destructive">{error}</div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold truncate">{supplier.name}</h1>
                        <p className="text-sm text-muted-foreground truncate">Supplier account and statement</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    {can("app.change_supplier") && (
                        <Button variant="outline" onClick={() => navigate(`/supplier/${id}`)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit supplier
                        </Button>
                    )}
                    {can("app.add_supplierbill") && (
                        <Button variant="outline" onClick={() => navigate(`/supplier-bill/new?supplier=${id}`)}>
                            <Plus className="h-4 w-4 mr-2" /> New Bill
                        </Button>
                    )}
                    {can("app.add_supplierpayment") && (
                        <Button onClick={() => navigate(`/supplier-payment/new?supplier=${id}`)}>
                            <HandCoins className="h-4 w-4 mr-2" /> Record Payment
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
                {/* Balance per currency */}
                {balances.length === 0 ? (
                    <div className="bg-card p-6 rounded-lg border shadow-sm text-sm text-muted-foreground">
                        Nothing owed to this supplier and no credit on account.
                    </div>
                ) : balances.map((b) => {
                    const net = Number(b.open_balance) - Number(b.unapplied_credit);
                    return (
                        <div key={b.currency} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Tile label={`Owed (${b.currency})`} value={money(b.currency, b.open_balance)} hint={`${b.open_bills} open bill${b.open_bills === 1 ? "" : "s"}`} />
                            <Tile
                                label="Overdue"
                                value={money(b.currency, b.overdue_balance)}
                                hint={`${b.overdue_bills} bill${b.overdue_bills === 1 ? "" : "s"}`}
                                tone={Number(b.overdue_balance) > 0 ? "text-destructive" : ""}
                            />
                            <Tile label="Credit on account" value={money(b.currency, b.unapplied_credit)} hint="Paid ahead, not yet applied" />
                            <Tile
                                label="Net balance"
                                value={money(b.currency, Math.abs(net))}
                                hint={net < 0 ? "Supplier owes us (credit)" : "We owe the supplier"}
                                tone={net < 0 ? "text-secondary-text" : ""}
                            />
                        </div>
                    );
                })}

                {/* Open bills */}
                <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Open bills</h3>
                    {openBills.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No open bills.</p>
                    ) : (
                        <ul className="space-y-2">
                            {openBills.map((bill) => {
                                const status = BILL_STATUS[bill.status] || BILL_STATUS.open;
                                return (
                                    <li key={bill.id}>
                                        <Link
                                            to={`/supplier-bill/${bill.id}`}
                                            className="flex items-center justify-between gap-3 p-3 rounded-md border bg-background hover:bg-muted/40"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {bill.bill_number ? `#${bill.bill_number}` : bill.reference}
                                                </p>
                                                <p className={`text-xs ${bill.is_overdue ? "text-destructive" : "text-muted-foreground"}`}>
                                                    Due {formatDate(bill.due_date)}{bill.is_overdue && ` · ${bill.days_overdue}d overdue`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <Badge variant={status.variant} className="hidden sm:inline-flex">{status.label}</Badge>
                                                <span className="text-sm font-semibold">{money(bill.currency, bill.balance_due)}</span>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Statement */}
                <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-2">
                        <h3 className="font-medium text-lg">Statement</h3>
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
                            <Button size="sm" variant="outline" onClick={handleExport}>
                                <Download className="h-4 w-4 mr-1" /> Excel
                            </Button>
                        </div>
                    </div>

                    {loadingStatement ? (
                        <div className="h-24 rounded-md animate-pulse bg-muted" />
                    ) : statement.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No bills or payments recorded for this supplier.</p>
                    ) : statement.map((section) => (
                        <StatementSection key={section.currency} section={section} dateFrom={dateFrom} dateTo={dateTo} />
                    ))}
                    <p className="text-xs text-muted-foreground">
                        Bills add to the balance and payments reduce it. Draft and void documents are left out.
                    </p>
                </div>
            </div>
        </div>
    );
};

const Tile = ({ label, value, hint, tone = "" }) => (
    <div className="rounded-lg p-4 bg-card border border-border">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-muted-foreground">{label}</p>
        <p className={`text-lg sm:text-xl font-bold ${tone || "text-foreground"}`}>{value}</p>
        {hint && <p className="text-xs mt-1 text-muted-foreground">{hint}</p>}
    </div>
);

const StatementSection = ({ section, dateFrom, dateTo }) => {
    const { currency } = section;
    const amount = (v) => (Number(v) ? money(currency, v) : "");
    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold">{currency}</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                    <thead>
                        <tr className="text-left text-muted-foreground border-b">
                            <th className="py-2 pr-2 font-medium">Date</th>
                            <th className="py-2 px-2 font-medium">Document</th>
                            <th className="py-2 px-2 font-medium">Description</th>
                            <th className="py-2 px-2 font-medium text-right">Charges</th>
                            <th className="py-2 px-2 font-medium text-right">Payments</th>
                            <th className="py-2 pl-2 font-medium text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b bg-muted/30">
                            <td className="py-2 pr-2">{dateFrom ? formatDate(dateFrom) : ""}</td>
                            <td className="py-2 px-2" colSpan={4}>Opening balance</td>
                            <td className="py-2 pl-2 text-right font-medium">{money(currency, section.opening_balance)}</td>
                        </tr>
                        {section.entries.map((e) => (
                            <tr key={`${e.type}-${e.id}`} className="border-b">
                                <td className="py-2 pr-2 whitespace-nowrap">{formatDate(e.date)}</td>
                                <td className="py-2 px-2">
                                    <Link
                                        to={e.type === "bill" ? `/supplier-bill/${e.id}` : `/supplier-payment/${e.id}`}
                                        className="underline"
                                    >
                                        {e.document}
                                    </Link>
                                    {e.supplier_document && <p className="text-xs text-muted-foreground">{e.supplier_document}</p>}
                                </td>
                                <td className="py-2 px-2">{e.description}</td>
                                <td className="py-2 px-2 text-right whitespace-nowrap">{amount(e.debit)}</td>
                                <td className="py-2 px-2 text-right whitespace-nowrap text-secondary-text">{amount(e.credit)}</td>
                                <td className="py-2 pl-2 text-right whitespace-nowrap">{money(currency, e.balance)}</td>
                            </tr>
                        ))}
                        {section.entries.length === 0 && (
                            <tr className="border-b">
                                <td colSpan={6} className="py-3 text-center text-muted-foreground italic">No movements in this period.</td>
                            </tr>
                        )}
                        <tr className="font-semibold">
                            <td className="py-2 pr-2">{dateTo ? formatDate(dateTo) : ""}</td>
                            <td className="py-2 px-2" colSpan={4}>Closing balance</td>
                            <td className="py-2 pl-2 text-right">{money(currency, section.closing_balance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
