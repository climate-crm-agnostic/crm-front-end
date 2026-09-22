import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus, Search, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { getServices, deleteService, getServiceAttributes, importServicesFromExcel } from "../services/serviceService";
import { getClients } from "../services/clientService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AttributeValueCell } from "../components/attributes/AttributeValueCell";
import { buildFilterParams } from "../utils/attributeFilters";
import { AttributeFilterBar } from "../components/attributes/AttributeFilterBar";
import Swal from "sweetalert2";

const IMPORT_FIXED_FIELDS = [
    { name: 'name',   label: 'Name',   required: true },
    { name: 'status', label: 'Status', required: false, hint: 'active / paused / cancelled' },
];

export const Service = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [attributes, setAttributes] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState("");
    const [contactFilter, setContactFilter] = useState("");
    // Filter-bar rows; applied on demand, since this page searches on a button.
    const [filterRows, setFilterRows] = useState([]);
    const navigate = useNavigate();

    const availableContactTypes = React.useMemo(
        () => Array.from(new Set(attributes.filter(a => a.type === 'email' || a.type === 'phone').map(a => a.type))),
        [attributes]
    );

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importClientId, setImportClientId] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    const staticColumns = [
        { key: "name", label: "Name" },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [attributesData, clientsData] = await Promise.all([
                getServiceAttributes(),
                getClients()
            ]);

            setAttributes(attributesData);
            setClients(clientsData);

            // Dynamic columns from attributes
            const dynamicColumns = attributesData.map(attr => ({
                key: attr.name,
                label: attr.label,
                render: (value) => <AttributeValueCell attr={attr} value={value} />,
            }));

            setColumns([...staticColumns, ...dynamicColumns]);
        } catch (error) {
            console.error("Error fetching initial data", error);
        }
    };

    const handleSearch = async () => {
        if (!selectedClient) {
            Swal.fire('Info', 'Please select a client to search.', 'info');
            return;
        }

        setLoading(true);
        try {
            const servicesData = await getServices({
                client: selectedClient,
                ...(contactFilter ? { has_attribute_type: contactFilter } : {}),
                ...buildFilterParams(filterRows),
            });

            // Flatten data for table
            const processedServices = servicesData.map(service => ({
                ...service,
                client_name: service.client ? (service.client.name || service.client) : "",
                // Flatten dynamic attributes
                ...(service.attributes || {})
            }));

            setServices(processedServices);
        } catch (error) {
            console.error("Error fetching services", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        // Re-use search if a client is selected, otherwise do nothing or handle accordingly
        if (selectedClient) {
            handleSearch();
        }
    };

    const handleEdit = (service) => {
        navigate(`/service/${service.id}`);
    };

    const handleDelete = async (service) => {
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
                await deleteService(service.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Service has been deleted.',
                    'success'
                );
            } catch (error) {
                console.error("Error deleting service", error);
                Swal.fire(
                    'Error!',
                    'There was an error deleting the service.',
                    'error'
                );
            }
        }
    };

    const handleViewFollowup = (service) => {
        navigate(`/followup?service_id=${service.id}&service_name=${encodeURIComponent(service.name)}`);
    };

    const openImportModal = () => {
        setImportResult(null);
        setSelectedFile(null);
        setImportClientId('');
        setClientSearch('');
        setShowImportModal(true);
    };

    const closeImportModal = () => {
        if (importing) return;
        setShowImportModal(false);
        setImportResult(null);
        setSelectedFile(null);
        setImportClientId('');
        setClientSearch('');
    };

    const handleImport = async () => {
        if (!importClientId || !selectedFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const result = await importServicesFromExcel(importClientId, selectedFile);
            setImportResult(result);
            if (result.created > 0) fetchData();
        } catch (error) {
            Swal.fire('Import failed', error.message, 'error');
        } finally {
            setImporting(false);
        }
    };

    const filteredImportClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    const allImportFields = [
        ...IMPORT_FIXED_FIELDS,
        ...attributes.map(a => ({ name: a.name, label: a.label, required: a.is_required })),
    ];

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex flex-wrap items-center gap-2 mb-2 ml-2">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger
                        className="w-full sm:w-[200px]"
                        style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif', fontSize: "14px" }}
                    >
                        <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map(client => (
                            <SelectItem key={client.id} value={String(client.id)}>
                                {client.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {availableContactTypes.length > 0 && (
                    <select
                        value={contactFilter}
                        onChange={(e) => setContactFilter(e.target.value)}
                        className="h-9 text-sm border rounded-md px-2 bg-background"
                        style={{ border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                        <option value="">All services</option>
                        {availableContactTypes.includes('email') && <option value="email">Has Email</option>}
                        {availableContactTypes.includes('phone') && <option value="phone">Has Phone</option>}
                    </select>
                )}
                <AttributeFilterBar
                    attributes={attributes}
                    rows={filterRows}
                    onChange={setFilterRows}
                    onApply={() => selectedClient && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    disabled={!selectedClient || loading}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", opacity: (!selectedClient || loading) ? 0.5 : 1 }}
                    onMouseEnter={e => (!selectedClient && !loading) && (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--secondary) 80%, black)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--secondary)")}
                >
                    <Search className="h-4 w-4" /> Search
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
                <button
                    onClick={() => navigate("/service/new", { state: { clientId: selectedClient } })}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--secondary) 80%, black)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--secondary)"}
                >
                    <Plus className="h-4 w-4" /> Add Service
                </button>
            </div>

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <Table
                    data={services}
                    columns={columns}
                    onEdit={handleEdit}
                    onAskDelete={handleDelete}
                    verSeguimiento={handleViewFollowup}
                    searchable={true}
                />
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background rounded-xl shadow-2xl w-full max-w-[680px] max-h-[88vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold text-secondary-text">Import Services from Excel</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Select a client and upload your .xlsx file</p>
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
                                    {allImportFields.map(f => (
                                        <span key={f.name} className="flex items-center gap-1 bg-muted rounded px-2 py-0.5 text-xs font-mono text-foreground">
                                            {f.name}
                                            {f.required && <span className="text-red-500 font-sans font-semibold">*</span>}
                                            {f.hint && <span className="text-muted-foreground font-sans normal-case ml-1">({f.hint})</span>}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    <span className="text-red-500 font-semibold">*</span> required &nbsp;·&nbsp; Column headers must match exactly.
                                </p>
                            </div>

                            {/* Client selector */}
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">
                                    Select Client <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">All services in the file will be assigned to this client.</p>
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-secondary-text"
                                />
                                <div className="border border-border rounded-lg max-h-36 overflow-y-auto">
                                    {filteredImportClients.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-3">No clients found</p>
                                    ) : filteredImportClients.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setImportClientId(c.id)}
                                            className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
                                                importClientId === c.id
                                                    ? 'bg-[var(--secondary)] text-white'
                                                    : 'hover:bg-muted text-foreground'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
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
                                            {importResult.created} service(s) created successfully
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
                                disabled={!importClientId || !selectedFile || importing}
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
