import React from "react";
import { Calendar, Building, Archive, ChevronDown } from "lucide-react";
import { formatDate } from "../../utils/date";
import Swal from "sweetalert2";

export const LeadCardMobile = ({ lead, stages = [], salesUsers = [], clientsById = {}, onClick, onArchive, onChangeStage }) => {

    const handleArchiveClick = async (e) => {
        e.stopPropagation();
        const confirm = await Swal.fire({
            title: 'Archive this lead?',
            text: 'It will be hidden from the pipeline board until you unarchive it.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Archive',
        });
        if (confirm.isConfirmed) onArchive?.(lead.id);
    };

    const handleStageChange = (e) => {
        onChangeStage?.(lead.id, e.target.value);
    };

    const getResponsibleName = () => {
        const resp = lead.responsible;
        if (!resp) return "Unassigned";
        if (typeof resp === 'object') return resp.name || resp.username || "Unassigned";
        if (typeof resp === 'string' && isNaN(parseInt(resp))) return resp;
        const user = salesUsers.find(u => u.id === parseInt(resp));
        return user ? (user.name || user.username) : "Unassigned";
    };

    const getPossibleClientName = () => {
        const client = lead.possible_client;
        if (!client) return null;
        if (typeof client === 'object') return client.name || "Unknown Client";
        return clientsById[String(client)] || ("Client #" + String(client).slice(0, 8));
    };

    const responsibleName = getResponsibleName();
    const clientName = getPossibleClientName();
    const currentStage = lead.stage || stages[0]?.name || "";

    return (
        <div
            onClick={() => onClick?.(lead)}
            className="cursor-pointer active:scale-[0.98] transition-transform rounded-xl p-3.5"
            style={{
                backgroundColor: "#FBF7EF",
                border: "1px solid #D8D2C4",
                fontFamily: '"Source Sans 3", Arial, sans-serif',
            }}
        >
            {/* Lead name */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
                <p className="text-sm font-bold leading-tight" style={{ color: "#2E2A26" }}>
                    {lead.name}
                </p>
                <button
                    type="button"
                    onClick={handleArchiveClick}
                    title="Archive lead"
                    className="shrink-0 p-1 -m-1 cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ color: "#9b948e" }}
                >
                    <Archive className="w-4 h-4" />
                </button>
            </div>

            {/* Responsible + client */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
                <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                    style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}
                >
                    <div
                        className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                    >
                        {responsibleName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: "#2E2A26" }}>
                        {responsibleName}
                    </span>
                </div>
                {clientName && (
                    <div className="flex items-center gap-1 text-[11px] min-w-0" style={{ color: "#9b948e" }}>
                        <Building className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{clientName}</span>
                    </div>
                )}
            </div>

            {/* Date + stage move */}
            <div className="flex items-center justify-between gap-2 pt-2.5" style={{ borderTop: "1px solid #F2EBDD" }}>
                <div className="flex items-center gap-1" style={{ color: "#9b948e" }}>
                    <Calendar className="w-3 h-3" />
                    <span className="text-[11px] font-medium">
                        {formatDate(lead.created_at || lead.date) || "No date"}
                    </span>
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <select
                        value={currentStage}
                        onChange={handleStageChange}
                        className="appearance-none pl-2.5 pr-6 py-1 rounded-full text-[11px] font-semibold focus:outline-none cursor-pointer"
                        style={{ border: "1px solid #D8D2C4", backgroundColor: "#F2EBDD", color: "#5E6A43" }}
                    >
                        {stages.map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                    <ChevronDown
                        size={11}
                        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: "#9b948e" }}
                    />
                </div>
            </div>
        </div>
    );
};
