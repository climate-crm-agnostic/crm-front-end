import { useState, useEffect, useCallback } from "react";
import { ClipboardList, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import { getAuditLogs } from "@/services/auditLogService";

const ACTION_STYLE = {
    CREATE: { bg: "rgba(94,106,67,0.12)",   border: "rgba(94,106,67,0.4)",   text: "#4a5535" },
    UPDATE: { bg: "rgba(242,155,107,0.12)", border: "rgba(242,155,107,0.4)", text: "#c0622a" },
    DELETE: { bg: "rgba(192,98,42,0.10)",   border: "rgba(192,98,42,0.4)",   text: "#9b3a10" },
};

const MODEL_LABELS = {
    client: "Client", service: "Service", lead: "Lead", leaditem: "Lead Item",
    pipeline: "Pipeline", pipelineattribute: "Pipeline Attribute",
    followup: "Follow-Up", contact: "Contact", category: "Category",
    catalogueitem: "Catalogue Item", inventory: "Inventory",
    invoice: "Invoice", invoicelineitem: "Invoice Line", payment: "Payment",
    asset: "Asset", assetassignment: "Asset Assignment",
    webhook: "Webhook", attribute: "Attribute",
};

const ActionBadge = ({ action }) => {
    const s = ACTION_STYLE[action] || ACTION_STYLE.UPDATE;
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}
        >
            {action}
        </span>
    );
};

const ChangesCell = ({ changes }) => {
    const [open, setOpen] = useState(false);
    if (!changes || Object.keys(changes).length === 0) {
        return <span className="text-xs" style={{ color: "#9b948e" }}>—</span>;
    }
    const keys = Object.keys(changes);
    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: "#5E6A43" }}
            >
                {keys.length} field{keys.length > 1 ? "s" : ""}
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {open && (
                <div
                    className="mt-1.5 rounded p-2 text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto"
                    style={{ backgroundColor: "rgba(216,210,196,0.2)", border: "1px solid #D8D2C4", color: "#2E2A26" }}
                >
                    {keys.map(k => {
                        const val = changes[k];
                        const [before, after] = Array.isArray(val) ? val : [null, val];
                        return (
                            <div key={k}>
                                <span style={{ color: "#9b948e" }}>{k}:</span>{" "}
                                {before !== null && (
                                    <span style={{ color: "#9b3a10", textDecoration: "line-through" }}>{String(before).slice(0, 60)}</span>
                                )}
                                {before !== null && <span style={{ color: "#9b948e" }}> → </span>}
                                <span style={{ color: "#4a5535" }}>{String(after ?? "").slice(0, 80)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const FONT = { fontFamily: '"Source Sans 3", Arial, sans-serif' };

export const AuditLog = () => {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [model, setModel]       = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo]     = useState("");
    const [page, setPage]         = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAuditLogs({ model, date_from: dateFrom, date_to: dateTo, page, page_size: 50 });
            setData(result);
        } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Could not load audit logs.", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    }, [model, dateFrom, dateTo, page]);

    useEffect(() => { load(); }, [load]);

    const handleFilter = (e) => {
        e.preventDefault();
        setPage(1);
        load();
    };

    const availableModels = data?.models || [];

    return (
        <div className="p-6 space-y-6" style={FONT}>
            {/* Header */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                    >
                        <ClipboardList className="h-5 w-5" style={{ color: "#5E6A43" }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold" style={{ color: "#2E2A26" }}>Audit Log</p>
                        <p className="text-sm" style={{ color: "#9b948e" }}>
                            All changes made to CRM records, indexed by actor and model.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#9b948e" }}>Model</label>
                    <select
                        value={model}
                        onChange={e => { setModel(e.target.value); setPage(1); }}
                        className="h-9 rounded-md border px-2.5 text-sm bg-white focus:outline-none"
                        style={{ borderColor: "#D8D2C4", color: "#2E2A26", minWidth: 160 }}
                    >
                        <option value="">All models</option>
                        {availableModels.map(m => (
                            <option key={m} value={m}>{MODEL_LABELS[m] || m}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#9b948e" }}>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                        className="h-9 rounded-md border px-2.5 text-sm focus:outline-none"
                        style={{ borderColor: "#D8D2C4", color: "#2E2A26" }}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#9b948e" }}>To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setPage(1); }}
                        className="h-9 rounded-md border px-2.5 text-sm focus:outline-none"
                        style={{ borderColor: "#D8D2C4", color: "#2E2A26" }}
                    />
                </div>
                <button
                    type="submit"
                    className="h-9 px-4 rounded-md text-sm font-semibold transition-colors"
                    style={{ backgroundColor: "#5E6A43", color: "#FBF7EF" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4a5535"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "#5E6A43"}
                >
                    Filter
                </button>
                {(model || dateFrom || dateTo) && (
                    <button
                        type="button"
                        onClick={() => { setModel(""); setDateFrom(""); setDateTo(""); setPage(1); }}
                        className="h-9 px-3 rounded-md text-sm transition-colors"
                        style={{ color: "#9b948e" }}
                    >
                        Clear
                    </button>
                )}
            </form>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #D8D2C4" }}>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: "rgba(216,210,196,0.3)", borderBottom: "1px solid #D8D2C4" }}>
                            {["Timestamp", "Model", "Action", "Object", "Actor", "Changes"].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#9b948e" }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "#9b948e" }}>
                                    Loading...
                                </td>
                            </tr>
                        ) : !data?.results?.length ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "#9b948e" }}>
                                    No audit entries found.
                                </td>
                            </tr>
                        ) : data.results.map((entry, i) => (
                            <tr
                                key={entry.id}
                                style={{
                                    borderBottom: i < data.results.length - 1 ? "1px solid #D8D2C4" : "none",
                                    backgroundColor: i % 2 === 0 ? "#fff" : "rgba(251,247,239,0.5)",
                                }}
                            >
                                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#6b6560" }}>
                                    {new Date(entry.timestamp).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-xs font-medium" style={{ color: "#2E2A26" }}>
                                    {MODEL_LABELS[entry.model] || entry.model}
                                </td>
                                <td className="px-4 py-3">
                                    <ActionBadge action={entry.action} />
                                </td>
                                <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: "#2E2A26" }} title={entry.object_repr}>
                                    {entry.object_repr}
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: "#6b6560" }}>
                                    {entry.actor || <span style={{ color: "#9b948e" }}>System</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <ChangesCell changes={entry.changes} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "#9b948e" }}>
                        {data.count} entries — page {data.page} of {data.total_pages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-1 h-8 px-3 rounded-md text-sm font-medium disabled:opacity-40 transition-colors"
                            style={{ border: "1px solid #D8D2C4", color: "#2E2A26", backgroundColor: "#fff" }}
                        >
                            <ChevronLeft className="h-4 w-4" /> Prev
                        </button>
                        <button
                            disabled={page >= data.total_pages}
                            onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 h-8 px-3 rounded-md text-sm font-medium disabled:opacity-40 transition-colors"
                            style={{ border: "1px solid #D8D2C4", color: "#2E2A26", backgroundColor: "#fff" }}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
