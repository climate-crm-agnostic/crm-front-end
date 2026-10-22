import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { createIndicator, getIndicator, getIndicatorSchema, previewIndicator, updateIndicator } from "../services/indicatorService";
import { formatGoalValue } from "../lib/goalFormat";
import { formatCount } from "../lib/utils";

const NO_VALUE = ["is_empty", "is_not_empty"];
const LIST_OPS = ["in", "not_in"];

const EMPTY_RULE = {
    entity: "lead", aggregation: "count", value_field: "", date_field: "", owner_field: "",
    conditions: [], condition_logic: "AND",
};

const Section = ({ title, hint, children }) => (
    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
        <div className="border-b pb-2">
            <h3 className="font-medium text-lg">{title}</h3>
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
        {children}
    </div>
);

const Pick = ({ label, value, onChange, options, placeholder, error }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>
                {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
        </Select>
        {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
);

/** One value box, shaped by the field's kind and the operator. */
const ConditionValue = ({ column, condition, onChange }) => {
    if (NO_VALUE.includes(condition.operator)) return <p className="h-9 flex items-center text-sm text-muted-foreground">—</p>;

    if (column?.kind === "choice" && LIST_OPS.includes(condition.operator)) {
        const selected = Array.isArray(condition.value) ? condition.value : [];
        const toggle = (value) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
        return (
            <div className="flex flex-wrap gap-1.5">
                {column.choices.map((c) => (
                    <button
                        key={c.value} type="button" onClick={() => toggle(c.value)} aria-pressed={selected.includes(c.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${selected.includes(c.value) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
        );
    }
    if (column?.kind === "choice") {
        return (
            <Select value={condition.value ?? ""} onValueChange={onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{column.choices.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
        );
    }
    if (column?.kind === "bool") {
        return (
            <Select value={String(condition.value ?? "")} onValueChange={(v) => onChange(v === "true")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
            </Select>
        );
    }
    const asList = LIST_OPS.includes(condition.operator);
    return (
        <Input
            type={column?.kind === "number" ? "number" : column?.kind === "date" ? "date" : "text"}
            value={asList && Array.isArray(condition.value) ? condition.value.join(", ") : (condition.value ?? "")}
            placeholder={asList ? "value 1, value 2" : "Value"}
            onChange={(e) => onChange(asList ? e.target.value.split(",").map((v) => v.trim()).filter(Boolean) : e.target.value)}
        />
    );
};

export const IndicatorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === "new";

    const [schema, setSchema] = useState(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [rule, setRule] = useState(EMPTY_RULE);
    const [key, setKey] = useState("");
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const previewSeq = useRef(0);

    // Load the whitelist, and the KPI itself when editing.
    useEffect(() => {
        (async () => {
            try {
                const options = await getIndicatorSchema();
                setSchema(options);
                if (isNew) {
                    setRule(withDefaults(options, { ...EMPTY_RULE }));
                } else {
                    const indicator = await getIndicator(id);
                    setName(indicator.name);
                    setDescription(indicator.description || "");
                    setIsActive(indicator.is_active);
                    setKey(indicator.key);
                    setRule({
                        entity: indicator.entity, aggregation: indicator.aggregation, value_field: indicator.value_field,
                        date_field: indicator.date_field, owner_field: indicator.owner_field,
                        conditions: indicator.conditions || [], condition_logic: indicator.condition_logic,
                    });
                }
            } catch (err) {
                setErrors({ form: err.message });
            } finally {
                setFetching(false);
            }
        })();
    }, [id, isNew]);

    const entity = schema?.entities[rule.entity];
    const needsValueField = rule.aggregation !== "count";

    const setEntity = (value) => setRule(withDefaults(schema, { ...EMPTY_RULE, entity: value, aggregation: rule.aggregation }));
    const setAggregation = (value) => setRule((r) => ({ ...r, aggregation: value, value_field: value === "count" ? "" : (r.value_field || entity?.value_fields[0]?.value || "") }));
    const setCondition = (index, patch) => setRule((r) => ({ ...r, conditions: r.conditions.map((c, i) => i === index ? { ...c, ...patch } : c) }));
    const addCondition = () => {
        const first = entity?.filters[0];
        if (!first) return;
        setRule((r) => ({ ...r, conditions: [...r.conditions, { field: first.value, operator: schema.operators[first.kind][0].value, value: "" }] }));
    };
    const removeCondition = (index) => setRule((r) => ({ ...r, conditions: r.conditions.filter((_, i) => i !== index) }));
    const changeConditionField = (index, fieldName) => {
        const column = entity.filters.find((f) => f.value === fieldName);
        setCondition(index, { field: fieldName, operator: schema.operators[column.kind][0].value, value: "" });
    };
    const changeOperator = (index, operator) => {
        const current = rule.conditions[index];
        const toList = LIST_OPS.includes(operator);
        const wasList = LIST_OPS.includes(current.operator);
        setCondition(index, {
            operator,
            value: NO_VALUE.includes(operator) ? null : toList === wasList ? current.value : toList ? (current.value ? [current.value] : []) : (current.value?.[0] ?? ""),
        });
    };

    // Live preview of what the rule would measure this month (debounced; ignores stale answers).
    const ruleKey = JSON.stringify(rule);
    useEffect(() => {
        if (!schema || !rule.date_field || !rule.owner_field) return undefined;
        const seq = ++previewSeq.current;
        const timer = setTimeout(async () => {
            try {
                const result = await previewIndicator(rule);
                if (seq === previewSeq.current) { setPreview(result); setPreviewError(null); }
            } catch (err) {
                if (seq === previewSeq.current) { setPreview(null); setPreviewError(firstMessage(err)); }
            }
        }, 450);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ruleKey, schema]);

    const payload = useMemo(() => ({ name: name.trim(), description, is_active: isActive, ...rule }), [name, description, isActive, rule]);

    const handleSave = async () => {
        setSaving(true);
        setErrors({});
        try {
            if (isNew) await createIndicator(payload); else await updateIndicator(id, payload);
            Swal.fire({ icon: "success", title: "Saved", toast: true, position: "top-end", showConfirmButton: false, timer: 2500 });
            navigate("/indicator");
        } catch (err) {
            setErrors({ ...(err.fields || {}), form: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (fetching) return <div className="p-10 flex justify-center">Loading...</div>;
    if (!schema) return <div className="p-10 text-red-500">{errors.form || "Could not load the KPI options."}</div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/indicator")} aria-label="Back to KPIs">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold truncate">{isNew ? "New KPI" : `Edit KPI`}</h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {isNew ? "Define what to measure — the value is calculated from CRM data." : key}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate("/indicator")}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "Saving..." : "Save KPI"}</Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
                {errors.form && (
                    <div role="alert" className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/15 rounded-md border border-red-200 dark:border-red-500/30">
                        {errors.form}
                    </div>
                )}

                <Section title="Name">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="kpi-name">KPI name</Label>
                            <Input id="kpi-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hardware revenue" />
                            {errors.name && <p className="text-xs text-red-500">{[].concat(errors.name).join(" ")}</p>}
                            {errors.key && <p className="text-xs text-red-500">{[].concat(errors.key).join(" ")}</p>}
                        </div>
                        <div className="space-y-2 flex flex-col justify-end">
                            <div className="flex items-center gap-2 h-9">
                                <Checkbox id="kpi-active" checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
                                <Label htmlFor="kpi-active">Active (can be used in goals)</Label>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="kpi-description">Description (optional)</Label>
                        <Textarea id="kpi-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
                    </div>
                </Section>

                <Section title="What to measure" hint="Pick a record type and how to combine its records.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Pick
                            label="Measure" value={rule.entity} onChange={setEntity} error={errors.entity && [].concat(errors.entity).join(" ")}
                            options={Object.entries(schema.entities).map(([value, e]) => ({ value, label: e.label }))}
                        />
                        <Pick
                            label="How" value={rule.aggregation} onChange={setAggregation}
                            options={schema.aggregations.filter((a) => a.value === "count" || entity?.value_fields.length)}
                        />
                        {needsValueField && (
                            <Pick
                                label={rule.aggregation === "sum" ? "Add up" : "Average of"} value={rule.value_field}
                                onChange={(v) => setRule((r) => ({ ...r, value_field: v }))} placeholder="Choose a field"
                                options={entity?.value_fields || []} error={errors.value_field && [].concat(errors.value_field).join(" ")}
                            />
                        )}
                    </div>
                </Section>

                <Section title="Which records count" hint="Only real database fields are available, so the number can always be checked against the data.">
                    {rule.conditions.length === 0 && <p className="text-sm text-muted-foreground italic">No conditions: every record in the period counts.</p>}
                    {rule.conditions.length > 1 && (
                        <div className="max-w-xs">
                            <Pick
                                label="Combine conditions" value={rule.condition_logic} onChange={(v) => setRule((r) => ({ ...r, condition_logic: v }))}
                                options={[{ value: "AND", label: "All must match" }, { value: "OR", label: "Any can match" }]}
                            />
                        </div>
                    )}
                    {rule.conditions.map((condition, index) => {
                        const column = entity.filters.find((f) => f.value === condition.field);
                        const operators = column ? schema.operators[column.kind] : [];
                        return (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr_auto] gap-3 items-start">
                                <Pick label={index === 0 ? "Field" : ""} value={condition.field} onChange={(v) => changeConditionField(index, v)}
                                    options={entity.filters.map((f) => ({ value: f.value, label: f.label }))} />
                                <Pick label={index === 0 ? "Is" : ""} value={condition.operator} onChange={(v) => changeOperator(index, v)} options={operators} />
                                <div className="space-y-2">
                                    {index === 0 && <Label>Value</Label>}
                                    <ConditionValue column={column} condition={condition} onChange={(value) => setCondition(index, { value })} />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className={index === 0 ? "mt-6" : ""} onClick={() => removeCondition(index)} aria-label="Remove condition">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        );
                    })}
                    {errors.conditions && <p className="text-xs text-red-500">{[].concat(errors.conditions).join(" ")}</p>}
                    <Button type="button" variant="outline" size="sm" onClick={addCondition} disabled={!entity?.filters.length}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add condition
                    </Button>
                </Section>

                <Section title="When it counts, and who gets the credit" hint="A record is counted in the period that contains its date, for the person it is credited to.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Pick label="Counts in the period of" value={rule.date_field} onChange={(v) => setRule((r) => ({ ...r, date_field: v }))}
                            options={entity?.date_fields || []} placeholder="Choose a date" error={errors.date_field && [].concat(errors.date_field).join(" ")} />
                        <Pick label="Credited to" value={rule.owner_field} onChange={(v) => setRule((r) => ({ ...r, owner_field: v }))}
                            options={entity?.owner_fields || []} placeholder="Choose a person" error={errors.owner_field && [].concat(errors.owner_field).join(" ")} />
                    </div>
                </Section>

                <Section title="Preview" hint="What this rule measures this month, for everyone. Nothing is saved yet.">
                    {previewError ? (
                        <p className="text-sm text-red-500">{previewError}</p>
                    ) : preview ? (
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">{preview.summary}</p>
                            <p className="text-3xl font-semibold tabular-nums font-heading">{formatGoalValue(preview.value, preview.unit)}</p>
                            <p className="text-xs text-muted-foreground">{formatCount(preview.records)} record{preview.records === 1 ? "" : "s"} counted · {preview.start} to {preview.end}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Calculating…</p>
                    )}
                </Section>
            </div>
        </div>
    );
};

/** A rule for `entity` starting from the first date and owner it offers. */
function withDefaults(schema, rule) {
    const entity = schema.entities[rule.entity];
    return {
        ...rule,
        value_field: rule.aggregation === "count" ? "" : (entity.value_fields[0]?.value ?? ""),
        aggregation: rule.aggregation === "count" || entity.value_fields.length ? rule.aggregation : "count",
        date_field: entity.date_fields[0]?.value ?? "",
        owner_field: entity.owner_fields[0]?.value ?? "",
        conditions: [],
    };
}

/** The first message out of a DRF-style error body. */
function firstMessage(err) {
    const fields = err.fields || {};
    const first = Object.values(fields)[0];
    return first ? [].concat(first).join(" ") : err.message;
}
