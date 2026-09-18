import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { DateInput } from "../components/ui/date-input";
import { Plus, Download, MoreHorizontal, SquarePen, OctagonX } from "lucide-react";
import { getInvoices, deleteInvoice, getInvoiceAttributes, exportInvoicesExcel } from "../services/invoiceService";
import { getClients } from "../services/clientService";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { Badge } from "../components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../components/ui/dropdown-menu";

const STATUS_COLORS = {
    paid: "var(--primary)",
    pending: "var(--border)",
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

export const Invoice = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
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

    const staticColumns = [
        { key: "invoice_number", label: "Invoice #" },
        {
            key: "client_name",
            label: "Client",
        },
        {
            key: "status",
            label: "Status",
            render: (value) => (
                <Badge variant={getStatusColor(value)} className="capitalize">
                    {value}
                </Badge>
            )
        },
        {
            key: "total",
            label: "Total",
            render: (value, row) => `${row.currency || 'USD'} ${Number(value).toFixed(2)}`
        },
        {
            key: "balance_due",
            label: "Balance Due",
            render: (value, row) => `${row.currency || 'USD'} ${Number(value).toFixed(2)}`
        },
        { key: "due_date", label: "Due Date" },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [invoicesData, attributesData, clientsData] = await Promise.all([
                getInvoices(),
                getInvoiceAttributes(),
                getClients(),
            ]);

            // `client` on an invoice is just the client's id (a plain string),
            // never a nested object — resolve the display name ourselves.
            const clientsById = {};
            (clientsData || []).forEach((c) => { clientsById[String(c.id)] = c.name; });

            const processedInvoices = invoicesData.map(invoice => ({
                ...invoice,
                client_name: clientsById[String(invoice.client)] || "",
                ...(invoice.attributes || {})
            }));
            setInvoices(processedInvoices);
            setAttributes(attributesData);

            // Dynamic columns from attributes
            const dynamicColumns = attributesData.map(attr => ({
                key: attr.name,
                label: attr.label
            }));

            setColumns([...staticColumns, ...dynamicColumns]);

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
            confirmButtonColor: 'var(--secondary)',
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

    const totalInvoiced = dateFilteredInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const outstanding = dateFilteredInvoices.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0);
    const overdueCount = dateFilteredInvoices.filter((inv) => inv.status === "overdue").length;

    const stats = [
        { label: "Total invoiced", value: `$${totalInvoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: "Outstanding", value: `$${outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: "Overdue", value: `${overdueCount} invoice${overdueCount === 1 ? "" : "s"}` },
    ];

    const renderInvoiceCard = (invoice) => {
        const clientName = invoice.client_name;
        return (
            <div className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors bg-background border border-border">
                <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(invoice)}>
                    <p className="text-sm font-semibold truncate text-foreground">{clientName || "—"}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{invoice.invoice_number}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <Badge variant={getStatusColor(invoice.status)} className="capitalize">{invoice.status}</Badge>
                    <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                            {invoice.currency || "USD"} {Number(invoice.total).toFixed(2)}
                        </p>
                        <p className="text-xs mt-0.5 text-muted-foreground">Due {invoice.due_date}</p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer text-muted-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                <SquarePen className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:text-destructive focus:text-destructive" onClick={() => handleDelete(invoice)}>
                                <OctagonX className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Invoices
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your invoices and track payments.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer bg-card"
                        style={{ border: "1px solid var(--secondary)", color: "var(--secondary)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ""}
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
                    statusField="status"
                    statusTabs={STATUS_TABS}
                    renderCard={renderInvoiceCard}
                    searchKeys={["invoice_number", "status", "client_name"]}
                    loading={loading}
                    emptyLabel="No invoices yet."
                    headerActions={
                        <div className="flex items-center gap-2">
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
