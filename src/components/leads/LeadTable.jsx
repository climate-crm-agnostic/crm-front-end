import React, { useEffect, useState } from "react";
import { Table } from "../Table";
import { getLeads, getLeadAttributes } from "../../services/leadService";
import { getClients } from "../../services/clientService";
import { getSales } from "../../services/salesService";

const STATIC_COLUMNS = [
    { key: "name", label: "Name" },
    { key: "stage", label: "Stage" },
    { key: "responsible_name", label: "Responsible" },
    { key: "client_name", label: "Client" },
];

// Mirrors the table view the deployed site already has for Leads (grid/table
// toggle next to the Kanban board) — same generic Table component Invoices
// and Clients use elsewhere, with lead attributes as dynamic columns.
export const LeadTable = ({ selectedPipelineId, onLeadClick, refreshTrigger }) => {
    const [leads, setLeads] = useState([]);
    const [columns, setColumns] = useState(STATIC_COLUMNS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [leadsData, attributesData, clientsData, salesData] = await Promise.all([
                    getLeads(selectedPipelineId ? { pipeline_id: selectedPipelineId } : {}),
                    getLeadAttributes(),
                    getClients(),
                    getSales(),
                ]);

                const clientsById = {};
                (clientsData || []).forEach((c) => { clientsById[String(c.id)] = c.name; });

                const salesById = {};
                (salesData.results || salesData || []).forEach((s) => { salesById[String(s.id)] = s.username || s.name; });

                const processedLeads = (leadsData || []).map((lead) => {
                    const respId = lead.responsible && typeof lead.responsible === "object" ? lead.responsible.id : lead.responsible;
                    return {
                        ...lead,
                        client_name: clientsById[String(lead.possible_client)] || "",
                        responsible_name: salesById[String(respId)] || "",
                        ...(lead.attributes || {}),
                    };
                });
                setLeads(processedLeads);

                const dynamicColumns = (attributesData || []).map((attr) => ({ key: attr.name, label: attr.label }));
                setColumns([...STATIC_COLUMNS, ...dynamicColumns]);
            } catch (error) {
                console.error("Error fetching leads table", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [selectedPipelineId, refreshTrigger]);

    return (
        <div className="flex-1 min-h-0 flex flex-col p-2">
            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="h-24 rounded-lg animate-pulse m-2" style={{ backgroundColor: "#E8E3DA" }} />
                ) : (
                    <Table
                        data={leads}
                        columns={columns}
                        onEdit={onLeadClick}
                        searchable={true}
                    />
                )}
            </div>
        </div>
    );
};
