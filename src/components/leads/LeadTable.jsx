import React, { useEffect, useMemo, useState } from "react";
import { Archive } from "lucide-react";
import Swal from "sweetalert2";
import { Table } from "../Table";
import { Badge } from "../ui/badge";
import { getLeads, archiveLead, unarchiveLead } from "../../services/leadService";
import { getSales } from "../../services/salesService";
import { getClients } from "../../services/clientService";
import { getPipelineAttributes } from "../../services/pipelineAttributeService";
import { formatDate } from "../../utils/date";

// Table view of the leads in the active pipeline — a flat alternative to the
// Kanban (LeadBoard). Self-contained data fetching (sales/clients/attributes)
// rather than sharing LeadBoard's, same pattern LeadDetail already uses —
// some duplicate requests when toggling views, but keeps this view
// independent and simple.
export const LeadTable = ({ selectedPipelineId, refreshTrigger, onLeadClick }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salesUsers, setSalesUsers] = useState([]);
    const [clientsById, setClientsById] = useState({});
    const [pipelineAttributes, setPipelineAttributes] = useState([]);

    useEffect(() => {
        Promise.all([getSales(), getClients()]).then(([salesData, clientsData]) => {
            setSalesUsers(salesData.results || salesData || []);

            const cMap = {};
            (clientsData || []).forEach(c => { cMap[String(c.id)] = c.name; });
            setClientsById(cMap);
        }).catch(err => console.error("Failed to load table lookups", err));
    }, []);

    useEffect(() => {
        if (!selectedPipelineId) {
            setPipelineAttributes([]);
            return;
        }
        getPipelineAttributes(selectedPipelineId)
            .then(data => setPipelineAttributes(data || []))
            .catch(() => setPipelineAttributes([]));
    }, [selectedPipelineId]);

    useEffect(() => {
        if (!selectedPipelineId) {
            setLeads([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        getLeads({ pipeline_id: selectedPipelineId, include_archived: "true" })
            .then(data => { if (!cancelled) setLeads(data || []); })
            .catch(err => {
                console.error("Failed to load leads for table view", err);
                if (!cancelled) setLeads([]);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [selectedPipelineId, refreshTrigger]);

    const getResponsibleName = (resp) => {
        if (!resp) return "Unassigned";
        if (typeof resp === "object") return resp.name || resp.username || "Unassigned";
        const user = salesUsers.find(u => u.id === Number(resp));
        return user ? (user.name || user.username) : "Unassigned";
    };

    const getClientName = (client) => {
        if (!client) return "";
        if (typeof client === "object") return client.name || "";
        return clientsById[String(client)] || "";
    };

    const rows = useMemo(() => leads.map(l => ({
        ...(l.attributes || {}),
        ...l,
        client_name: getClientName(l.possible_client),
        responsible_name: getResponsibleName(l.responsible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [leads, clientsById, salesUsers]);

    const attributeColumns = pipelineAttributes.map(attr => ({
        key: attr.name,
        label: attr.label || attr.name,
    }));

    const columns = [
        {
            key: "name",
            label: "Name",
            render: (val, row) => (
                <button
                    type="button"
                    onClick={() => onLeadClick?.(row)}
                    className="font-semibold hover:underline cursor-pointer"
                    style={{ color: "#5E6A43" }}
                >
                    {val}
                </button>
            ),
        },
        { key: "stage", label: "Stage" },
        { key: "responsible_name", label: "Responsible" },
        { key: "client_name", label: "Client" },
        ...attributeColumns,
        { key: "created_at", label: "Created At", render: (val) => formatDate(val) },
        {
            key: "is_archived",
            label: "Archived",
            render: (val) => val
                ? <Badge variant="secondary">Archived</Badge>
                : null,
        },
    ];

    const handleArchiveToggle = async (row) => {
        const willArchive = !row.is_archived;
        const confirm = await Swal.fire({
            title: willArchive ? 'Archive this lead?' : 'Unarchive this lead?',
            text: willArchive
                ? 'It will be hidden from the pipeline board until you unarchive it.'
                : 'It will show up in the pipeline board again.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: willArchive ? 'Archive' : 'Unarchive',
        });
        if (!confirm.isConfirmed) return;

        try {
            const updated = willArchive ? await archiveLead(row.id) : await unarchiveLead(row.id);
            setLeads(prev => prev.map(l => l.id === row.id ? { ...l, is_archived: updated.is_archived, archived_at: updated.archived_at } : l));
        } catch (err) {
            console.error("Failed to toggle archive state", err);
            Swal.fire('Error', err.message || 'Could not update the archive state.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                Loading leads...
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col px-4 pb-4" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
            <Table
                data={rows}
                columns={columns}
                onEdit={onLeadClick}
                rowActions={[
                    {
                        label: (row) => row.is_archived ? "Unarchive" : "Archive",
                        icon: Archive,
                        onClick: handleArchiveToggle,
                    },
                ]}
            />
        </div>
    );
};
