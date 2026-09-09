import { useMemo, useState } from "react";
import { Filter, Plus, X } from "lucide-react";
import { useAttributeRegistry } from "../../hooks/useAttributeRegistry";
import { normalizeOptions } from "../../utils/attributeTypes";
import {
    RELATIVE_WINDOWS, countActiveFilters, defaultOperatorFor, operatorLabel, valueShape,
} from "../../utils/attributeFilters";

const INK = "#2E2A26";
const MUTED = "#6b6560";
const HINT = "#9b948e";
const OAT = "#F2EBDD";
const PEBBLE = "#D8D2C4";
const OLIVE = "#5E6A43";
const FONT = '"Source Sans 3", Arial, sans-serif';

const control = {
    backgroundColor: "#fff", border: `1px solid ${PEBBLE}`, color: INK,
    borderRadius: 6, padding: "6px 8px", fontSize: 13, outline: "none", fontFamily: FONT,
};

/**
 * Filter rows over an entity's dynamic attributes.
 *
 * The operator list for each row comes from the attribute's type in the
 * registry, so a "greater than" is never offered on a text field and a
 * "contains" never on a number. The parent owns the rows and re-fetches when
 * they change; this component only edits them.
 *
 * `attributes` are the entity's definitions (the same ones the detail forms
 * render). Only those marked filterable are offered — `is_filterable` defaults
 * to true, so nothing disappears unless an admin turns it off.
 */
export const AttributeFilterBar = ({ attributes = [], rows, onChange, onApply }) => {
    const { byType } = useAttributeRegistry();
    const [open, setOpen] = useState(false);

    const filterable = useMemo(
        () => attributes.filter((a) => a.is_filterable !== false),
        [attributes]
    );
    const byName = useMemo(
        () => Object.fromEntries(filterable.map((a) => [a.name, a])), [filterable]
    );
    const activeCount = countActiveFilters(rows);

    if (filterable.length === 0) return null;

    const addRow = () => {
        const first = filterable[0];
        onChange([...rows, {
            name: first.name,
            operator: defaultOperatorFor(byType[first.type]),
            value: "",
        }]);
        setOpen(true);
    };

    const updateRow = (index, patch) => {
        onChange(rows.map((row, i) => {
            if (i !== index) return row;
            const next = { ...row, ...patch };
            // Changing the attribute (and therefore the type) can invalidate
            // both the operator and the value, so reset them together.
            if (patch.name && patch.name !== row.name) {
                next.operator = defaultOperatorFor(byType[byName[patch.name]?.type]);
                next.value = "";
            }
            if (patch.operator && patch.operator !== row.operator) next.value = "";
            return next;
        }));
    };

    const removeRow = (index) => {
        const next = rows.filter((_, i) => i !== index);
        onChange(next);
        onApply?.(next);
    };

    const clearAll = () => { onChange([]); onApply?.([]); };

    return (
        <div style={{ fontFamily: FONT }}>
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => (rows.length ? setOpen(!open) : addRow())}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{
                        border: `1px solid ${activeCount ? OLIVE : PEBBLE}`,
                        backgroundColor: activeCount ? "rgba(94,106,67,0.10)" : "transparent",
                        color: activeCount ? OLIVE : MUTED,
                    }}
                >
                    <Filter size={13} />
                    Filters
                    {activeCount > 0 && (
                        <span className="rounded-full px-1.5 text-[10px] font-black"
                              style={{ backgroundColor: OLIVE, color: "#FBF7EF" }}>
                            {activeCount}
                        </span>
                    )}
                </button>

                {activeCount > 0 && (
                    <button type="button" onClick={clearAll}
                            className="text-xs cursor-pointer" style={{ color: HINT }}>
                        Clear all
                    </button>
                )}
            </div>

            {open && (
                <div className="mt-2 rounded-lg p-3 flex flex-col gap-2"
                     style={{ border: `1px solid ${PEBBLE}`, backgroundColor: OAT }}>
                    {rows.length === 0 && (
                        <p style={{ fontSize: 12, color: HINT }}>No filters yet.</p>
                    )}

                    {rows.map((row, index) => {
                        const attr = byName[row.name];
                        const typeMeta = byType[attr?.type];
                        const operators = typeMeta?.operators || ["eq"];
                        return (
                            <div key={index} className="flex flex-wrap items-center gap-1.5">
                                <select value={row.name} style={{ ...control, minWidth: 150 }}
                                        onChange={(e) => updateRow(index, { name: e.target.value })}>
                                    {filterable.map((a) => (
                                        <option key={a.name} value={a.name}>{a.label}</option>
                                    ))}
                                </select>

                                <select value={row.operator} style={{ ...control, minWidth: 130 }}
                                        onChange={(e) => updateRow(index, { operator: e.target.value })}>
                                    {operators.map((op) => (
                                        <option key={op} value={op}>{operatorLabel(op)}</option>
                                    ))}
                                </select>

                                <ValueControl
                                    attr={attr}
                                    operator={row.operator}
                                    value={row.value}
                                    onChange={(value) => updateRow(index, { value })}
                                />

                                <button type="button" onClick={() => removeRow(index)}
                                        className="cursor-pointer" style={{ color: "#c0392b" }}
                                        title="Remove filter">
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}

                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" onClick={addRow}
                                className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                style={{ color: OLIVE }}>
                            <Plus size={12} /> Add filter
                        </button>
                        <span className="flex-1" />
                        <button type="button" onClick={() => onApply?.(rows)}
                                className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer"
                                style={{ backgroundColor: OLIVE, color: "#FBF7EF" }}>
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ValueControl = ({ attr, operator, value, onChange }) => {
    const shape = valueShape(operator);
    if (shape === "none") return null;

    const type = attr?.type;
    const options = normalizeOptions(attr?.options || attr?.list_values)
        .filter((o) => o.is_active !== false);

    if (shape === "window") {
        return (
            <select value={value || ""} style={{ ...control, minWidth: 140 }}
                    onChange={(e) => onChange(e.target.value)}>
                <option value="">Choose a period…</option>
                {RELATIVE_WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                ))}
            </select>
        );
    }

    if (shape === "range") {
        const parts = Array.isArray(value) ? value : String(value || "").split(",");
        const inputType = type === "date" || type === "datetime" ? "date" : "number";
        return (
            <span className="flex items-center gap-1">
                <input type={inputType} value={parts[0] || ""} style={{ ...control, width: 130 }}
                       onChange={(e) => onChange([e.target.value, parts[1] || ""])} />
                <span style={{ fontSize: 12, color: HINT }}>and</span>
                <input type={inputType} value={parts[1] || ""} style={{ ...control, width: 130 }}
                       onChange={(e) => onChange([parts[0] || "", e.target.value])} />
            </span>
        );
    }

    // Option-backed types get a picker instead of free text, in both the
    // single and multi shapes — no one should have to remember exact spelling.
    if (options.length && (type === "list" || type === "multiselect")) {
        const selected = Array.isArray(value)
            ? value
            : String(value || "").split(",").filter(Boolean);
        if (shape === "multi") {
            return (
                <span className="flex flex-wrap items-center gap-1">
                    {options.map((o) => {
                        const on = selected.includes(o.value);
                        return (
                            <button
                                key={o.value} type="button"
                                onClick={() => onChange(on
                                    ? selected.filter((v) => v !== o.value)
                                    : [...selected, o.value])}
                                className="rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer"
                                style={{
                                    border: `1px solid ${o.color || PEBBLE}`,
                                    backgroundColor: on ? (o.color || OLIVE) : "#fff",
                                    color: on ? "#FBF7EF" : INK,
                                }}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </span>
            );
        }
        return (
            <select value={value || ""} style={{ ...control, minWidth: 140 }}
                    onChange={(e) => onChange(e.target.value)}>
                <option value="">Choose…</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        );
    }

    const inputType =
        type === "date" || type === "datetime" ? "date"
            : ["number", "currency", "percentage"].includes(type) ? "number"
                : "text";

    return (
        <input
            type={inputType}
            value={Array.isArray(value) ? value.join(", ") : (value || "")}
            placeholder={shape === "multi" ? "Comma separated" : "Value"}
            style={{ ...control, minWidth: 160 }}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};
