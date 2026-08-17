import React, { useMemo, useState } from "react";

// Reusable "stat tiles + status tabs + progress bar + card list" pattern —
// replaces a raw data table with a readable-at-a-glance view. See the
// Invoices before/after in the redesign deck for the reference design.
//
// statusTabs: [{ value, label, match: (row) => bool, color }]
//   - first entry is treated as the default "All" tab
//   - `color` drives both the progress-bar segment and any badge rendered
//     via `statusColor(row)`
export const TableSummary = ({
    data = [],
    stats = [],
    statusField,
    statusTabs = [],
    renderCard,
    searchable = true,
    searchKeys = [],
    loading = false,
    emptyLabel = "No results.",
    headerActions = null,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState(statusTabs[0]?.value ?? "all");

    const filteredBySearch = useMemo(() => {
        if (!searchTerm.trim() || !searchKeys.length) return data;
        const q = searchTerm.trim().toLowerCase();
        return data.filter((row) =>
            searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
        );
    }, [data, searchTerm, searchKeys]);

    const activeTabConfig = statusTabs.find((t) => t.value === activeTab);
    const visibleRows = activeTabConfig?.match
        ? filteredBySearch.filter(activeTabConfig.match)
        : filteredBySearch;

    // Segment counts for the progress bar — based on the full (unsearched)
    // dataset so the bar reflects the whole collection, not just a filtered view.
    const segments = statusTabs
        .filter((t) => t.match && t.color)
        .map((t) => ({ ...t, count: data.filter(t.match).length }));
    const totalForBar = segments.reduce((sum, s) => sum + s.count, 0) || 1;

    return (
        <div className="flex flex-col h-full gap-4 min-h-0">
            {/* Stat tiles */}
            {stats.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="rounded-lg p-4"
                            style={{ backgroundColor: "#F2EBDD", border: "1px solid #D8D2C4" }}
                        >
                            <p
                                className="text-xs font-semibold uppercase tracking-widest mb-1"
                                style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                            >
                                {s.label}
                            </p>
                            <p
                                className="text-2xl font-bold"
                                style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                            >
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Toolbar: search + tabs + actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                    {statusTabs.map((t) => {
                        const isActive = t.value === activeTab;
                        return (
                            <button
                                key={t.value}
                                onClick={() => setActiveTab(t.value)}
                                className="h-8 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer"
                                style={{
                                    backgroundColor: isActive ? "#5E6A43" : "transparent",
                                    color: isActive ? "#FBF7EF" : "#6b6560",
                                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                                }}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    {searchable && (
                        <input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                height: "36px",
                                width: "100%",
                                maxWidth: "260px",
                                paddingLeft: "12px",
                                paddingRight: "12px",
                                backgroundColor: "#fff",
                                border: "1px solid #D8D2C4",
                                borderRadius: "6px",
                                color: "#2E2A26",
                                fontSize: "14px",
                                fontFamily: '"Source Sans 3", Arial, sans-serif',
                                outline: "none",
                            }}
                        />
                    )}
                    {headerActions}
                </div>
            </div>

            {/* Progress bar */}
            {segments.length > 0 && (
                <div className="flex h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#E8E3DA" }}>
                    {segments.map((s) => (
                        <div
                            key={s.value}
                            style={{
                                width: `${(s.count / totalForBar) * 100}%`,
                                backgroundColor: s.color,
                            }}
                            title={`${s.label}: ${s.count}`}
                        />
                    ))}
                </div>
            )}

            {/* Card list */}
            <div className="flex-1 overflow-auto min-h-0 space-y-2">
                {loading ? (
                    <div className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: "#E8E3DA" }} />
                ) : visibleRows.length ? (
                    visibleRows.map((row, idx) => (
                        <div key={row.id ?? idx}>{renderCard(row)}</div>
                    ))
                ) : (
                    <div
                        className="rounded-lg p-8 text-center text-sm"
                        style={{ color: "#9b948e", border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF" }}
                    >
                        {emptyLabel}
                    </div>
                )}
            </div>
        </div>
    );
};
