import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RowActions } from "../components/Table";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { DateInput } from "../components/ui/date-input";
import { Plus, Download } from "lucide-react";
import { getInvoices, deleteInvoice, exportInvoicesExcel } from "../services/invoiceService";
import { getClients } from "../services/clientService";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { Badge } from "../components/ui/badge";

const STATUS_COLORS = {
    paid: "var(--primary)",
    pending: "var(--muted-foreground)",
    overdue: "var(--destructive)",
};

const STATUS_TABS = [
    { value: "all", label: "All" },
    { value: "paid", label: "Paid", color: STATUS_COLORS.paid, match: (row) => row.status === "paid" },
    {
        value: "pending",
        label: "Pending",
        color: STATUS_COLORS.pending,
        match: (row) => ["draft", "sent", "void", "refunded"].includes(row.status),
    },
    { value: "overdue", label: "Overdue", color: STATUS_COLORS.overdue, match: (row) => row.status === "overdue" },
];

const money = (currency, value) => `${currency || "USD"} ${Number(value || 0).toFixed(2)}`;

export const Invoice = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const navigate = useNavigate();

    // Filters by issue_date (ISO "yyyy-mm-dd" strings sort/compare lexicographically).
    const dateFilteredInvoices = useMemo(() => {
        if (!dateFrom && !dateTo) return invoices;
        return invoices.filter((inv) => {
            if (!inv.issue_date) return false;
            if (dateFrom && inv.issue_date < dateFrom) return false;
            if (dateTo && inv.issue_date > dateTo) return false;
            return true;
        });
    }, [invoices, dateFrom, dateTo]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'default';
            case 'sent': return 'secondary';
            case 'overdue': return 'destructive';
            case 'draft': return 'outline';
            default: return 'secondary';
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [invoicesData, clientsData] = await Promise.all([
                getInvoices(),
                getClients()
            ]);

            const cMap = {};
            (clientsData || []).forEach(c => { cMap[String(c.id)] = c.name; });

            const getClientName = (client) => {
                if (!client) return "";
                if (typeof client === 'object') return client.name || "";
                return cMap[String(client)] || "";
            };

            const processedInvoices = invoicesData.map(invoice => ({
                ...invoice,
                ...(invoice.attributes || {}),
                client_name: getClientName(invoice.client),
            }));
            setInvoices(processedInvoices);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (invoice) => {
        navigate(`/invoice/${invoice.id}`);
    };

    const handleDelete = async (invoice) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteInvoice(invoice.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Invoice has been deleted.',
                    'success'
                );
            } catch (error) {
                console.error("Error deleting invoice", error);
                Swal.fire(
                    'Error!',
                    'There was an error deleting the invoice.',
                    'error'
                );
            }
        }
    };

    const handleExportExcel = async () => {
        try {
            const blob = await exportInvoicesExcel();
            saveAs(blob, "invoices_report.xlsx");
        } catch (error) {
            console.error("Error exporting invoices", error);
            Swal.fire('Error!', 'There was an error exporting the invoices.', 'error');
        }
    };

    // Sums are only meaningful within one currency; with several in view the
    // tiles say so instead of adding USD to EUR.
    const currencies = new Set(dateFilteredInvoices.map((inv) => inv.currency || "USD"));
    const singleCurrency = currencies.size <= 1 ? ([...currencies][0] || "USD") : null;
    const sumLabel = (field) => {
        if (!singleCurrency) return "Mixed";
        const total = dateFilteredInvoices.reduce((sum, inv) => sum + (Number(inv[field]) || 0), 0);
        return `${singleCurrency} ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };
    const overdueCount = dateFilteredInvoices.filter((inv) => inv.status === "overdue").length;

    const stats = [
        { label: "Total invoiced", value: sumLabel("total") },
        { label: "Outstanding", value: sumLabel("balance_due") },
        { label: "Overdue", value: `${overdueCount} invoice${overdueCount === 1 ? "" : "s"}` },
    ];

    const renderInvoiceCard = (invoice) => {
        const balance = Number(invoice.balance_due) || 0;
        const partiallyPaid = balance > 0 && balance !== Number(invoice.total);
        return (
            <div className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors bg-background border border-border">
                <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(invoice)}>
                    <p className="text-sm font-semibold truncate text-foreground">{invoice.client_name || "—"}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{invoice.invoice_number}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <Badge variant={getStatusColor(invoice.status)} className="capitalize">{invoice.status}</Badge>
                    <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{money(invoice.currency, invoice.total)}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                            Due {invoice.due_date || "—"}
                            {partiallyPaid && ` · Balance ${money(invoice.currency, balance)}`}
                        </p>
                    </div>
                    <RowActions row={invoice} onEdit={handleEdit} onAskDelete={handleDelete} />
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Invoices
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your invoices and track payments.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "var(--card)", border: "1px solid var(--secondary-text)", color: "var(--secondary-text)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(37,91,1,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--card)"}
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <Button onClick={() => navigate("/invoice/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Create Invoice
                    </Button>
                </div>
            </div>

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={dateFilteredInvoices}
                    stats={stats}
                    statusTabs={STATUS_TABS}
                    renderCard={renderInvoiceCard}
                    searchKeys={["invoice_number", "status", "client_name"]}
                    loading={loading}
                    emptyLabel="No invoices yet."
                    headerActions={
                        <div className="flex flex-wrap items-center gap-2">
                            <DateInput
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="From"
                                className="w-[130px]"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <DateInput
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                placeholder="To"
                                className="w-[130px]"
                            />
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
