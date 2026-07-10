import React, { useEffect, useState } from "react";
import { getPipelines } from "../services/pipelineService";
import { getPipelineAttributes, createPipelineAttribute, updatePipelineAttribute, deletePipelineAttribute } from "../services/pipelineAttributeService";
import { getStageValidationRules, createStageValidationRule, updateStageValidationRule, deleteStageValidationRule } from "../services/stageValidationService";
import { PipelineForm } from "../components/pipelines/PipelineForm";
import { PipelineModal } from "../components/pipelines/PipelineModal";
import { Plus, Edit2, Columns, ChevronDown, ChevronUp, Trash2, SlidersHorizontal, ShieldCheck } from "lucide-react";

const FONT = '"Source Sans 3", Arial, sans-serif';
const INK = "#2E2A26";
const MUTED = "#6b6560";
const HINT = "#9b948e";
const LINEN = "#FBF7EF";
const OAT = "#F2EBDD";
const PEBBLE = "#D8D2C4";
const OLIVE = "#5E6A43";
const APRICOT = "#F29B6B";

const TYPE_LABELS = {
    text: "Text", number: "Number", date: "Date",
    list: "Select List", boolean: "Boolean", textarea: "Text Area",
};

const textColorForBg = (hex) => {
    if (!hex) return INK;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? INK : LINEN;
};

const EMPTY_FORM = { label: "", name: "", type: "text", is_required: false, is_unique: false, order: 0, list_values: [], description: "" };

function AttributeManager({ pipeline }) {
    const [attrs, setAttrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [listInput, setListInput] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        load();
    }, [pipeline.id]);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getPipelineAttributes(pipeline.id);
            setAttrs(data);
        } catch {
            setError("Could not load attributes.");
        } finally {
            setLoading(false);
        }
    };

    const autoName = (label) => label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const handleLabelChange = (label) => {
        setForm(prev => ({
            ...prev,
            label,
            name: editingId ? prev.name : autoName(label),
        }));
    };

    const startEdit = (attr) => {
        setEditingId(attr.id);
        setForm({
            label: attr.label,
            name: attr.name,
            type: attr.type,
            is_required: attr.is_required,
            is_unique: attr.is_unique,
            order: attr.order,
            list_values: attr.list_values || [],
            description: attr.description || "",
        });
        setListInput((attr.list_values || []).join(", "));
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setListInput("");
        setError(null);
    };

    const handleSave = async () => {
        if (!form.label.trim() || !form.name.trim()) {
            setError("Label and key name are required.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                list_values: form.type === "list"
                    ? listInput.split(",").map(s => s.trim()).filter(Boolean)
                    : [],
            };
            if (editingId) {
                await updatePipelineAttribute(pipeline.id, editingId, payload);
            } else {
                await createPipelineAttribute(pipeline.id, payload);
            }
            cancelEdit();
            await load();
        } catch (err) {
            setError(err.message || "Error saving attribute.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (attrId) => {
        if (!window.confirm("Delete this attribute?")) return;
        try {
            await deletePipelineAttribute(pipeline.id, attrId);
            await load();
        } catch {
            setError("Error deleting attribute.");
        }
    };

    const inputStyle = {
        width: "100%", padding: "6px 10px", border: `1px solid ${PEBBLE}`,
        borderRadius: "6px", backgroundColor: "#fff", color: INK,
        fontFamily: FONT, fontSize: "13px", outline: "none", boxSizing: "border-box",
    };

    return (
        <div
            style={{ borderTop: `1px solid ${PEBBLE}`, marginTop: "16px", paddingTop: "16px" }}
            onClick={e => e.stopPropagation()}
        >
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: HINT, marginBottom: "12px", fontFamily: FONT }}>
                Lead Fields
            </p>

            {loading ? (
                <p style={{ fontSize: "13px", color: HINT, fontFamily: FONT }}>Loading...</p>
            ) : (
                <>
                    {attrs.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                            {attrs.map(attr => (
                                <div key={attr.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", backgroundColor: OAT, borderRadius: "6px", border: `1px solid ${PEBBLE}` }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: "13px", fontWeight: 600, color: INK, fontFamily: FONT }}>{attr.label}</span>
                                        <span style={{ fontSize: "11px", color: HINT, marginLeft: "6px", fontFamily: FONT }}>{TYPE_LABELS[attr.type]}</span>
                                        {attr.is_required && (
                                            <span style={{ fontSize: "10px", color: OLIVE, fontWeight: 700, marginLeft: "6px", fontFamily: FONT }}>REQ</span>
                                        )}
                                        {attr.is_unique && (
                                            <span style={{ fontSize: "10px", color: APRICOT, fontWeight: 700, marginLeft: "6px", fontFamily: FONT }}>UNIQUE</span>
                                        )}
                                        <span style={{ fontSize: "11px", color: PEBBLE, marginLeft: "6px", fontFamily: FONT }}>·</span>
                                        <span style={{ fontSize: "11px", color: HINT, marginLeft: "6px", fontFamily: FONT }}>{attr.name}</span>
                                    </div>
                                    <button
                                        onClick={() => startEdit(attr)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: HINT, padding: "2px" }}
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(attr.id)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "2px" }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add / Edit form */}
                    <div style={{ backgroundColor: "#fff", border: `1px solid ${PEBBLE}`, borderRadius: "8px", padding: "12px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: INK, marginBottom: "10px", fontFamily: FONT }}>
                            {editingId ? "Edit Field" : "Add Field"}
                        </p>

                        {error && (
                            <p style={{ fontSize: "12px", color: "#dc2626", marginBottom: "8px", fontFamily: FONT }}>{error}</p>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                            <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Label *</p>
                                <input style={inputStyle} value={form.label} onChange={e => handleLabelChange(e.target.value)} placeholder="e.g. First Name" />
                            </div>
                            <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Key name *</p>
                                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. first_name" />
                            </div>
                            <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Type *</p>
                                <select style={inputStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Order</p>
                                <input style={inputStyle} type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))} />
                            </div>
                        </div>

                        {form.type === "list" && (
                            <div style={{ marginBottom: "8px" }}>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Options (comma-separated)</p>
                                <input style={inputStyle} value={listInput} onChange={e => setListInput(e.target.value)} placeholder="Option A, Option B, Option C" />
                            </div>
                        )}

                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: INK, fontFamily: FONT, cursor: "pointer", marginBottom: "8px" }}>
                            <input type="checkbox" checked={form.is_required} onChange={e => setForm(p => ({ ...p, is_required: e.target.checked }))} style={{ accentColor: OLIVE }} />
                            Required field
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: INK, fontFamily: FONT, cursor: "pointer", marginBottom: "10px" }}>
                            <input type="checkbox" checked={form.is_unique} onChange={e => setForm(p => ({ ...p, is_unique: e.target.checked }))} style={{ accentColor: OLIVE }} />
                            Unique — no two leads can share this value
                        </label>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{ flex: 1, padding: "7px", backgroundColor: OLIVE, color: LINEN, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, fontFamily: FONT, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? "Saving..." : editingId ? "Update" : "Add Field"}
                            </button>
                            {editingId && (
                                <button
                                    onClick={cancelEdit}
                                    style={{ padding: "7px 14px", backgroundColor: "transparent", color: MUTED, border: `1px solid ${PEBBLE}`, borderRadius: "6px", fontSize: "12px", fontFamily: FONT, cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const OPERATORS = [
    { value: "=", label: "= equals" },
    { value: "!=", label: "≠ not equals" },
    { value: ">", label: "> greater than" },
    { value: "<", label: "< less than" },
    { value: ">=", label: "≥ greater or equal" },
    { value: "<=", label: "≤ less or equal" },
    { value: "in", label: "in (list)" },
    { value: "contains", label: "contains" },
    { value: "is_not_empty", label: "is filled in" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_null", label: "is not null" },
    { value: "is_null", label: "is null" },
];

const UNARY_OPERATORS = new Set(["is_null", "is_not_null", "is_empty", "is_not_empty"]);

const EMPTY_RULE_FORM = {
    name: "", target_stage: "", conditions: [{ field: "", operator: "is_not_empty", value: "" }],
    condition_logic: "AND", error_message: "", is_active: true,
};

function ValidationRuleManager({ pipeline }) {
    const [rules, setRules] = useState([]);
    const [attrs, setAttrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_RULE_FORM);
    const [error, setError] = useState(null);

    useEffect(() => {
        load();
    }, [pipeline.id]);

    const load = async () => {
        setLoading(true);
        try {
            const [ruleData, attrData] = await Promise.all([
                getStageValidationRules(pipeline.id),
                getPipelineAttributes(pipeline.id),
            ]);
            setRules(ruleData);
            setAttrs(attrData);
        } catch {
            setError("Could not load validation rules.");
        } finally {
            setLoading(false);
        }
    };

    const sortedStages = (pipeline.stages || []).slice().sort((a, b) => a.order - b.order);
    const fieldSuggestions = attrs.map(a => `attributes.${a.name}`);

    const startEdit = (rule) => {
        setEditingId(rule.id);
        setForm({
            name: rule.name,
            target_stage: rule.target_stage,
            conditions: rule.conditions?.length ? rule.conditions : [{ field: "", operator: "is_not_empty", value: "" }],
            condition_logic: rule.condition_logic,
            error_message: rule.error_message || "",
            is_active: rule.is_active,
        });
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(EMPTY_RULE_FORM);
        setError(null);
    };

    const updateCondition = (index, field, value) => {
        setForm(prev => {
            const next = [...prev.conditions];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, conditions: next };
        });
    };

    const addCondition = () => {
        setForm(prev => ({ ...prev, conditions: [...prev.conditions, { field: "", operator: "is_not_empty", value: "" }] }));
    };

    const removeCondition = (index) => {
        setForm(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }));
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.target_stage) {
            setError("Name and target stage are required.");
            return;
        }
        const cleanConditions = form.conditions
            .filter(c => c.field.trim())
            .map(c => (UNARY_OPERATORS.has(c.operator) ? { field: c.field, operator: c.operator, value: "" } : c));
        if (cleanConditions.length === 0) {
            setError("At least one condition is required.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const payload = { ...form, conditions: cleanConditions, pipeline: pipeline.id };
            if (editingId) {
                await updateStageValidationRule(editingId, payload);
            } else {
                await createStageValidationRule(payload);
            }
            cancelEdit();
            await load();
        } catch (err) {
            setError(err.message || "Error saving rule.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (ruleId) => {
        if (!window.confirm("Delete this validation rule?")) return;
        try {
            await deleteStageValidationRule(ruleId);
            await load();
        } catch {
            setError("Error deleting rule.");
        }
    };

    const inputStyle = {
        width: "100%", padding: "6px 10px", border: `1px solid ${PEBBLE}`,
        borderRadius: "6px", backgroundColor: "#fff", color: INK,
        fontFamily: FONT, fontSize: "13px", outline: "none", boxSizing: "border-box",
    };

    return (
        <div
            style={{ borderTop: `1px solid ${PEBBLE}`, marginTop: "16px", paddingTop: "16px" }}
            onClick={e => e.stopPropagation()}
        >
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: HINT, marginBottom: "12px", fontFamily: FONT }}>
                Stage Rules
            </p>

            {loading ? (
                <p style={{ fontSize: "13px", color: HINT, fontFamily: FONT }}>Loading...</p>
            ) : (
                <>
                    {rules.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                            {rules.map(rule => (
                                <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", backgroundColor: OAT, borderRadius: "6px", border: `1px solid ${PEBBLE}` }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: "13px", fontWeight: 600, color: INK, fontFamily: FONT }}>{rule.name}</span>
                                        <span style={{ fontSize: "11px", color: HINT, marginLeft: "6px", fontFamily: FONT }}>→ {rule.target_stage}</span>
                                        {!rule.is_active && (
                                            <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: 700, marginLeft: "6px", fontFamily: FONT }}>INACTIVE</span>
                                        )}
                                        <div style={{ fontSize: "11px", color: HINT, fontFamily: FONT, marginTop: "2px" }}>
                                            {rule.conditions.map(c => `${c.field} ${c.operator}${UNARY_OPERATORS.has(c.operator) ? '' : ' ' + c.value}`).join(rule.condition_logic === 'AND' ? " AND " : " OR ")}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startEdit(rule)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: HINT, padding: "2px" }}
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rule.id)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "2px" }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add / Edit form */}
                    <div style={{ backgroundColor: "#fff", border: `1px solid ${PEBBLE}`, borderRadius: "8px", padding: "12px" }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: INK, marginBottom: "10px", fontFamily: FONT }}>
                            {editingId ? "Edit Rule" : "Add Rule"}
                        </p>

                        {error && (
                            <p style={{ fontSize: "12px", color: "#dc2626", marginBottom: "8px", fontFamily: FONT }}>{error}</p>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                            <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Rule name *</p>
                                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Contract required" />
                            </div>
                            <div>
                                <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Target stage *</p>
                                <select style={inputStyle} value={form.target_stage} onChange={e => setForm(p => ({ ...p, target_stage: e.target.value }))}>
                                    <option value="">Select stage...</option>
                                    {sortedStages.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "6px", fontFamily: FONT }}>
                            Conditions (must all be true for a lead to reach this stage)
                        </p>

                        <datalist id={`field-suggestions-${pipeline.id}`}>
                            {fieldSuggestions.map(f => <option key={f} value={f} />)}
                        </datalist>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                            {form.conditions.map((cond, idx) => (
                                <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    <input
                                        style={{ ...inputStyle, flex: "1.2" }}
                                        list={`field-suggestions-${pipeline.id}`}
                                        value={cond.field}
                                        onChange={e => updateCondition(idx, "field", e.target.value)}
                                        placeholder="attributes.field_name"
                                    />
                                    <select
                                        style={{ ...inputStyle, flex: "1" }}
                                        value={cond.operator}
                                        onChange={e => updateCondition(idx, "operator", e.target.value)}
                                    >
                                        {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                    </select>
                                    {!UNARY_OPERATORS.has(cond.operator) && (
                                        <input
                                            style={{ ...inputStyle, flex: "1" }}
                                            value={cond.value}
                                            onChange={e => updateCondition(idx, "value", e.target.value)}
                                            placeholder="Value"
                                        />
                                    )}
                                    <button
                                        onClick={() => removeCondition(idx)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "2px" }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                            <button
                                onClick={addCondition}
                                style={{ padding: "5px 10px", backgroundColor: "transparent", color: OLIVE, border: `1px dashed ${OLIVE}`, borderRadius: "6px", fontSize: "11px", fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}
                            >
                                + Add condition
                            </button>

                            {form.conditions.length > 1 && (
                                <div style={{ display: "flex", gap: "4px", fontSize: "11px", fontFamily: FONT }}>
                                    <button
                                        onClick={() => setForm(p => ({ ...p, condition_logic: "AND" }))}
                                        style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${form.condition_logic === "AND" ? OLIVE : PEBBLE}`, backgroundColor: form.condition_logic === "AND" ? OLIVE : "transparent", color: form.condition_logic === "AND" ? LINEN : MUTED, cursor: "pointer", fontWeight: 600 }}
                                    >
                                        Match ALL (AND)
                                    </button>
                                    <button
                                        onClick={() => setForm(p => ({ ...p, condition_logic: "OR" }))}
                                        style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${form.condition_logic === "OR" ? OLIVE : PEBBLE}`, backgroundColor: form.condition_logic === "OR" ? OLIVE : "transparent", color: form.condition_logic === "OR" ? LINEN : MUTED, cursor: "pointer", fontWeight: 600 }}
                                    >
                                        Match ANY (OR)
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: INK, marginBottom: "3px", fontFamily: FONT }}>Custom error message (optional)</p>
                            <input
                                style={inputStyle}
                                value={form.error_message}
                                onChange={e => setForm(p => ({ ...p, error_message: e.target.value }))}
                                placeholder="Shown to the user when the rule blocks the move"
                            />
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: INK, fontFamily: FONT, cursor: "pointer", marginBottom: "10px" }}>
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: OLIVE }} />
                            Active
                        </label>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{ flex: 1, padding: "7px", backgroundColor: OLIVE, color: LINEN, border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, fontFamily: FONT, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? "Saving..." : editingId ? "Update" : "Add Rule"}
                            </button>
                            {editingId && (
                                <button
                                    onClick={cancelEdit}
                                    style={{ padding: "7px 14px", backgroundColor: "transparent", color: MUTED, border: `1px solid ${PEBBLE}`, borderRadius: "6px", fontSize: "12px", fontFamily: FONT, cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export const Pipeline = () => {
    const [pipelines, setPipelines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPipeline, setEditingPipeline] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [expandedRulesId, setExpandedRulesId] = useState(null);

    const fetchPipelines = async () => {
        setLoading(true);
        try {
            const data = await getPipelines();
            setPipelines(data.results || data || []);
        } catch (error) {
            console.error("Error fetching pipelines", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPipelines(); }, []);

    const handleCreateClick = () => { setEditingPipeline(null); setIsModalOpen(true); };
    const handleEditClick = (pipeline) => { setEditingPipeline(pipeline); setIsModalOpen(true); };
    const handleSaved = () => { setIsModalOpen(false); fetchPipelines(); };

    const toggleAttributes = (e, pipelineId) => {
        e.stopPropagation();
        setExpandedId(prev => prev === pipelineId ? null : pipelineId);
    };

    const toggleRules = (e, pipelineId) => {
        e.stopPropagation();
        setExpandedRulesId(prev => prev === pipelineId ? null : pipelineId);
    };

    return (
        <div
            className="p-6 h-full flex flex-col"
            style={{ backgroundColor: LINEN, fontFamily: FONT }}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                    >
                        <Columns className="h-5 w-5" style={{ color: OLIVE }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold" style={{ color: INK, fontFamily: FONT }}>Pipelines</p>
                        <p className="text-sm" style={{ color: HINT }}>Manage your sales pipelines and stages</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: OLIVE, color: LINEN }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4a5535"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = OLIVE}
                >
                    <Plus size={16} /> New Pipeline
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center" style={{ color: MUTED }}>
                    Loading pipelines...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                    {pipelines.length === 0 ? (
                        <div
                            className="col-span-full text-center py-20 rounded-xl"
                            style={{ border: "1.5px dashed #D8D2C4", color: HINT }}
                        >
                            <Columns className="h-10 w-10 mx-auto mb-3 opacity-25" />
                            <p className="text-sm">No pipelines found.</p>
                            <p className="text-xs mt-1">Create one to get started.</p>
                        </div>
                    ) : pipelines.map((pipeline) => (
                        <div
                            key={pipeline.id}
                            className="rounded-xl p-5 group relative transition-all"
                            style={{ backgroundColor: LINEN, border: `1px solid ${PEBBLE}` }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = OLIVE; e.currentTarget.style.boxShadow = "0 4px 16px rgba(94,106,67,0.10)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = PEBBLE; e.currentTarget.style.boxShadow = "none"; }}
                        >
                            {/* Edit icon */}
                            <button
                                className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEditClick(pipeline)}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                title="Edit pipeline"
                            >
                                <div
                                    className="h-7 w-7 flex items-center justify-center rounded-full"
                                    style={{ backgroundColor: "rgba(94,106,67,0.10)" }}
                                >
                                    <Edit2 size={13} style={{ color: OLIVE }} />
                                </div>
                            </button>

                            {/* Pipeline title */}
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                                    style={{ backgroundColor: "rgba(94,106,67,0.10)", border: "1px solid rgba(94,106,67,0.25)" }}
                                >
                                    <Columns size={18} style={{ color: OLIVE }} />
                                </div>
                                <p className="font-semibold text-base leading-tight" style={{ color: INK }}>{pipeline.name}</p>
                            </div>

                            {/* Stages */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: HINT }}>Stages</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {pipeline.stages?.sort((a, b) => a.order - b.order).map((stage) => {
                                        const bg = stage.color || PEBBLE;
                                        const fg = textColorForBg(bg);
                                        return (
                                            <div
                                                key={stage.id || stage.name}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: bg, color: fg }}
                                            >
                                                {stage.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Manage Fields toggle */}
                            <div className="flex items-center gap-4 mt-4">
                                <button
                                    onClick={e => toggleAttributes(e, pipeline.id)}
                                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: expandedId === pipeline.id ? OLIVE : HINT, fontFamily: FONT, padding: 0 }}
                                >
                                    <SlidersHorizontal size={12} />
                                    Lead Fields
                                    {expandedId === pipeline.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>

                                <button
                                    onClick={e => toggleRules(e, pipeline.id)}
                                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: expandedRulesId === pipeline.id ? OLIVE : HINT, fontFamily: FONT, padding: 0 }}
                                >
                                    <ShieldCheck size={12} />
                                    Stage Rules
                                    {expandedRulesId === pipeline.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </div>

                            {/* Expandable attribute manager */}
                            {expandedId === pipeline.id && (
                                <AttributeManager pipeline={pipeline} />
                            )}

                            {/* Expandable validation rule manager */}
                            {expandedRulesId === pipeline.id && (
                                <ValidationRuleManager pipeline={pipeline} />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <PipelineModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <PipelineForm initialData={editingPipeline} onPipelineSaved={handleSaved} />
            </PipelineModal>
        </div>
    );
};
