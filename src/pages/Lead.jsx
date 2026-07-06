import React, { useState, useEffect, useRef } from "react";
import { LeadBoard } from "../components/leads/LeadBoard";
import { Plus, TrendingUp, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getPipelines } from "../services/pipelineService";
import { importLeadsFromExcel } from "../services/leadService";
import { getPipelineAttributes } from "../services/pipelineAttributeService";
import { getClients } from "../services/clientService";
import Swal from "sweetalert2";

const LEAD_FIXED_FIELDS = [
    { name: 'name',        label: 'Name',        required: true,  hint: null },
    { name: 'stage',       label: 'Stage',       required: false, hint: 'must match a stage in the selected pipeline' },
    { name: 'responsible', label: 'Responsible',  required: false, hint: 'username of the user' },
];

const LEAD_PIPELINE_STORAGE_KEY = 'lead_selected_pipeline_id';

export const Lead = () => {
    const [refreshBoard, setRefreshBoard] = useState(0);
    const [selectedPipelineId, setSelectedPipelineId] = useState(
        () => localStorage.getItem(LEAD_PIPELINE_STORAGE_KEY) || null
    );
    const { user } = useAuth();
    const navigate = useNavigate();

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [pipelines, setPipelines] = useState([]);
    const [importPipelineId, setImportPipelineId] = useState('');
    const [leadAttributes, setLeadAttributes] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    // Import modal — client selection
    const [clients, setClients] = useState([]);
    const [importClientId, setImportClientId] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [isNewClient, setIsNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');

    useEffect(() => {
        if (selectedPipelineId) {
            localStorage.setItem(LEAD_PIPELINE_STORAGE_KEY, selectedPipelineId);
        }
    }, [selectedPipelineId]);

    const handleLeadClick = (lead) => {
        navigate(`/lead/${lead.id}`);
    };

    const openImportModal = async () => {
        setImportResult(null);
        setSelectedFile(null);
        setLeadAttributes([]);
        setImportClientId('');
        setClientSearch('');
        setIsNewClient(false);
        setNewClientName('');
        setShowImportModal(true);
        const preselected = selectedPipelineId || '';
        setImportPipelineId(preselected);
        try {
            const [pipelinesData, clientsData] = await Promise.all([
                getPipelines(),
                getClients(),
            ]);
            setPipelines(pipelinesData.results || pipelinesData || []);
            setClients(clientsData || []);
        } catch {
            setPipelines([]);
            setClients([]);
        }
    };

    // Re-fetch pipeline attributes whenever the selected pipeline changes inside the modal
    useEffect(() => {
        if (!showImportModal || !importPipelineId) {
            setLeadAttributes([]);
            return;
        }
        let cancelled = false;
        getPipelineAttributes(importPipelineId)
            .then(data => { if (!cancelled) setLeadAttributes(data || []); })
            .catch(() => { if (!cancelled) setLeadAttributes([]); });
        return () => { cancelled = true; };
    }, [importPipelineId, showImportModal]);

    const closeImportModal = () => {
        if (importing) return;
        setShowImportModal(false);
        setImportResult(null);
        setSelectedFile(null);
        setImportClientId('');
        setClientSearch('');
        setIsNewClient(false);
        setNewClientName('');
    };

    const handleImport = async () => {
        if (!importPipelineId || !selectedFile) return;
        if (!isNewClient && !importClientId) return;
        if (isNewClient && !newClientName.trim()) return;
        setImporting(true);
        setImportResult(null);
        try {
            const result = await importLeadsFromExcel(
                importPipelineId,
                selectedFile,
                isNewClient ? null : importClientId,
                isNewClient ? newClientName.trim() : null
            );
            setImportResult(result);
            if (result.created > 0) setRefreshBoard(r => r + 1);
        } catch (error) {
            Swal.fire('Import failed', error.message, 'error');
        } finally {
            setImporting(false);
        }
    };

    const allFields = [
        ...LEAD_FIXED_FIELDS,
        ...leadAttributes.map(a => ({ name: a.name, label: a.label, required: a.is_required, hint: null })),
    ];

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    return (
        <div
            className="h-full flex flex-col w-full overflow-hidden"
            style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
        >
            {/* Page header — same pattern as Attributes */}
            <div
                className="shrink-0 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                style={{ borderBottom: "1px solid #D8D2C4", backgroundColor: "#F2EBDD" }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                    >
                        <TrendingUp className="h-5 w-5" style={{ color: "#5E6A43" }} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-semibold truncate" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                            Sales Pipeline
                        </p>
                        <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "#9b948e" }}>
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse inline-block shrink-0" style={{ backgroundColor: "#5E6A43" }} />
                            Manage your opportunities and move them through stages.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={openImportModal}
                        className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "#F2EBDD", border: "1px solid #5E6A43", color: "#5E6A43" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                    >
                        <Upload className="h-4 w-4" /> Import Excel
                    </button>
                    <button
                        onClick={() => navigate("/lead/new", { state: { pipelineId: selectedPipelineId } })}
                        className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer shrink-0"
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4a5535"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#5E6A43"}
                    >
                        <Plus className="h-4 w-4" />
                        New Opportunity
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <LeadBoard
                    refreshTrigger={refreshBoard}
                    selectedPipelineId={selectedPipelineId}
                    setSelectedPipelineId={setSelectedPipelineId}
                    onLeadClick={handleLeadClick}
                />
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl w-[680px] max-h-[88vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-[#5E6A43]">Import Leads from Excel</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Select a pipeline and upload your .xlsx file</p>
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
                                            {f.hint && <span className="text-gray-400 font-sans normal-case ml-1">({f.hint})</span>}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    <span className="text-red-500 font-semibold">*</span> required &nbsp;·&nbsp;
                                    Column headers must match exactly. &nbsp;·&nbsp;
                                    Leads without a <code className="bg-gray-100 px-1 rounded">stage</code> value will be placed in the first stage of the pipeline.
                                </p>
                            </div>

                            {/* Client selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Select Client <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-2">All leads in the file will be linked to this client as their possible client.</p>

                                {!isNewClient ? (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="Search clients..."
                                            value={clientSearch}
                                            onChange={e => setClientSearch(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#5E6A43]"
                                        />
                                        <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                                            {filteredClients.length === 0 ? (
                                                <p className="text-xs text-gray-400 p-3">No clients found</p>
                                            ) : filteredClients.map(c => (
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
                                        <button
                                            onClick={() => { setIsNewClient(true); setImportClientId(''); }}
                                            className="mt-2 text-sm font-semibold text-[#5E6A43] hover:underline cursor-pointer"
                                        >
                                            + New Client
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="New client name..."
                                            value={newClientName}
                                            onChange={e => setNewClientName(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#5E6A43]"
                                        />
                                        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                                            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-yellow-700">
                                                This will create a new client{newClientName.trim() ? ` named "${newClientName.trim()}"` : ''}, and all leads in this file will be linked to it.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setIsNewClient(false); setNewClientName(''); }}
                                            className="mt-2 text-sm font-semibold text-gray-500 hover:underline cursor-pointer"
                                        >
                                            ← Choose existing client instead
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Pipeline selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Select Pipeline <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-2">All leads in the file will be assigned to this pipeline.</p>
                                <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                                    {pipelines.length === 0 ? (
                                        <p className="text-xs text-gray-400 p-3">Loading pipelines...</p>
                                    ) : pipelines.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setImportPipelineId(p.id)}
                                            className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors ${
                                                importPipelineId === p.id
                                                    ? 'bg-[#5E6A43] text-white'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            {p.name}
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
                                            {importResult.created} lead(s) created successfully
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
                                disabled={
                                    !importPipelineId ||
                                    !selectedFile ||
                                    importing ||
                                    !!importResult ||
                                    (!isNewClient && !importClientId) ||
                                    (isNewClient && !newClientName.trim())
                                }
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
