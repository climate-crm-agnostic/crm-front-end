import { parsePhoneNumberFromString } from "libphonenumber-js/min";

// Single source of truth for the dynamic-attribute type system (Attribute /
// PipelineAttribute, backend choices in crm-back-end/app/models/attributes.py
// and pipeline_attribute.py — kept in lockstep with this list by hand, same
// as those two files keep each other in lockstep). Every place that needs to
// know "what types exist" (the Type dropdowns in AttributeForm.jsx and
// Pipeline.jsx, the labels in Pipeline.jsx's attribute list) reads from here
// instead of keeping its own copy — that duplication is exactly what let the
// 'email' type ship half-wired in a previous pass (missing from some of
// those lists). Add a type here once and every consumer picks it up.
export const ATTRIBUTE_TYPES = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "boolean", label: "Boolean" },
    { value: "list", label: "Select List" },
    { value: "textarea", label: "Text Area" },
    { value: "email", label: "Email" },
    { value: "currency", label: "Currency" },
    { value: "phone", label: "Phone" },
    { value: "percentage", label: "Percentage" },
    { value: "url", label: "URL" },
];

// Types whose value is a plain number under the hood (stored as-is in the
// entity's JSONB `attributes` dict) but need Number() coercion before saving
// since form inputs always hand back strings.
const NUMERIC_TYPES = new Set(["number", "currency", "percentage"]);

// Normalizes a value before it goes into the `attributes` payload sent to
// the API — mirrors the `if (attr.type === 'number' && formatted[attr.name])`
// blocks that used to be copy-pasted into every detail page's submit
// handler, now covering currency/percentage too.
export const coerceAttributeValue = (attr, rawValue) => {
    if (!attr || rawValue === "" || rawValue === null || rawValue === undefined) return rawValue;
    if (NUMERIC_TYPES.has(attr.type)) {
        const num = Number(rawValue);
        return Number.isNaN(num) ? rawValue : num;
    }
    return rawValue;
};

// Read-only display formatting — table columns, badges, anywhere a value is
// shown but not edited. Storage stays raw (a plain number for
// currency/percentage, digits-only for phone); this is purely presentational.
export const formatAttributeValue = (attr, rawValue) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return "";
    switch (attr?.type) {
        case "currency": {
            const { symbol = "$", decimals = 2 } = attr.format_config || {};
            const num = Number(rawValue);
            if (Number.isNaN(num)) return String(rawValue);
            return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
        }
        case "percentage": {
            const num = Number(rawValue);
            return Number.isNaN(num) ? String(rawValue) : `${num}%`;
        }
        case "phone": {
            // Values are stored as E.164 once entered via PhoneInput — show
            // the friendlier international format for read-only contexts
            // (table columns, ...). Falls back to the raw value for legacy
            // digits-only values that don't parse without a country hint.
            const parsed = parsePhoneNumberFromString(String(rawValue));
            return parsed ? parsed.formatInternational() : String(rawValue);
        }
        case "boolean":
            return rawValue ? "Yes" : "No";
        default:
            return String(rawValue);
    }
};

// Generalizes the "find every attribute of a given type with a value"
// lookup — first written inline in LeadDetail.jsx for the email-recipient
// picker, now reusable for phone (click-to-call, future SMS) or any future
// type that needs the same "find real values, not field names" treatment.
// Returns [{label, value}], deduped by value.
export const collectAttributeValuesByType = (attributeDefs, valuesObj, type) => {
    const seen = new Set();
    const results = [];
    (attributeDefs || []).forEach((attr) => {
        if (attr.type !== type) return;
        const value = valuesObj?.[attr.name];
        if (!value || seen.has(value)) return;
        seen.add(value);
        results.push({ label: attr.label, value });
    });
    return results;
};
