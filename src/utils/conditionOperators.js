// Operators for the condition builders shared by Webhooks and Stage Validation
// Rules — both evaluate through crm-back-end/app/utils/conditions.py, whose
// vocabulary ("=", "!=", "contains", …) is deliberately its own and not the
// filter engine's ("eq", "ne", "contains", …).
//
// Rather than keep a second per-type table, the list for a field is derived
// from that field's type in the registry and translated. A type added to the
// registry therefore gets sensible condition operators with no change here.

import { UNARY_OPERATORS as FILTER_UNARY } from "./attributeFilters";

// registry operator -> conditions.py operator. Anything unmapped (between,
// relative, has_any, …) has no equivalent in that engine and is dropped.
const TO_CONDITION = {
    eq: "=",
    ne: "!=",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
    in: "in",
    contains: "contains",
    is_empty: "is_empty",
    is_not_empty: "is_not_empty",
    before: "<",
    after: ">",
    is_true: "=",
    is_false: "=",
};

export const CONDITION_OPERATOR_LABELS = {
    "=": "= equals",
    "!=": "≠ not equals",
    ">": "> greater than",
    "<": "< less than",
    ">=": "≥ greater or equal",
    "<=": "≤ less or equal",
    in: "in (list)",
    contains: "contains",
    is_not_empty: "is filled in",
    is_empty: "is empty",
    is_not_null: "is not null",
    is_null: "is null",
};

// Presence checks apply to any field, whatever its type, and are always offered.
const PRESENCE = ["is_not_empty", "is_empty", "is_not_null", "is_null"];

export const CONDITION_UNARY_OPERATORS = new Set([
    "is_null", "is_not_null", "is_empty", "is_not_empty",
]);

// Every operator, for a field whose type is unknown — a webhook condition can
// name any field on the model, not only a dynamic attribute.
export const ALL_CONDITION_OPERATORS = [
    "=", "!=", ">", "<", ">=", "<=", "in", "contains", ...PRESENCE,
];

/**
 * Condition operators appropriate to `typeMeta` (a registry type entry).
 * Falls back to the full list when the field's type is unknown.
 */
export const conditionOperatorsFor = (typeMeta) => {
    if (!typeMeta?.operators?.length) return ALL_CONDITION_OPERATORS;
    const mapped = [];
    typeMeta.operators.forEach((operator) => {
        if (FILTER_UNARY.has(operator)) return;      // handled by PRESENCE below
        const translated = TO_CONDITION[operator];
        if (translated && !mapped.includes(translated)) mapped.push(translated);
    });
    return [...mapped, ...PRESENCE];
};

export const conditionOperatorLabel = (operator) =>
    CONDITION_OPERATOR_LABELS[operator] || operator;

/**
 * The attribute a condition's field path refers to, if any.
 * Field paths look like "attributes.budget" or "self.attributes.budget".
 */
export const attributeForConditionField = (field, attributes) => {
    if (!field) return null;
    const key = String(field).replace(/^self\./, "");
    if (!key.startsWith("attributes.")) return null;
    const name = key.slice("attributes.".length);
    return (attributes || []).find((a) => a.name === name) || null;
};
