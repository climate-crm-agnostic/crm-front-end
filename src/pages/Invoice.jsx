import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus, Download } from "lucide-react";
import { getInvoices, deleteInvoice, getInvoiceAttributes, exportInvoicesExcel } from "../services/invoiceService";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { Badge } from "../components/ui/badge";

export const Invoice = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

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
            key: "client",
            label: "Client",
            render: (value) => value && typeof value === 'object' ? value.name : value
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
            const [invoicesData, attributesData] = await Promise.all([
                getInvoices(),
                getInvoiceAttributes()
            ]);

            const processedInvoices = invoicesData.map(invoice => ({
                ...invoice,
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

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Invoices
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your invoices and track payments.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "#F2EBDD", border: "1px solid #5E6A43", color: "#5E6A43" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <Button onClick={() => navigate("/invoice/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Create Invoice
                    </Button>
                </div>
            </div>

            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <Table
                    data={invoices}
                    columns={columns}
                    onEdit={handleEdit}
                    onAskDelete={handleDelete}
                    searchable={true}
                />
            </div>
        </div>
    );
};
