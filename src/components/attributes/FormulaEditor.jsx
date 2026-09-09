import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Clock, FunctionSquare, Layers, X } from "lucide-react";
import { evaluateFormula, getFormulaCatalogue } from "../../services/formulaService";

const INK = "#2E2A26";
const MUTED = "#6b6560";
const HINT = "#9b948e";
const OAT = "#F2EBDD";
const PEBBLE = "#D8D2C4";
const OLIVE = "#5E6A43";

const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: MUTED, marginBottom: 5,
};

const control = {
    backgroundColor: "#fff", border: `1px solid ${PEBBLE}`, color: INK,
    borderRadius: 6, padding: "6px 8px", fontSize: 13, outline: "none",
};

/**
 * Editor for a calculated attribute's formula.
 *
 * Validation and preview both go through POST /api/attributes/evaluate/ — the
 * same evaluator that computes the stored value — so what is shown here cannot
 * drift from what gets saved. Debounced, because it fires while typing.
 *
 * `siblings` are the entity's other attributes: they populate the field picker,
 * so a key is inserted rather than typed from memory.
 */
export const FormulaEditor = ({
    formula, onChange, outputType, siblings = [], error, entity,
}) => {
    const [functions, setFunctions] = useState([]);
    const [rollupSources, setRollupSources] = useState([]);
    const [status, setStatus] = useState(null);
    const [sampleValues, setSampleValues] = useState({});
    const textareaRef = useRef(null);

    useEffect(() => {
        getFormulaCatalogue(entity)
            .then(({ functions: fns, rollupSources: sources }) => {
                setFunctions(fns);
                setRollupSources(sources);
            })
            .catch(() => { setFunctions([]); setRollupSources([]); });
    }, [entity]);

    // Sample values for the referenced fields, so the preview shows a real
    // number rather than "empty" for everything.
    const referenced = useMemo(() => {
        const found = [...String(formula || "").matchAll(/\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g)];
        return [...new Set(found.map((m) => m[1]))];
    }, [formula]);

    useEffect(() => {
        if (!formula || !formula.trim()) { setStatus(null); return; }
        const timer = setTimeout(() => {
            evaluateFormula({ formula, values: sampleValues, type: outputType })
                .then(setStatus)
                .catch(() => setStatus({ valid: false, error: "Could not reach the server." }));
        }, 400);
        return () => clearTimeout(timer);
    }, [formula, sampleValues, outputType]);

    const insert = (text) => {
        const el = textareaRef.current;
        if (!el) { onChange(`${formula || ""}${text}`); return; }
        const start = el.selectionStart ?? (formula || "").length;
        const end = el.selectionEnd ?? start;
        const next = `${(formula || "").slice(0, start)}${text}${(formula || "").slice(end)}`;
        onChange(next);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + text.length;
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <label style={labelStyle}>
                <FunctionSquare size={12} style={{ display: "inline", marginRight: 4 }} />
                Formula
            </label>

            <textarea
                ref={textareaRef}
                value={formula || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="ROUND({unit_price} * {quantity} * 1.13, 2)"
                spellCheck={false}
                style={{
                    ...control, minHeight: 68, resize: "vertical",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
            />

            <StatusLine status={status} error={error} />

            <div className="flex flex-wrap items-center gap-2">
                <Picker
                    label="Insert field"
                    options={siblings.map((a) => ({
                        value: `{${a.name}}`, label: `${a.label} · {${a.name}}`,
                    }))}
                    onPick={insert}
                />
                <Picker
                    label="Insert function"
                    options={functions.map((f) => ({
                        value: `${f.name}(`, label: f.signature,
                    }))}
                    onPick={insert}
                />
                {rollupSources.length > 0 && (
                    <Picker
                        label="Insert from related records"
                        options={rollupSources.flatMap((source) =>
                            source.fields.map((field) => ({
                                value: `{related.${source.source}.${field}}`,
                                label: `${source.source}.${field}`,
                            }))
                        )}
                        onPick={insert}
                    />
                )}
            </div>

            {referenced.length > 0 && (
                <div className="rounded-md p-2" style={{ backgroundColor: OAT, border: `1px solid ${PEBBLE}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 5 }}>
                        Try it with sample values
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {referenced.map((name) => (
                            <label key={name} className="flex items-center gap-1"
                                   style={{ fontSize: 12, color: INK }}>
                                <span style={{ fontFamily: "ui-monospace, monospace" }}>{name}</span>
                                <input
                                    value={sampleValues[name] ?? ""}
                                    onChange={(e) => setSampleValues((prev) => ({
                                        ...prev, [name]: e.target.value,
                                    }))}
                                    style={{ ...control, width: 96, padding: "3px 6px" }}
                                />
                            </label>
                        ))}
                    </div>
                    {status?.valid && (
                        <p style={{ fontSize: 12, color: INK, marginTop: 6 }}>
                            Result:{" "}
                            <strong>
                                {status.result === null || status.result === undefined
                                    ? "(empty)"
                                    : String(status.result)}
                            </strong>
                        </p>
                    )}
                </div>
            )}

            {status?.rollups?.length > 0 && (
                <p className="flex items-start gap-1.5" style={{ fontSize: 11, color: MUTED }}>
                    <Layers size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                    {/* The preview evaluates against the sample values above and
                        has no record to read related rows from, so rollups come
                        out empty here — say so rather than let it look broken. */}
                    Reads related records ({status.rollups.join(", ")}). The preview cannot
                    show those — they are read from the saved record. The stored value
                    updates whenever one of those records changes.
                </p>
            )}

            {status?.time_dependent && (
                <p className="flex items-start gap-1.5" style={{ fontSize: 11, color: "#c0622a" }}>
                    <Clock size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                    {/* Materialized on save, so a TODAY()-based value is only as
                        fresh as the last time each record was saved. */}
                    This formula depends on the current date. Stored values only refresh
                    when a record is saved, or when an administrator reruns the
                    recompute command.
                </p>
            )}

            <p style={{ fontSize: 11, color: HINT }}>
                Reference other fields as <code>{"{field_key}"}</code>, the record's own
                columns as <code>{"{self.name}"}</code>, and related records as{" "}
                <code>{"{related.invoices.total}"}</code>. Division by zero and missing
                values produce an empty result, never an error.
            </p>
        </div>
    );
};

const StatusLine = ({ status, error }) => {
    if (error) {
        return (
            <p className="flex items-start gap-1.5" style={{ fontSize: 12, color: "#c0392b" }}>
                <X size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
            </p>
        );
    }
    if (!status) return null;
    if (!status.valid) {
        return (
            <p className="flex items-start gap-1.5" style={{ fontSize: 12, color: "#c0392b" }}>
                <AlertTriangle size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {status.error}
            </p>
        );
    }
    return (
        <p className="flex items-start gap-1.5" style={{ fontSize: 12, color: OLIVE }}>
            <Check size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            Valid
            {status.dependencies?.length > 0 && (
                <span style={{ color: HINT }}>
                    · depends on {status.dependencies.join(", ")}
                </span>
            )}
        </p>
    );
};

const Picker = ({ label, options, onPick }) => (
    <select
        value=""
        onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
        style={{ ...control, appearance: "auto", maxWidth: 260 }}
    >
        <option value="">{label}…</option>
        {options.map((option) => (
            <option key={option.value + option.label} value={option.value}>{option.label}</option>
        ))}
    </select>
);
