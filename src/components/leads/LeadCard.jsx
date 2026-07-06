import React from "react";
import { Calendar, Building } from "lucide-react";
import { formatDate } from "../../utils/date";

export const LeadCard = ({ lead, salesUsers = [], clientsById = {}, onDragStart, onClick }) => {

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

    return (
        <div
            onClick={() => onClick?.(lead)}
            draggable
            onDragStart={(e) => onDragStart(e, lead)}
            className="cursor-pointer active:scale-[0.98] transition-transform"
        >
            <div
                className="rounded-lg p-3 transition-all"
                style={{
                    backgroundColor: "#FBF7EF",
                    border: "1px solid #D8D2C4",
                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#5E6A43";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(94,106,67,0.10)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#D8D2C4";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                }}
            >
                {/* Lead name */}
                <p
                    className="text-[11px] font-bold uppercase tracking-tight leading-tight line-clamp-2 mb-2.5"
                    style={{ color: "#2E2A26" }}
                >
                    {lead.name}
                </p>

                {/* Responsible */}
                <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-2"
                    style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}
                >
                    <div
                        className="h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-black shrink-0"
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                    >
                        {responsibleName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[9px] font-semibold truncate" style={{ color: "#2E2A26" }}>
                        {responsibleName}
                    </span>
                </div>

                {/* Date + client */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1" style={{ color: "#9b948e" }}>
                        <Calendar className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-medium">
                            {formatDate(lead.created_at || lead.date) || "No date"}
                        </span>
                    </div>
                    {clientName && (
                        <div className="flex items-center gap-1 max-w-[55%]" style={{ color: "#9b948e" }}>
                            <Building className="w-2.5 h-2.5 shrink-0" />
                            <span className="text-[9px] truncate">{clientName}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
