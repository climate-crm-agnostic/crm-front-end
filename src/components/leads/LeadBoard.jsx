import React, { useEffect, useState, useRef } from "react";
import { LeadCard } from "./LeadCard";
import { getPipelines } from "../../services/pipelineService";
import { getLeads, updateLead } from "../../services/leadService";
import { getSales } from "../../services/salesService";
import { getClients } from "../../services/clientService";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Modal } from "../Modal";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import Swal from "sweetalert2";

const LEAD_MY_LEADS_STORAGE_KEY = 'lead_my_leads_only';
const LEAD_SEARCH_STORAGE_KEY = 'lead_search_term';

export const LeadBoard = ({ refreshTrigger, selectedPipelineId, setSelectedPipelineId, onLeadClick }) => {
    const [pipelines, setPipelines] = useState([]);
    const [leads, setLeads] = useState([]);
    const [stages, setStages] = useState([]);
    const [salesUsers, setSalesUsers] = useState([]);
    const [clientsById, setClientsById] = useState({});
    const [loading, setLoading] = useState(true);
    const [myLeadsOnly, setMyLeadsOnly] = useState(
        () => localStorage.getItem(LEAD_MY_LEADS_STORAGE_KEY) === 'true'
    );
    const [searchTerm, setSearchTerm] = useState(
        () => localStorage.getItem(LEAD_SEARCH_STORAGE_KEY) || ""
    );
    const scrollContainerRef = useRef(null);
    const { user } = useAuth();

    const [lostModalOpen, setLostModalOpen] = useState(false);
    const [lostReason, setLostReason] = useState("");
    const [pendingLostLeadId, setPendingLostLeadId] = useState(null);

    const scrollLeft = () => scrollContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
    const scrollRight = () => scrollContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' });

    useEffect(() => {
        const fetchPipelines = async () => {
            const pipelinesData = await getPipelines();
            const loadedPipelines = pipelinesData.results || pipelinesData || [];
            setPipelines(loadedPipelines);
            if (loadedPipelines.length > 0 && !selectedPipelineId) {
                setSelectedPipelineId(loadedPipelines[0].id);
            }
        };
        const fetchSalesUsers = async () => {
            try {
                const salesData = await getSales();
                setSalesUsers(salesData.results || salesData || []);
            } catch (err) {
                console.error("Failed to load sales users", err);
            }
        };
        const fetchClients = async () => {
            try {
                const clientsData = await getClients();
                const map = {};
                (clientsData || []).forEach(c => { map[String(c.id)] = c.name; });
                setClientsById(map);
            } catch (err) {
                console.error("Failed to load clients", err);
            }
        };
        fetchPipelines();
        fetchSalesUsers();
        fetchClients();
    }, []);

    useEffect(() => {
        const fetchLeads = async () => {
            if (!selectedPipelineId) return;
            setLoading(true);
            try {
                const leadsData = await getLeads({ pipeline_id: selectedPipelineId });
                setLeads(leadsData.results || leadsData || []);
            } catch (error) {
                console.error("Error loading leads", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, [selectedPipelineId, refreshTrigger]);

    useEffect(() => {
        if (!selectedPipelineId || !pipelines.length) return;
        const activePipeline = pipelines.find(p => p.id == selectedPipelineId);
        if (activePipeline?.stages) {
            setStages([...activePipeline.stages].sort((a, b) => a.order - b.order));
        } else {
            setStages([]);
        }
    }, [selectedPipelineId, pipelines]);

    const getResponsibleId = (lead) => {
        const resp = lead.responsible;
        if (!resp) return null;
        if (typeof resp === 'object') return resp.id ?? null;
        const parsed = parseInt(resp, 10);
        return isNaN(parsed) ? null : parsed;
    };

    const filteredLeads = leads.filter(lead => {
        if (myLeadsOnly && user && getResponsibleId(lead) !== user.id) return false;
        if (searchTerm.trim() && !lead.name?.toLowerCase().includes(searchTerm.trim().toLowerCase())) return false;
        return true;
    });

    useEffect(() => {
        localStorage.setItem(LEAD_MY_LEADS_STORAGE_KEY, String(myLeadsOnly));
    }, [myLeadsOnly]);

    useEffect(() => {
        localStorage.setItem(LEAD_SEARCH_STORAGE_KEY, searchTerm);
    }, [searchTerm]);

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = async (e, targetStageName) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("leadId");
        if (targetStageName.toLowerCase() === "lost") {
            setPendingLostLeadId(leadId);
            setLostReason("");
            setLostModalOpen(true);
            return;
        }
        performStageUpdate(leadId, targetStageName);
    };

    const performStageUpdate = async (leadId, targetStageName, additionalPayload = {}) => {
        const originalLeads = [...leads];
        setLeads(leads.map(l => l.id.toString() === leadId ? { ...l, stage: targetStageName } : l));
        try {
            await updateLead(leadId, { stage: targetStageName, ...additionalPayload });
        } catch (error) {
            console.error("Failed to update stage", error);
            setLeads(originalLeads);
            // A StageValidationRule (or other backend validation) blocked the
            // move — revert the optimistic update above and tell the user why.
            Swal.fire('Cannot move lead', error.message || 'The stage change was rejected.', 'error');
        }
    };

    const handleLostSubmit = () => {
        if (!lostReason.trim()) return;
        performStageUpdate(pendingLostLeadId, "Lost", { lost_reason: lostReason });
        setLostModalOpen(false);
        setPendingLostLeadId(null);
    };

    if (loading) {
        return (
            <div className="p-10 text-center" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                Loading board...
            </div>
        );
    }

    if (!pipelines.length) {
        return (
            <div className="flex flex-col items-center justify-center p-10 h-full" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                <div className="text-center mb-8">
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "#2E2A26" }}>No active pipeline found</h3>
                    <p className="text-sm mb-6" style={{ color: "#9b948e" }}>Configure your first pipeline to start managing leads.</p>
                    <Link
                        to="/pipeline"
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                    >
                        Manage Pipelines
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col h-full w-full overflow-hidden relative group/board"
            style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
        >
            {/* Pipeline selector toolbar */}
            <div
                className="px-5 py-2.5 flex items-center gap-3 shrink-0"
                style={{ borderBottom: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}
            >
                <span
                    className="text-[10px] uppercase tracking-widest font-bold shrink-0"
                    style={{ color: "#9b948e" }}
                >
                    Active Pipeline
                </span>
                <div className="relative">
                    <select
                        value={selectedPipelineId || ""}
                        onChange={(e) => setSelectedPipelineId(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
                        style={{
                            border: "1px solid #D8D2C4",
                            backgroundColor: "#F2EBDD",
                            color: "#2E2A26",
                            minWidth: "200px",
                        }}
                    >
                        {pipelines.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <ChevronRight
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none rotate-90"
                        style={{ color: "#9b948e" }}
                    />
                </div>

                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={myLeadsOnly}
                        onChange={(e) => setMyLeadsOnly(e.target.checked)}
                        className="h-3.5 w-3.5 rounded cursor-pointer"
                        style={{ accentColor: "#5E6A43" }}
                    />
                    <span className="text-xs font-semibold" style={{ color: "#2E2A26" }}>My Leads</span>
                </label>

                <div className="relative w-[220px]">
                    <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: "#9b948e" }}
                    />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search leads by name..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs focus:outline-none transition-colors"
                        style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF", color: "#2E2A26" }}
                    />
                </div>
            </div>

            {/* Scroll buttons */}
            <button
                onClick={scrollLeft}
                className="absolute left-2 top-1/2 z-20 h-9 w-9 flex items-center justify-center rounded-full opacity-0 group-hover/board:opacity-100 transition-opacity"
                style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4", color: "#5E6A43", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
            >
                <ChevronLeft size={18} />
            </button>
            <button
                onClick={scrollRight}
                className="absolute right-2 top-1/2 z-20 h-9 w-9 flex items-center justify-center rounded-full opacity-0 group-hover/board:opacity-100 transition-opacity"
                style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4", color: "#5E6A43", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
            >
                <ChevronRight size={18} />
            </button>

            {/* Kanban columns */}
            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 px-4 h-full mt-3 scroll-smooth"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D8D2C4 transparent" }}
            >
                {stages.map((stage, index) => {
                    const stageColor = stage.color || "#5E6A43";
                    const stageLeads = filteredLeads.filter(l => {
                        const matchesStage = l.stage === stage.name || l.stage_id === stage.id;
                        if (index === 0 && !l.stage && !l.stage_id) return true;
                        return matchesStage;
                    });

                    return (
                        <div
                            key={stage.name}
                            className="flex-shrink-0 w-72 flex flex-col rounded-xl h-full transition-all"
                            style={{
                                border: "1px solid #D8D2C4",
                                borderTop: `4px solid ${stageColor}`,
                                backgroundColor: "#FBF7EF",
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.name)}
                        >
                            {/* Column header */}
                            <div
                                className="px-4 py-3 flex items-center justify-between shrink-0 rounded-t-lg"
                                style={{ backgroundColor: "#F2EBDD", borderBottom: "1px solid #D8D2C4" }}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-2 w-2 rounded-full shrink-0"
                                        style={{ backgroundColor: stageColor }}
                                    />
                                    <h3
                                        className="font-black text-[10px] uppercase tracking-widest"
                                        style={{ color: "#2E2A26" }}
                                    >
                                        {stage.name}
                                    </h3>
                                </div>
                                <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                                    style={{
                                        backgroundColor: "rgba(94,106,67,0.12)",
                                        border: "1px solid rgba(94,106,67,0.25)",
                                        color: "#5E6A43",
                                    }}
                                >
                                    {stageLeads.length}
                                </span>
                            </div>

                            {/* Cards list */}
                            <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[80px]">
                                {stageLeads.map((lead) => (
                                    <LeadCard
                                        key={lead.id}
                                        lead={lead}
                                        salesUsers={salesUsers}
                                        clientsById={clientsById}
                                        onDragStart={(e, l) => e.dataTransfer.setData("leadId", l.id)}
                                        onClick={() => onLeadClick?.(lead)}
                                    />
                                ))}
                                {stageLeads.length === 0 && (
                                    <div
                                        className="h-20 flex flex-col items-center justify-center rounded-lg mx-1"
                                        style={{ border: "1.5px dashed #D8D2C4" }}
                                    >
                                        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#9b948e" }}>
                                            Empty Stage
                                        </p>
                                        <p className="text-[8px] mt-0.5 opacity-60" style={{ color: "#9b948e" }}>
                                            Drop cards here
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lost reason modal */}
            <Modal
                isOpen={lostModalOpen}
                onClose={() => { setLostModalOpen(false); setPendingLostLeadId(null); }}
                title="Reason for Losing Opportunity"
                showFooter={false}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="lost_reason">Please provide a reason to mark this opportunity as lost.</Label>
                        <Textarea
                            id="lost_reason"
                            value={lostReason}
                            onChange={(e) => setLostReason(e.target.value)}
                            placeholder="e.g., Budget constraints, chose competitor..."
                            className="min-h-[100px]"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => { setLostModalOpen(false); setPendingLostLeadId(null); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleLostSubmit} disabled={!lostReason.trim()}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
