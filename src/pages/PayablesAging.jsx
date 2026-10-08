import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { saveAs } from "file-saver";
import { Download } from "lucide-react";

import { Button } from "../components/ui/button";
import { DateInput } from "../components/ui/date-input";
import { SearchableSelect } from "../components/ui/searchable-select";
import { formatDate } from "../utils/date";
import { getSuppliers } from "../services/supplierService";
import { exportPayablesAgingExcel, getPayablesAging } from "../services/payablesService";
import { Swal, money, today } from "../components/payables/payablesUi";
import { HelpNote } from "../components/payables/HelpNote";
import { usePagination } from "../hooks/usePagination";
import { PageSizeSelect, PaginationFooter } from "../components/PaginationControls";

// Days past due, as the backend buckets them (app/payables/services.py).
const BUCKETS = [
    { key: "current", label: "Not due yet", overdue: false },
    { key: "1_30", label: "1–30 days", overdue: true },
    { key: "31_60", label: "31–60 days", overdue: true },
    { key: "61_90", label: "61–90 days", overdue: true },
    { key: "over_90", label: "90+ days", overdue: true },
];

export const PayablesAging = () => {
    const [asOf, setAsOf] = useState(today());
    const [supplierId, setSupplierId] = useState("");
    const [suppliers, setSuppliers] = useState([]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
    }, []);

    const filters = () => ({
        ...(asOf && { as_of: asOf }),
        ...(supplierId && { supplier: supplierId }),
    });

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                setReport(await getPayablesAging(filters()));
            } catch (err) {
                Swal.fire("Error", err.message, "error");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [asOf, supplierId]);

    const handleExport = async () => {
        try {
            saveAs(await exportPayablesAgingExcel(filters()), `payables_aging_${asOf || today()}.xlsx`);
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const supplierOptions = useMemo(() => suppliers.map((s) => ({ value: String(s.id), label: s.name })), [suppliers]);
    const rows = useMemo(() => report?.rows || [], [report]);
    // Rows are supplier × currency, grouped by currency and largest balance
    // first within each (backend order), so the first page shows who is owed most.
    const {
        pageItems, currentPage, setCurrentPage, pageSize, setPageSize, pageSizeOptions,
        totalPages, startRecord, endRecord,
    } = usePagination(rows, { pageSizeOptions: [10, 25, 50] });
    const totals = report?.totals || [];

    return (
        <div className="h-full flex flex-col p-2 w-full gap-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Payables Aging</h1>
                    <p className="text-sm text-muted-foreground">
                        What is owed to suppliers, grouped by how long it has been past due.
                    </p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>

            <HelpNote id="aging" items={[
                <>Shows every open balance by how many days it is past its due date, as of the date you pick.</>,
                <><b>Not due yet</b> is money owed that isn't due. The other columns are overdue — the older, the more urgent.</>,
                <>Amounts are each bill's current balance (after payments). Click a supplier to see their account and statement.</>,
            ]} />
            <div className="bg-card p-4 rounded-lg shadow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">As of</span>
                        <DateInput value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-[140px]" />
                    </div>
                    <div className="w-full sm:w-72">
                        <SearchableSelect value={supplierId} onChange={(v) => setSupplierId(v || "")} options={supplierOptions} placeholder="All suppliers" />
                    </div>
                    <div className="sm:ml-auto">
                        <PageSizeSelect pageSize={pageSize} setPageSize={setPageSize} pageSizeOptions={pageSizeOptions} />
                    </div>
                </div>

                {/* One summary strip per currency */}
                {totals.map((t) => (
                    <div key={t.currency} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {BUCKETS.map((b) => (
                            <div key={b.key} className="rounded-lg p-3 bg-background border border-border">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{b.label}</p>
                                <p className={`text-base font-bold ${b.overdue && Number(t[b.key]) > 0 ? "text-destructive" : "text-foreground"}`}>
                                    {money(t.currency, t[b.key])}
                                </p>
                            </div>
                        ))}
                        <div className="rounded-lg p-3 bg-muted border border-border">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total {t.currency}</p>
                            <p className="text-base font-bold text-foreground">{money(t.currency, t.total)}</p>
                        </div>
                    </div>
                ))}

                {loading ? (
                    <div className="h-24 rounded-md animate-pulse bg-muted" />
                ) : rows.length === 0 ? (
                    <div className="rounded-lg p-8 text-center text-sm text-muted-foreground border border-border bg-background">
                        Nothing owed to suppliers as of {formatDate(asOf || today())}.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                            <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                    <th className="py-2 pr-2 font-medium">Supplier</th>
                                    {BUCKETS.map((b) => (
                                        <th key={b.key} className="py-2 px-2 font-medium text-right">{b.label}</th>
                                    ))}
                                    <th className="py-2 pl-2 font-medium text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((r) => (
                                    <tr key={`${r.supplier}-${r.currency}`} className="border-b last:border-0">
                                        <td className="py-2 pr-2">
                                            <Link to={`/supplier/${r.supplier}/account`} className="font-medium underline">{r.supplier_name}</Link>
                                            <span className="ml-2 text-xs text-muted-foreground">{r.currency}</span>
                                        </td>
                                        {BUCKETS.map((b) => {
                                            const v = Number(r[b.key]);
                                            return (
                                                <td
                                                    key={b.key}
                                                    className={`py-2 px-2 text-right whitespace-nowrap ${v > 0 && b.overdue ? "text-destructive font-medium" : v > 0 ? "" : "text-muted-foreground"}`}
                                                >
                                                    {v > 0 ? money(r.currency, v) : "—"}
                                                </td>
                                            );
                                        })}
                                        <td className="py-2 pl-2 text-right font-semibold whitespace-nowrap">{money(r.currency, r.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {rows.length > 0 && (
                    <PaginationFooter
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                        startRecord={startRecord}
                        endRecord={endRecord}
                        bordered={false}
                    />
                )}
                <p className="text-xs text-muted-foreground">
                    Uses each bill's current balance; changing the date only moves the point the days past due are counted from.
                </p>
            </div>
        </div>
    );
};
