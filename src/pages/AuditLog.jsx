import { useState, useEffect, useCallback } from "react";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import { getAuditLogs } from "@/services/auditLogService";
import { DateInput } from "@/components/ui/date-input";
import { PaginationFooter, PageSizeSelect } from "@/components/PaginationControls";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const ACTION_STYLE = {
    CREATE: { bg: "rgba(94,106,67,0.12)",   border: "rgba(94,106,67,0.4)",   text: "#14302A" },
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
        return <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>—</span>;
    }
    const keys = Object.keys(changes);
    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: "var(--secondary)" }}
            >
                {keys.length} field{keys.length > 1 ? "s" : ""}
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {open && (
                <div
                    className="mt-1.5 rounded p-2 text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto"
                    style={{ backgroundColor: "rgba(216,210,196,0.2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                >
                    {keys.map(k => {
                        const val = changes[k];
                        const [before, after] = Array.isArray(val) ? val : [null, val];
                        return (
                            <div key={k}>
                                <span style={{ color: "var(--muted-foreground)" }}>{k}:</span>{" "}
                                {before !== null && (
                                    <span style={{ color: "#9b3a10", textDecoration: "line-through" }}>{String(before).slice(0, 60)}</span>
                                )}
                                {before !== null && <span style={{ color: "var(--muted-foreground)" }}> → </span>}
                                <span style={{ color: "var(--secondary)" }}>{String(after ?? "").slice(0, 80)}</span>
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
    const [pageSize, setPageSizeState] = useState(PAGE_SIZE_OPTIONS[0]);
    const setPageSize = (size) => { setPageSizeState(size); setPage(1); };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAuditLogs({ model, date_from: dateFrom, date_to: dateTo, page, page_size: pageSize });
            setData(result);
        } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Could not load audit logs.", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    }, [model, dateFrom, dateTo, page, pageSize]);

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
                        <ClipboardList className="h-5 w-5" style={{ color: "var(--secondary)" }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold" style={{ color: "var(--secondary)" }}>Audit Log</p>
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                            All changes made to CRM records, indexed by actor and model.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Model</label>
                    <select
                        value={model}
                        onChange={e => { setModel(e.target.value); setPage(1); }}
                        className="h-9 rounded-md border px-2.5 text-sm bg-card focus:outline-none"
                        style={{ borderColor: "var(--border)", color: "var(--foreground)", minWidth: 160 }}
                    >
                        <option value="">All models</option>
                        {availableModels.map(m => (
                            <option key={m} value={m}>{MODEL_LABELS[m] || m}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1" style={{ width: 160 }}>
                    <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>From</label>
                    <DateInput
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex flex-col gap-1" style={{ width: 160 }}>
                    <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>To</label>
                    <DateInput
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    />
                </div>
                <button
                    type="submit"
                    className="h-9 px-4 rounded-md text-sm font-semibold transition-colors"
                    style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--secondary) 80%, black)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--secondary)"}
                >
                    Filter
                </button>
                {(model || dateFrom || dateTo) && (
                    <button
                        type="button"
                        onClick={() => { setModel(""); setDateFrom(""); setDateTo(""); setPage(1); }}
                        className="h-9 px-3 rounded-md text-sm transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
                    >
                        Clear
                    </button>
                )}
                <div className="ml-auto">
                    <PageSizeSelect pageSize={pageSize} setPageSize={setPageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
                </div>
            </form>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: "rgba(216,210,196,0.3)", borderBottom: "1px solid var(--border)" }}>
                            {["Timestamp", "Model", "Action", "Object", "Actor", "Changes"].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                                    Loading...
                                </td>
                            </tr>
                        ) : !data?.results?.length ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                                    No audit entries found.
                                </td>
                            </tr>
                        ) : data.results.map((entry, i) => (
                            <tr
                                key={entry.id}
                                style={{
                                    borderBottom: i < data.results.length - 1 ? "1px solid var(--border)" : "none",
                                    backgroundColor: i % 2 === 0 ? "var(--background)" : "var(--muted)",
                                }}
                            >
                                <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                                    {new Date(entry.timestamp).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-xs font-medium" style={{ color: "var(--foreground)" }}>
                                    {MODEL_LABELS[entry.model] || entry.model}
                                </td>
                                <td className="px-4 py-3">
                                    <ActionBadge action={entry.action} />
                                </td>
                                <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: "var(--foreground)" }} title={entry.object_repr}>
                                    {entry.object_repr}
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                                    {entry.actor || <span style={{ color: "var(--muted-foreground)" }}>System</span>}
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
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <PaginationFooter
                        currentPage={page}
                        setCurrentPage={setPage}
                        totalPages={data.total_pages}
                        startRecord={data.count ? (page - 1) * pageSize + 1 : 0}
                        endRecord={data.count ? Math.min(page * pageSize, data.count) : 0}
                        bordered={false}
                    />
                </div>
            )}
        </div>
    );
};
