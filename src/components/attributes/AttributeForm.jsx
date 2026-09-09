import React, { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { AlertTriangle, X } from 'lucide-react';
import { ATTRIBUTE_TYPE_GROUPS, emptyValueFor, formatCurrency, normalizeOptions } from '../../utils/attributeTypes';
import { CURRENCY_LIST } from '../../utils/currencies';
import { useAttributeRegistry } from '../../hooks/useAttributeRegistry';
import { TypeConfigPanel } from './TypeConfigPanel';
import { AttributePreview } from './AttributePreview';
import { OptionsEditor } from './OptionsEditor';
import { FormulaEditor } from './FormulaEditor';

const INK = "#2E2A26";
const MUTED = "#6b6560";
const HINT = "#9b948e";
const OAT = "#F2EBDD";
const PEBBLE = "#D8D2C4";
const OLIVE = "#5E6A43";
const FONT = '"Source Sans 3", Arial, sans-serif';

const inputStyle = {
    backgroundColor: "#fff", border: `1px solid ${PEBBLE}`, color: INK,
    borderRadius: 6, padding: "8px 10px", fontSize: 14, width: "100%",
    fontFamily: FONT, outline: "none",
};

const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: MUTED, marginBottom: 5, fontFamily: FONT,
};

const SECTION = {
    border: `1px solid ${PEBBLE}`, borderRadius: 10, padding: 14, backgroundColor: "#fff",
};

const sectionTitle = (n, text) => (
    <p style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
        color: HINT, marginBottom: 10,
    }}>
        <span style={{ color: OLIVE }}>{n}</span> &nbsp;{text}
    </p>
);

const slugify = (label) =>
    label.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

const EMPTY = {
    name: "", label: "", description: "", placeholder: "", type: "text",
    order: 1, is_required: false, is_unique: false, is_filterable: true,
    show_in_table: false, list_values: [], format_config: {},
    is_calculated: false, formula: "",
};

/**
 * Create/edit form for an Attribute or PipelineAttribute.
 *
 * One component for all three screens that manage attributes (Attributes.jsx,
 * PipelineAttributesAdmin.jsx and the pipeline detail page). There used to be
 * three separate implementations, including a full inline copy in Pipeline.jsx,
 * each with its own defaults and its own format_config serialization — which is
 * exactly how types shipped half-wired before.
 *
 * The type-specific settings in section ③ are generated from the registry
 * (GET /api/attribute-types/), so adding an option on the backend surfaces here
 * with no change to this file.
 */
export const AttributeForm = ({
    entity, onSubmit, onCancel, isLoading, initialData = null,
    defaultOrder = 1, supportsUnique = false, usageCount = null,
    siblings = [], rollupEntity = null,
}) => {
    const isEdit = !!initialData;
    const { types, byType, ready } = useAttributeRegistry();

    const [draft, setDraft] = useState(EMPTY);
    const [previewValue, setPreviewValue] = useState("");
    const [errors, setErrors] = useState({});
    const [typeChange, setTypeChange] = useState(null);

    useEffect(() => {
        if (initialData) {
            setDraft({
                ...EMPTY,
                ...initialData,
                list_values: normalizeOptions(initialData.list_values),
                format_config: initialData.format_config || {},
            });
        } else {
            setDraft({ ...EMPTY, order: defaultOrder });
        }
        setPreviewValue("");
        setErrors({});
        setTypeChange(null);
    }, [initialData, defaultOrder]);

    const typeMeta = byType[draft.type];
    const usesOptions = typeMeta?.uses_list_values ?? ["list", "multiselect"].includes(draft.type);
    // A derived value is not typed in, so required and unique cannot apply.
    const canBeUnique = supportsUnique && (typeMeta?.supports_unique ?? false) && !draft.is_calculated;
    // Options belong to a value someone picks; a calculated list would have to
    // produce one of them, which is a different feature.
    const canBeCalculated = !usesOptions;

    // Reset the preview whenever the shape of the value changes under it.
    useEffect(() => { setPreviewValue(emptyValueFor({ type: draft.type })); }, [draft.type]);

    const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

    const handleLabelChange = (label) => {
        // The key is only auto-derived while the attribute is new: it is the
        // JSON key every stored record uses, so it must never move afterwards.
        set(isEdit ? { label } : { label, name: slugify(label) });
    };

    const requestTypeChange = (nextType) => {
        if (nextType === draft.type) return;
        if (isEdit) {
            // Changing the type of a field that already holds data can make
            // those values invalid. Say so, with the count, before doing it.
            setTypeChange({ from: draft.type, to: nextType });
            return;
        }
        set({ type: nextType, format_config: {}, list_values: [] });
    };

    const confirmTypeChange = () => {
        set({
            type: typeChange.to,
            // Options and settings belong to the old type; carrying them over
            // would leave config that the new type's schema rejects.
            format_config: {},
            list_values: [],
            is_unique: false,
        });
        setTypeChange(null);
    };

    const validate = () => {
        const next = {};
        if (!draft.label.trim()) next.label = "Label is required";
        if (!draft.name.trim()) next.name = "Key is required";
        else if (!/^[a-z][a-z0-9_]*$/.test(draft.name))
            next.name = "Lowercase letters, numbers and underscores; must start with a letter";
        if (!draft.order || draft.order < 1) next.order = "Minimum value is 1";
        if (usesOptions) {
            const options = normalizeOptions(draft.list_values);
            if (options.length === 0) next.list_values = "Add at least one option";
            else if (options.some((o) => !String(o.value || "").trim()))
                next.list_values = "Every option needs a label";
        }
        if (draft.is_calculated && !String(draft.formula || "").trim())
            next.formula = "A calculated field needs a formula";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        const payload = {
            ...draft,
            order: Number(draft.order),
            list_values: usesOptions ? normalizeOptions(draft.list_values) : [],
            is_unique: canBeUnique ? !!draft.is_unique : false,
            is_calculated: canBeCalculated && !!draft.is_calculated,
            formula: canBeCalculated && draft.is_calculated ? draft.formula : "",
            is_required: draft.is_calculated ? false : !!draft.is_required,
            // Drop options the current type does not declare — they would be
            // rejected by the backend's format_config validation.
            format_config: pickKnownConfig(draft.format_config, typeMeta),
        };
        onSubmit(payload);
    };

    const rules = useMemo(
        () => describeRules(draft, typeMeta, canBeUnique),
        [draft, typeMeta, canBeUnique]
    );

    const grouped = useMemo(() => {
        const list = types.length ? types : [];
        return ATTRIBUTE_TYPE_GROUPS
            .map((g) => ({ ...g, items: list.filter((t) => t.group === g.value) }))
            .filter((g) => g.items.length);
    }, [types]);

    return (
        <form onSubmit={handleSubmit} style={{ fontFamily: FONT }} className="flex flex-col max-h-[86vh]">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between shrink-0 pb-3"
                 style={{ borderBottom: `1px solid ${PEBBLE}` }}>
                <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: INK }}>
                        {isEdit ? 'Edit field' : 'New field'}
                    </p>
                    {entity && (
                        <p style={{ fontSize: 12, color: HINT, marginTop: 2 }}>
                            {String(entity).replace(/_/g, ' ')}
                        </p>
                    )}
                </div>
                <button type="button" onClick={onCancel}
                        className="flex h-7 w-7 items-center justify-center rounded-md cursor-pointer"
                        style={{ color: HINT }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = OAT)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <X size={16} />
                </button>
            </div>

            {/* ── Body: settings | preview ───────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto py-4">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
                    <div className="flex flex-col gap-3 min-w-0">

                        {/* ① Identity */}
                        <div style={SECTION}>
                            {sectionTitle('①', 'Identity')}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label style={labelStyle}>Label</label>
                                    <input value={draft.label} style={inputStyle}
                                           placeholder="e.g. Annual budget"
                                           onChange={(e) => handleLabelChange(e.target.value)} />
                                    {errors.label && <Err>{errors.label}</Err>}
                                </div>
                                <div>
                                    <label style={labelStyle}>Key</label>
                                    <input value={draft.name} disabled={isEdit}
                                           placeholder="annual_budget"
                                           style={{ ...inputStyle, opacity: isEdit ? 0.6 : 1,
                                                    cursor: isEdit ? "not-allowed" : "text",
                                                    fontFamily: "ui-monospace, monospace" }}
                                           onChange={(e) => set({ name: e.target.value })} />
                                    {errors.name
                                        ? <Err>{errors.name}</Err>
                                        : <Hint>{isEdit
                                            ? "Fixed — records are stored under this key."
                                            : "Auto-filled from the label. Cannot change later."}</Hint>}
                                </div>
                                <div>
                                    <label style={labelStyle}>Help text</label>
                                    <input value={draft.description || ""} style={inputStyle}
                                           placeholder="Shown under the field"
                                           onChange={(e) => set({ description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label style={labelStyle}>Placeholder</label>
                                        <input value={draft.placeholder || ""} style={inputStyle}
                                               onChange={(e) => set({ placeholder: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Order</label>
                                        <input type="number" min="1" value={draft.order} style={inputStyle}
                                               onChange={(e) => set({ order: e.target.value })} />
                                        {errors.order && <Err>{errors.order}</Err>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ② Type */}
                        <div style={SECTION}>
                            {sectionTitle('②', 'Type')}
                            {!ready && <Hint>Loading types…</Hint>}
                            <div className="flex flex-col gap-2.5">
                                {grouped.map((group) => (
                                    <div key={group.value}>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: HINT,
                                                    textTransform: "uppercase", letterSpacing: "0.08em",
                                                    marginBottom: 5 }}>
                                            {group.label}
                                        </p>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                            {group.items.map((t) => (
                                                <TypeCard
                                                    key={t.value}
                                                    type={t}
                                                    selected={t.value === draft.type}
                                                    onClick={() => requestTypeChange(t.value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ③ Formula, or the type-specific settings */}
                        <div style={SECTION}>
                            {sectionTitle('③', draft.is_calculated
                                ? 'Formula'
                                : `${typeMeta?.label || draft.type} settings`)}

                            {canBeCalculated && (
                                <label className="flex items-start gap-2 rounded-md p-2 mb-3 cursor-pointer"
                                       style={{ border: `1px solid ${PEBBLE}` }}>
                                    <input
                                        type="checkbox"
                                        checked={!!draft.is_calculated}
                                        onChange={(e) => set({
                                            is_calculated: e.target.checked,
                                            is_required: false,
                                            is_unique: false,
                                        })}
                                        style={{ accentColor: OLIVE, width: 14, height: 14, marginTop: 2 }}
                                    />
                                    <span>
                                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK }}>
                                            This field is calculated
                                        </span>
                                        <span style={{ display: "block", fontSize: 11, color: HINT }}>
                                            Its value comes from a formula and is recomputed every time
                                            the record is saved. Nobody types into it.
                                        </span>
                                    </span>
                                </label>
                            )}

                            {draft.is_calculated ? (
                                <FormulaEditor
                                    formula={draft.formula}
                                    onChange={(formula) => set({ formula })}
                                    outputType={draft.type}
                                    siblings={siblings.filter((a) => a.name !== draft.name)}
                                    entity={rollupEntity}
                                    error={errors.formula}
                                />
                            ) : (
                            <>
                            {usesOptions && (
                                <div className="mb-4">
                                    <OptionsEditor
                                        value={draft.list_values}
                                        onChange={(list_values) => set({ list_values })}
                                        error={errors.list_values}
                                    />
                                </div>
                            )}
                            <TypeConfigPanel
                                typeMeta={typeMeta}
                                config={draft.format_config}
                                currencies={CURRENCY_LIST}
                                onChange={(format_config) => set({ format_config })}
                            />
                            </>
                            )}
                        </div>

                        {/* ④ Behaviour */}
                        <div style={SECTION}>
                            {sectionTitle('④', 'Behaviour')}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Toggle checked={draft.is_required} label="Required"
                                        disabled={draft.is_calculated}
                                        hint={draft.is_calculated
                                            ? "Not available for a calculated field"
                                            : "Cannot be left empty"}
                                        onChange={(v) => set({ is_required: v })} />
                                <Toggle checked={draft.is_unique} label="Unique"
                                        disabled={!canBeUnique}
                                        hint={canBeUnique
                                            ? "No two records may share this value"
                                            : `Not available for ${typeMeta?.label || draft.type}`}
                                        onChange={(v) => set({ is_unique: v })} />
                                <Toggle checked={draft.is_filterable} label="Filterable"
                                        hint="Offer this field in list filters"
                                        onChange={(v) => set({ is_filterable: v })} />
                                <Toggle checked={draft.show_in_table} label="Column in tables"
                                        hint="Show as a column by default"
                                        onChange={(v) => set({ show_in_table: v })} />
                            </div>
                        </div>
                    </div>

                    {/* Preview column */}
                    <div className="lg:sticky lg:top-0 self-start w-full">
                        <AttributePreview
                            draft={draft}
                            value={previewValue}
                            onChange={setPreviewValue}
                            rules={rules}
                        />
                    </div>
                </div>
            </div>

            {/* ── Type-change confirmation ───────────────────────────────── */}
            {typeChange && (
                <div className="shrink-0 rounded-lg p-3 mb-2"
                     style={{ backgroundColor: "rgba(242,155,107,0.12)", border: "1px solid #F29B6B" }}>
                    <div className="flex gap-2">
                        <AlertTriangle size={16} style={{ color: "#c0622a", flexShrink: 0, marginTop: 2 }} />
                        <div className="flex-1">
                            <p style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                                Change {byType[typeChange.from]?.label || typeChange.from} to{' '}
                                {byType[typeChange.to]?.label || typeChange.to}?
                            </p>
                            <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                                {usageCount === null
                                    ? "Existing values that do not fit the new type will be rejected the next time each record is saved. The stored data itself is not touched."
                                    : usageCount === 0
                                        ? "No record uses this field yet, so nothing can break."
                                        : `${usageCount} record(s) hold a value for this field. Any that do not fit the new type will be rejected the next time that record is saved. The stored data itself is not touched.`}
                            </p>
                            <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                                Its settings and options will be cleared.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button type="button" onClick={confirmTypeChange}
                                        className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer"
                                        style={{ backgroundColor: "#c0622a", color: "#FBF7EF" }}>
                                    Change type
                                </button>
                                <button type="button" onClick={() => setTypeChange(null)}
                                        className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer"
                                        style={{ border: `1px solid ${PEBBLE}`, color: MUTED }}>
                                    Keep {byType[typeChange.from]?.label || typeChange.from}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Actions ────────────────────────────────────────────────── */}
            <div className="flex justify-end gap-2 pt-3 shrink-0" style={{ borderTop: `1px solid ${PEBBLE}` }}>
                <button type="button" onClick={onCancel} disabled={isLoading}
                        className="h-9 px-4 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{ border: `1px solid ${PEBBLE}`, backgroundColor: "transparent", color: MUTED }}>
                    Cancel
                </button>
                <button type="submit" disabled={isLoading}
                        className="h-9 px-4 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: isLoading ? "#4a5535" : OLIVE, color: "#FBF7EF",
                                 opacity: isLoading ? 0.7 : 1 }}>
                    {isLoading ? 'Saving…' : 'Save field'}
                </button>
            </div>
        </form>
    );
};

const TypeCard = ({ type, selected, onClick }) => {
    const Icon = Icons[type.icon] || Icons.Type;
    return (
        <button
            type="button"
            onClick={onClick}
            title={type.label}
            className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors cursor-pointer"
            style={{
                border: `1px solid ${selected ? OLIVE : PEBBLE}`,
                backgroundColor: selected ? "rgba(94,106,67,0.10)" : "#fff",
                color: selected ? OLIVE : MUTED,
            }}
        >
            <Icon size={15} />
            <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.1, textAlign: "center" }}>
                {type.label}
            </span>
        </button>
    );
};

const Toggle = ({ checked, label, hint, onChange, disabled }) => (
    <label className="flex items-start gap-2 rounded-md p-2 cursor-pointer"
           style={{ border: `1px solid ${PEBBLE}`, opacity: disabled ? 0.55 : 1,
                    cursor: disabled ? "not-allowed" : "pointer" }}>
        <input type="checkbox" checked={!!checked} disabled={disabled}
               onChange={(e) => onChange(e.target.checked)}
               style={{ accentColor: OLIVE, width: 14, height: 14, marginTop: 2 }} />
        <span>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK }}>{label}</span>
            <span style={{ display: "block", fontSize: 11, color: HINT }}>{hint}</span>
        </span>
    </label>
);

const Err = ({ children }) => <span style={{ color: "#c0392b", fontSize: 11 }}>{children}</span>;
const Hint = ({ children }) => <p style={{ fontSize: 11, color: HINT, marginTop: 3 }}>{children}</p>;

// Only options the current type declares survive — carrying a previous type's
// settings over would be rejected by the backend's format_config validation.
const pickKnownConfig = (config, typeMeta) => {
    const schema = typeMeta?.config_schema;
    if (!schema) return config || {};
    const out = {};
    Object.entries(config || {}).forEach(([key, value]) => {
        if (key in schema && value !== null && value !== undefined && value !== "") out[key] = value;
    });
    return out;
};

// Plain-language summary of what the field will accept — "Between ₡0 and
// ₡50,000,000", not "min: 0, max: 50000000".
const describeRules = (draft, typeMeta, canBeUnique) => {
    const c = draft.format_config || {};
    const rules = [];
    if (draft.is_calculated) {
        rules.push("Calculated — recomputed on every save, read-only in forms");
        if (draft.formula_dependencies?.length)
            rules.push(`Depends on ${draft.formula_dependencies.join(", ")}`);
    }
    if (draft.is_required) rules.push("Required — cannot be left empty");
    if (canBeUnique && draft.is_unique) rules.push("Must be unique across records");

    const money = (n) => formatCurrency(n, c);
    const isMoney = draft.type === "currency";

    if (c.min != null && c.max != null)
        rules.push(`Between ${isMoney ? money(c.min) : c.min} and ${isMoney ? money(c.max) : c.max}`);
    else if (c.min != null) rules.push(`At least ${isMoney ? money(c.min) : c.min}`);
    else if (c.max != null) rules.push(`At most ${isMoney ? money(c.max) : c.max}`);

    if (c.allow_negative === false) rules.push("Negative values are not allowed");
    if (c.decimals != null) rules.push(`${c.decimals} decimal place(s)`);
    if (c.min_length != null && c.max_length != null)
        rules.push(`Between ${c.min_length} and ${c.max_length} characters`);
    else if (c.min_length != null) rules.push(`At least ${c.min_length} characters`);
    else if (c.max_length != null) rules.push(`At most ${c.max_length} characters`);

    if (c.mask) rules.push(`Must match the format ${c.mask}`);
    if (c.pattern) rules.push("Must match a specific pattern");
    if (c.transform && c.transform !== "none") rules.push(`Stored in ${c.transform}`);
    if (c.allowed_domains?.length) rules.push(`Only these domains: ${c.allowed_domains.join(", ")}`);
    if (c.blocked_domains?.length) rules.push(`Blocked domains: ${c.blocked_domains.join(", ")}`);
    if (c.allowed_schemes?.length && draft.type === "url")
        rules.push(`Only ${c.allowed_schemes.join(" / ")} links`);
    if (c.require_valid) rules.push("Must be a real, dialable phone number");
    if (c.allowed_countries?.length) rules.push(`Only from: ${c.allowed_countries.join(", ")}`);
    if (c.number_type && c.number_type !== "any") rules.push(`Must be a ${c.number_type.replace("_", " ")} number`);
    if (c.relative_constraint === "no_past") rules.push("Cannot be in the past");
    if (c.relative_constraint === "no_future") rules.push("Cannot be in the future");
    if (c.min_date) rules.push(`Not earlier than ${c.min_date}`);
    if (c.max_date) rules.push(`Not later than ${c.max_date}`);
    if (c.min_selected != null) rules.push(`At least ${c.min_selected} selected`);
    if (c.max_selected != null) rules.push(`At most ${c.max_selected} selected`);
    if (draft.type === "currency") rules.push(`Amounts in ${c.currency_code || "USD"}`);

    return rules;
};
