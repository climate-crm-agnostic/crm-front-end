import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RowActions } from "../components/Table";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Plus, Download, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { getClients, deleteClient, getClientAttributes, importClientsFromExcel, exportClientsExcel } from "../services/clientService";
import { formatAttributeValue } from "../utils/attributeTypes";
import { buildFilterParams } from "../utils/attributeFilters";
import { AttributeFilterBar } from "../components/attributes/AttributeFilterBar";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

// Magnitude bars, one colour per row. Each must read against the bg-border
// track in both themes, so --border itself is not in the list.
const BREAKDOWN_COLORS = ["var(--primary)", "var(--secondary-text)", "var(--muted-foreground)"];

// Groups clients by whatever dropdown-type ("list") attributes this tenant
// actually has configured — Region/Category on one instance, Program/Status
// on another — rather than hardcoding field names that only fit one vertical.
const AttributeBreakdown = ({ label, counts }) => {
    const max = Math.max(1, ...counts.map((c) => c.count));
    return (
        <div className="rounded-lg p-4 space-y-2.5 bg-card border border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">By {label}</p>
            {counts.map((c, i) => (
                <div key={c.value}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate text-foreground">{c.label}</span>
                        <span className="text-sm font-semibold shrink-0 ml-2 text-muted-foreground">{c.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-border">
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

    const [contactFilter, setContactFilter] = useState("");
    const availableContactTypes = React.useMemo(
        () => Array.from(new Set(attributes.filter(a => a.type === 'email' || a.type === 'phone').map(a => a.type))),
        [attributes]
    );

    // Rows the filter bar is editing, and the set actually applied — kept
    // apart so typing in a row does not fire a request per keystroke.
    const [filterRows, setFilterRows] = useState([]);
    const [appliedFilters, setAppliedFilters] = useState({});

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contactFilter, appliedFilters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsData, attributesData] = await Promise.all([
                getClients({
                    ...(contactFilter ? { has_attribute_type: contactFilter } : {}),
                    ...appliedFilters,
                }),
                getClientAttributes()
            ]);
            const processedClients = clientsData.map(client => ({
                ...client,
                ...(client.attributes || {})
            }));
            setClients(processedClients);
            setAttributes(attributesData);
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

    // Up to two dropdown-type attributes, each rendered as a breakdown and
    // used as the card subtitle.
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
                counts: Object.entries(counts)
                    .map(([value, count]) => ({ value, count, label: formatAttributeValue(attr, value) || value }))
                    .sort((a, b) => b.count - a.count),
            };
        })
        .filter(b => b.counts.length > 0);

    const renderClientCard = (client) => {
        const subtitle = groupableAttrs
            .map(a => formatAttributeValue(a, client[a.name]))
            .filter(Boolean)
            .join(" · ");
        return (
            <div className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors bg-background border border-border">
                <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(client)}>
                    <p className="text-sm font-semibold truncate text-foreground">{client.name}</p>
                    {subtitle && <p className="text-xs mt-0.5 truncate text-muted-foreground">{subtitle}</p>}
                </div>
                <RowActions row={client} onEdit={handleEdit} onAskDelete={handleDelete} />
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Clients
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your clients and view their details.
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
                    <button
                        onClick={openImportModal}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "var(--card)", border: "1px solid var(--secondary-text)", color: "var(--secondary-text)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(37,91,1,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--card)"}
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

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                {availableContactTypes.length > 0 && (
                    <div className="flex items-center gap-2 px-1 pb-2">
                        <label htmlFor="client-contact-filter" className="text-xs font-medium text-muted-foreground">Filter:</label>
                        <select
                            id="client-contact-filter"
                            value={contactFilter}
                            onChange={(e) => setContactFilter(e.target.value)}
                            className="h-8 text-sm border rounded-md px-2 bg-background"
                        >
                            <option value="">All clients</option>
                            {availableContactTypes.includes('email') && <option value="email">Has Email</option>}
                            {availableContactTypes.includes('phone') && <option value="phone">Has Phone</option>}
                        </select>
                    </div>
                )}
                <div className="px-1 pb-2">
                    <AttributeFilterBar
                        attributes={attributes}
                        rows={filterRows}
                        onChange={setFilterRows}
                        onApply={(rows) => setAppliedFilters(buildFilterParams(rows))}
                    />
                </div>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background rounded-xl shadow-2xl w-full max-w-[680px] max-h-[88vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold text-secondary-text">Import Clients from Excel</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Upload your .xlsx file to bulk import clients</p>
                            </div>
                            <button onClick={closeImportModal} className="text-muted-foreground hover:text-gray-600 cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

                            {/* Expected columns */}
                            <div>
                                <p className="text-sm font-semibold text-foreground mb-2">Expected Excel columns:</p>
                                <div className="flex flex-wrap gap-2">
                                    {allFields.map(f => (
                                        <span key={f.name} className="flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs font-mono text-foreground">
                                            {f.name}
                                            {f.required && <span className="text-red-500 font-sans font-semibold">*</span>}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    <span className="text-red-500 font-semibold">*</span> required &nbsp;·&nbsp; Column headers must match exactly.
                                </p>
                            </div>

                            {/* File upload */}
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">
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
                                    className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-secondary-text transition-colors"
                                >
                                    {selectedFile ? (
                                        <p className="text-sm text-secondary-text font-medium">{selectedFile.name}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Click to select a file</p>
                                    )}
                                </div>
                            </div>

                            {/* Results */}
                            {importResult && (
                                <div className="rounded-lg border border-border overflow-hidden">
                                    <div className={`px-4 py-3 flex items-center gap-2 ${importResult.created > 0 ? 'bg-green-50 dark:bg-green-500/15' : 'bg-yellow-50 dark:bg-yellow-500/15'}`}>
                                        {importResult.created > 0
                                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                                            : <AlertCircle className="h-4 w-4 text-yellow-600" />
                                        }
                                        <span className="text-sm font-semibold text-foreground">
                                            {importResult.created} client(s) created successfully
                                            {importResult.errors.length > 0 && `, ${importResult.errors.length} row(s) skipped`}
                                        </span>
                                    </div>
                                    {importResult.errors.length > 0 && (
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted border-t border-border">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground w-16">Row</th>
                                                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importResult.errors.map((err, i) => (
                                                    <tr key={i} className="border-t border-border">
                                                        <td className="px-4 py-2 text-red-500 font-medium">{err.row}</td>
                                                        <td className="px-4 py-2 text-muted-foreground">{err.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={closeImportModal}
                                disabled={importing}
                                className="h-9 px-4 rounded-lg text-sm font-semibold text-muted-foreground border border-border hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {importResult ? 'Close' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!selectedFile || importing}
                                className="h-9 px-5 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: "var(--secondary)" }}
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
