import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { DateInput } from "../../components/ui/date-input";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getAudienceFields } from "../../services/campaignService";
import { selectableOptions } from "../../utils/attributeTypes";

const ENTITIES = [
    { value: "contact", label: "Contact" },
    { value: "client", label: "Client" },
    { value: "lead", label: "Lead" },
];

// The field catalog per entity (fixed model columns + this tenant's custom
// attributes) comes from the backend — GET /campaigns/audience-fields/ — which
// is the single source of truth and the security whitelist the send enforces.
// Nothing about which fields are filterable is hardcoded here anymore, so the
// two can't drift. Each field: { name, label, type, fixed, list_values? }.

// Operator choices shown depend on the attribute's dynamic `type` — mirrors
// the operator vocabulary used by Webhook.conditions on the backend
// (app/utils/conditions.py) so the same words mean the same thing across
// the app. Types not listed here (file, etc.) fall back to DEFAULT_OPERATORS.
const EMPTY_OPS = [["is_empty", "is empty"], ["is_not_empty", "is not empty"]];

const OPERATORS_BY_TYPE = {
    text: [["=", "is"], ["!=", "is not"], ["contains", "contains"], ...EMPTY_OPS],
    textarea: [["contains", "contains"], ...EMPTY_OPS],
    email: [["=", "is"], ["contains", "contains"], ...EMPTY_OPS],
    url: [["=", "is"], ["contains", "contains"], ...EMPTY_OPS],
    phone: [["=", "is"], ["contains", "contains"], ...EMPTY_OPS],
    number: [["=", "="], ["!=", "!="], [">", ">"], ["<", "<"], [">=", ">="], ["<=", "<="], ...EMPTY_OPS],
    currency: [["=", "="], ["!=", "!="], [">", ">"], ["<", "<"], [">=", ">="], ["<=", "<="], ...EMPTY_OPS],
    percentage: [["=", "="], ["!=", "!="], [">", ">"], ["<", "<"], [">=", ">="], ["<=", "<="], ...EMPTY_OPS],
    date: [["=", "is"], ["!=", "is not"], [">", "after"], ["<", "before"], [">=", "on/after"], ["<=", "on/before"], ...EMPTY_OPS],
    boolean: [["=", "is"]],
    list: [["=", "is"], ["!=", "is not"], ["in", "is any of"], ...EMPTY_OPS],
};
const DEFAULT_OPERATORS = [["=", "is"], ["!=", "is not"], ...EMPTY_OPS];
const UNARY_OPERATORS = new Set(["is_empty", "is_not_empty"]);

const emptyRow = () => ({ field: "", operator: "=", value: "" });

/**
 * Controlled rule-builder for Campaign.audience_entity / audience_filters /
 * audience_logic. ONE entity (Contact, Client, or Lead) applies to the
 * whole campaign — every condition filters within that single entity, no
 * mixing across rows. `onEntityChange`/`onChange` receive the raw values
 * ready to spread into the create/update payload.
 */
export const AudienceFilterBuilder = ({ entity = "", onEntityChange, filters = [], logic = "AND", onChange }) => {
    const [fieldsByEntity, setFieldsByEntity] = useState({ contact: [], client: [], lead: [] });

    useEffect(() => {
        // One round-trip returns all three entities' fields (fixed + custom),
        // already ordered fixed-first with the fixed field winning any name
        // clash — the same precedence the backend applies on send.
        getAudienceFields()
            .then(byEntity => setFieldsByEntity({
                contact: Array.isArray(byEntity?.contact) ? byEntity.contact : [],
                client: Array.isArray(byEntity?.client) ? byEntity.client : [],
                lead: Array.isArray(byEntity?.lead) ? byEntity.lead : [],
            }))
            .catch(() => setFieldsByEntity({ contact: [], client: [], lead: [] }));
    }, []);

    const currentAttrs = fieldsByEntity[entity] || [];
    const attributeFor = (field) => currentAttrs.find(a => a.name === field);

    const emit = (nextFilters, nextLogic = logic) =>
        onChange?.({ audience_filters: nextFilters, audience_logic: nextLogic });

    const updateRow = (index, patch) => {
        emit(filters.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const addRow = () => emit([...filters, emptyRow()]);
    const removeRow = (index) => emit(filters.filter((_, i) => i !== index));

    const handleEntityChange = (nextEntity) => {
        onEntityChange?.(nextEntity);
        // The attribute catalog is entirely different per entity — existing
        // rows' field/operator/value no longer make sense, reset them all.
        emit(filters.map(() => emptyRow()));
    };

    const handleFieldChange = (index, field) => {
        const attr = attributeFor(field);
        const ops = OPERATORS_BY_TYPE[attr?.type] || DEFAULT_OPERATORS;
        updateRow(index, { field, operator: ops[0][0], value: attr?.type === "boolean" ? true : "" });
    };

    const renderValueInput = (row, index) => {
        const attr = attributeFor(row.field);
        const type = attr?.type;

        if (UNARY_OPERATORS.has(row.operator)) {
            return null;
        }
        if (row.operator === "in") {
            return (
                <Input
                    value={Array.isArray(row.value) ? row.value.join(", ") : ""}
                    onChange={e => updateRow(index, { value: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })}
                    placeholder="value1, value2, ..."
                />
            );
        }
        if (type === "boolean") {
            return (
                <div className="flex items-center h-9">
                    <Checkbox checked={!!row.value} onCheckedChange={checked => updateRow(index, { value: !!checked })} />
                </div>
            );
        }
        if (type === "date") {
            return <DateInput value={row.value} onChange={e => updateRow(index, { value: e.target.value })} />;
        }
        if (type === "list") {
            // list_values migrated to option objects ({value,label,...}); older
            // records may still hold plain strings. selectableOptions normalizes
            // both to {value,label} — rendering the raw value (an object) here is
            // what blanked the page. Falls back to a free-text input if the list
            // has no selectable options yet.
            const options = selectableOptions(attr.list_values);
            if (options.length === 0) {
                return (
                    <Input
                        value={row.value ?? ""}
                        onChange={e => updateRow(index, { value: e.target.value })}
                    />
                );
            }
            return (
                <Select value={row.value || ""} onValueChange={v => updateRow(index, { value: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select a value" /></SelectTrigger>
                    <SelectContent>
                        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        }
        return (
            <Input
                type={["number", "currency", "percentage"].includes(type) ? "number" : "text"}
                value={row.value ?? ""}
                onChange={e => updateRow(index, { value: e.target.value })}
            />
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Audience filters</Label>
                <div className="flex items-center gap-2">
                    <Select value={entity} onValueChange={handleEntityChange}>
                        <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Select entity" /></SelectTrigger>
                        <SelectContent>
                            {ENTITIES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {filters.length > 1 && (
                        <Select value={logic} onValueChange={v => emit(filters, v)}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AND">Match ALL</SelectItem>
                                <SelectItem value="OR">Match ANY</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {filters.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No filters — campaign goes to all contacts with a valid email.</p>
            )}

            {filters.map((row, index) => {
                const attr = attributeFor(row.field);
                const ops = OPERATORS_BY_TYPE[attr?.type] || DEFAULT_OPERATORS;
                return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_130px_1fr_36px] gap-2 items-center">
                        <Select value={row.field} onValueChange={v => handleFieldChange(index, v)}>
                            <SelectTrigger><SelectValue placeholder="Attribute" /></SelectTrigger>
                            <SelectContent>
                                {currentAttrs.map(a => <SelectItem key={a.id || a.name} value={a.name}>{a.label || a.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={row.operator} onValueChange={v => updateRow(index, { operator: v, value: v === "in" ? [] : "" })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ops.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {renderValueInput(row, index)}

                        <Button
                            type="button" variant="ghost" size="sm" onClick={() => removeRow(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" /> Add filter
            </Button>
        </div>
    );
};
