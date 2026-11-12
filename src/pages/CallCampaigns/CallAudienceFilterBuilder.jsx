import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { DateInput } from "../../components/ui/date-input";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getAudienceFields } from "../../services/callCampaignService";
import { selectableOptions } from "../../utils/attributeTypes";

// Same operator vocabulary as Campaigns/AudienceFilterBuilder.jsx (mirrors
// Webhook.conditions on the backend) — kept as its own copy rather than a
// shared import because the two builders' field catalogs come from
// different endpoints (call campaigns are Contact-only, no entity picker).
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
 * Controlled rule-builder for CallCampaign.audience_filters/audience_logic.
 * Contact is the only entity (see CallCampaign's docstring on the backend
 * for why), so unlike Campaigns/AudienceFilterBuilder there's no entity
 * picker — one less thing to get wrong when there's only one valid choice.
 */
export const CallAudienceFilterBuilder = ({ filters = [], logic = "AND", onChange }) => {
    const [fields, setFields] = useState([]);

    useEffect(() => {
        getAudienceFields()
            .then(list => setFields(Array.isArray(list) ? list : []))
            .catch(() => setFields([]));
    }, []);

    const attributeFor = (field) => fields.find(a => a.name === field);

    const emit = (nextFilters, nextLogic = logic) =>
        onChange?.({ audience_filters: nextFilters, audience_logic: nextLogic });

    const updateRow = (index, patch) => {
        emit(filters.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const addRow = () => emit([...filters, emptyRow()]);
    const removeRow = (index) => emit(filters.filter((_, i) => i !== index));

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
            const options = selectableOptions(attr.list_values);
            if (options.length === 0) {
                return <Input value={row.value ?? ""} onChange={e => updateRow(index, { value: e.target.value })} />;
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

            {filters.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                    No filters — campaign calls every Contact that has a phone number.
                </p>
            )}

            {filters.map((row, index) => {
                const attr = attributeFor(row.field);
                const ops = OPERATORS_BY_TYPE[attr?.type] || DEFAULT_OPERATORS;
                return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_130px_1fr_36px] gap-2 items-center">
                        <Select value={row.field} onValueChange={v => handleFieldChange(index, v)}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select a field" /></SelectTrigger>
                            <SelectContent>
                                {fields.map(f => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={row.operator} onValueChange={v => updateRow(index, { operator: v, value: UNARY_OPERATORS.has(v) ? "" : row.value })}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ops.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {renderValueInput(row, index)}
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeRow(index)}>
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
