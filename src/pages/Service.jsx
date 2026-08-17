import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Plus, Search, Upload, X, CheckCircle, AlertCircle, MoreHorizontal, SquarePen, OctagonX, FileInput } from "lucide-react";
import { getServices, deleteService, getServiceAttributes, importServicesFromExcel } from "../services/serviceService";
import { getClients } from "../services/clientService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import Swal from "sweetalert2";

const SERVICE_STATUS_COLORS = {
    active: "#B8C76A",
    paused: "#D8D2C4",
    cancelled: "#F29B6B",
};

const SERVICE_STATUS_TABS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active", color: SERVICE_STATUS_COLORS.active, match: (row) => row.status === "active" },
    { value: "paused", label: "Paused", color: SERVICE_STATUS_COLORS.paused, match: (row) => row.status === "paused" },
    { value: "cancelled", label: "Cancelled", color: SERVICE_STATUS_COLORS.cancelled, match: (row) => row.status === "cancelled" },
];

const serviceBadgeVariant = (status) => {
    switch (status) {
        case "active": return "success";
        case "cancelled": return "destructive";
        default: return "secondary";
    }
};

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
    const navigate = useNavigate();

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
                label: attr.label
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
            const servicesData = await getServices({ client: selectedClient });

            // `client` on a service is just the client's id (a plain string,
            // not a nested object) — every result here is already scoped to
            // selectedClient, so resolve the name from the clients list once.
            const selectedClientName = clients.find((c) => String(c.id) === String(selectedClient))?.name || "";

            // Flatten data for table
            const processedServices = servicesData.map(service => ({
                ...service,
                client_name: selectedClientName,
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

    const activeCount = services.filter((s) => s.status === "active").length;
    const pausedCount = services.filter((s) => s.status === "paused").length;
    const cancelledCount = services.filter((s) => s.status === "cancelled").length;

    const stats = [
        { label: "Total services", value: services.length },
        { label: "Active", value: activeCount },
        { label: "Needs attention", value: pausedCount + cancelledCount },
    ];

    const renderServiceCard = (service) => (
        <div
            className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors"
            style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4" }}
        >
            <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(service)}>
                <p className="text-sm font-semibold truncate" style={{ color: "#2E2A26" }}>{service.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9b948e" }}>{service.client_name || "—"}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <Badge variant={serviceBadgeVariant(service.status)} className="capitalize">{service.status}</Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer" style={{ color: "#6b6560" }}>
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(service)}>
                            <SquarePen className="w-4 h-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewFollowup(service)}>
                            <FileInput className="w-4 h-4" /> View Tracking
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:text-destructive focus:text-destructive" onClick={() => handleDelete(service)}>
                            <OctagonX className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );

    const allImportFields = [
        ...IMPORT_FIXED_FIELDS,
        ...attributes.map(a => ({ name: a.name, label: a.label, required: a.is_required })),
    ];

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex items-center gap-2 mb-2 ml-2">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger
                        className="w-[200px]"
                        style={{ backgroundColor: "#fff", border: "1px solid #D8D2C4", color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif', fontSize: "14px" }}
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
                <button
                    onClick={handleSearch}
                    disabled={!selectedClient || loading}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: "#5E6A43", color: "#FBF7EF", opacity: (!selectedClient || loading) ? 0.5 : 1 }}
                    onMouseEnter={e => (!selectedClient && !loading) && (e.currentTarget.style.backgroundColor = "#4a5535")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#5E6A43")}
                >
                    <Search className="h-4 w-4" /> Search
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
                <button
                    onClick={() => navigate("/service/new", { state: { clientId: selectedClient } })}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4a5535"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "#5E6A43"}
                >
                    <Plus className="h-4 w-4" /> Add Service
                </button>
            </div>

            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={services}
                    stats={stats}
                    statusField="status"
                    statusTabs={SERVICE_STATUS_TABS}
                    renderCard={renderServiceCard}
                    searchKeys={["name", "client_name", "status"]}
                    loading={loading}
                    emptyLabel={selectedClient ? "No services for this client." : "Select a client and search to see services."}
                />
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl w-[680px] max-h-[88vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-[#5E6A43]">Import Services from Excel</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Select a client and upload your .xlsx file</p>
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
                                    {allImportFields.map(f => (
                                        <span key={f.name} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 text-xs font-mono text-gray-700">
                                            {f.name}
                                            {f.required && <span className="text-red-500 font-sans font-semibold">*</span>}
                                            {f.hint && <span className="text-gray-400 font-sans normal-case ml-1">({f.hint})</span>}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    <span className="text-red-500 font-semibold">*</span> required &nbsp;·&nbsp; Column headers must match exactly.
                                </p>
                            </div>

                            {/* Client selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Select Client <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-2">All services in the file will be assigned to this client.</p>
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={clientSearch}
                                    onChange={e => setClientSearch(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#5E6A43]"
                                />
                                <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                                    {filteredImportClients.length === 0 ? (
                                        <p className="text-xs text-gray-400 p-3">No clients found</p>
                                    ) : filteredImportClients.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setImportClientId(c.id)}
                                            className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
                                                importClientId === c.id
                                                    ? 'bg-[#5E6A43] text-white'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
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
                                            {importResult.created} service(s) created successfully
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
                                disabled={!importClientId || !selectedFile || importing}
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
