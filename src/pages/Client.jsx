import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Plus, Download, Upload, X, CheckCircle, AlertCircle, MoreHorizontal, SquarePen, OctagonX } from "lucide-react";
import { getClients, deleteClient, getClientAttributes, importClientsFromExcel, exportClientsExcel } from "../services/clientService";
import { saveAs } from "file-saver";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import Swal from "sweetalert2";

const BREAKDOWN_COLORS = ["#B8C76A", "#F29B6B", "#5E6A43", "#D8D2C4", "#9b948e", "#8f9a3e"];

// Groups clients by whatever dropdown-type ("list") attributes this tenant
// actually has configured — Region/Category on one instance, Program/Status
// on another — rather than hardcoding field names that only fit one vertical.
const AttributeBreakdown = ({ label, counts }) => {
    const max = Math.max(1, ...counts.map((c) => c.count));
    return (
        <div className="rounded-lg p-4 space-y-2.5" style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9b948e" }}>By {label}</p>
            {counts.map((c, i) => (
                <div key={c.value}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate" style={{ color: "#2E2A26" }}>{c.value}</span>
                        <span className="text-sm font-semibold shrink-0 ml-2" style={{ color: "#6b6560" }}>{c.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#E8E3DA" }}>
                        <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const Client = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    const staticColumns = [
        { key: "name", label: "Name" },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsData, attributesData] = await Promise.all([
                getClients(),
                getClientAttributes()
            ]);
            const processedClients = clientsData.map(client => ({
                ...client,
                ...(client.attributes || {})
            }));
            setClients(processedClients);
            setAttributes(attributesData);

            // Dynamic columns from attributes
            const dynamicColumns = attributesData.map(attr => ({
                key: attr.name, // The backend key/name for the attribute
                label: attr.label
            }));

            setColumns([...staticColumns, ...dynamicColumns]);

        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (client) => {
        navigate(`/client/${client.id}`);
    };

    const handleDelete = async (client) => {
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
                await deleteClient(client.id);
                fetchData(); // Refresh both to be safe, though just clients is enough
                Swal.fire(
                    'Deleted!',
                    'Client has been deleted.',
                    'success'
                );
            } catch (error) {
                console.error("Error deleting client", error);
                Swal.fire(
                    'Error!',
                    'There was an error deleting the client.',
                    'error'
                );
            }
        }
    };

    const handleExportExcel = async () => {
        try {
            const blob = await exportClientsExcel();
            saveAs(blob, "clients_report.xlsx");
        } catch (error) {
            console.error("Error exporting clients", error);
            Swal.fire('Error!', 'There was an error exporting the clients.', 'error');
        }
    };

    const openImportModal = () => {
        setImportResult(null);
        setSelectedFile(null);
        setShowImportModal(true);
    };

    const closeImportModal = () => {
        if (importing) return;
        setShowImportModal(false);
        setImportResult(null);
        setSelectedFile(null);
    };

    const handleImport = async () => {
        if (!selectedFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const result = await importClientsFromExcel(selectedFile);
            setImportResult(result);
            if (result.created > 0) fetchData();
        } catch (error) {
            Swal.fire('Import failed', error.message, 'error');
        } finally {
            setImporting(false);
        }
    };

    const allFields = [
        { name: 'name', label: 'Name', required: true },
        ...attributes.map(a => ({ name: a.name, label: a.label, required: a.is_required })),
    ];

    const stats = [
        { label: "Total clients", value: clients.length },
    ];

    // Whichever dropdown-type attributes this tenant has configured for
    // Clients — up to 2, most-populated first.
    const groupableAttrs = attributes.filter(a => a.type === 'list').slice(0, 2);
    const breakdowns = groupableAttrs
        .map(attr => {
            const counts = {};
            clients.forEach(c => {
                const val = c[attr.name];
                if (val === undefined || val === null || val === '') return;
                counts[val] = (counts[val] || 0) + 1;
            });
            return {
                label: attr.label,
                counts: Object.entries(counts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
            };
        })
        .filter(b => b.counts.length > 0);

    const renderClientCard = (client) => {
        const subtitle = groupableAttrs.map(a => client[a.name]).filter(Boolean).join(" · ");
        return (
        <div
            className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors"
            style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4" }}
        >
            <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(client)}>
                <p className="text-sm font-semibold truncate" style={{ color: "#2E2A26" }}>{client.name}</p>
                {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: "#9b948e" }}>{subtitle}</p>}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer" style={{ color: "#6b6560" }}>
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(client)}>
                        <SquarePen className="w-4 h-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:text-destructive focus:text-destructive" onClick={() => handleDelete(client)}>
                        <OctagonX className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Clients
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your clients and view their details.
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
                    <button
                        onClick={openImportModal}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "#F2EBDD", border: "1px solid #5E6A43", color: "#5E6A43" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                    >
                        <Upload className="h-4 w-4" /> Import Excel
                    </button>
                    <Button onClick={() => navigate("/client/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Client
                    </Button>
                </div>
            </div>

            {breakdowns.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 shrink-0">
                    {breakdowns.map((b) => (
                        <AttributeBreakdown key={b.label} label={b.label} counts={b.counts} />
                    ))}
                </div>
            )}

            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={clients}
                    stats={stats}
                    renderCard={renderClientCard}
                    searchKeys={["name"]}
                    loading={loading}
                    emptyLabel="No clients yet."
                />
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl w-[680px] max-h-[88vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-[#5E6A43]">Import Clients from Excel</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Upload your .xlsx file to bulk import clients</p>
                            </div>
                            <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

                            {/* Expected columns */}
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">Expected Excel columns:</p>
                                <div className="flex flex-wrap gap-2">
                                    {allFields.map(f => (
                                        <span key={f.name} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 text-xs font-mono text-gray-700">
                                            {f.name}
                                            {f.required && <span className="text-red-500 font-sans font-semibold">*</span>}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    <span className="text-red-500 font-semibold">*</span> required &nbsp;·&nbsp; Column headers must match exactly.
                                </p>
                            </div>

                            {/* File upload */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Excel File (.xlsx) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx"
                                    onChange={e => { setSelectedFile(e.target.files[0] || null); setImportResult(null); }}
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-[#5E6A43] transition-colors"
                                >
                                    {selectedFile ? (
                                        <p className="text-sm text-[#5E6A43] font-medium">{selectedFile.name}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400">Click to select a file</p>
                                    )}
                                </div>
                            </div>

                            {/* Results */}
                            {importResult && (
                                <div className="rounded-lg border border-gray-200 overflow-hidden">
                                    <div className={`px-4 py-3 flex items-center gap-2 ${importResult.created > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                        {importResult.created > 0
                                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                                            : <AlertCircle className="h-4 w-4 text-yellow-600" />
                                        }
                                        <span className="text-sm font-semibold text-gray-700">
                                            {importResult.created} client(s) created successfully
                                            {importResult.errors.length > 0 && `, ${importResult.errors.length} row(s) skipped`}
                                        </span>
                                    </div>
                                    {importResult.errors.length > 0 && (
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 border-t border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-semibold text-gray-500 w-16">Row</th>
                                                    <th className="px-4 py-2 text-left font-semibold text-gray-500">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importResult.errors.map((err, i) => (
                                                    <tr key={i} className="border-t border-gray-100">
                                                        <td className="px-4 py-2 text-red-500 font-medium">{err.row}</td>
                                                        <td className="px-4 py-2 text-gray-600">{err.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={closeImportModal}
                                disabled={importing}
                                className="h-9 px-4 rounded-lg text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {importResult ? 'Close' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!selectedFile || importing}
                                className="h-9 px-5 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: "#5E6A43" }}
                            >
                                {importing ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
