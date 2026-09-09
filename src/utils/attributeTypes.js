import { parsePhoneNumberFromString } from "libphonenumber-js/min";

// Client-side companion to crm-back-end/app/attributes/registry.py.
//
// The backend owns the type system: what options each type takes, their
// defaults, and which filter operators apply. The UI reads that from
// GET /api/attribute-types/ (see useAttributeRegistry). What lives here is the
// part that cannot be serialized — value formatting, coercion, and the
// type -> widget mapping — plus FALLBACK_REGISTRY, a minimal static copy used
// only when that request fails.
//
// Before this split the same facts were maintained by hand in six places, which
// is how the 'email' type once shipped wired into only some of them.

export const ATTRIBUTE_TYPE_GROUPS = [
    { value: "text", label: "Text" },
    { value: "numeric", label: "Numeric" },
    { value: "contact", label: "Contact" },
    { value: "date", label: "Date" },
    { value: "choice", label: "Choice" },
];

// Kept in the order the backend declares them so the type picker reads the same
// whether the registry loaded or not.
export const ATTRIBUTE_TYPES = [
    { value: "text", label: "Text", group: "text", icon: "Type" },
    { value: "textarea", label: "Text Area", group: "text", icon: "AlignLeft" },
    { value: "number", label: "Number", group: "numeric", icon: "Hash" },
    { value: "currency", label: "Currency", group: "numeric", icon: "DollarSign" },
    { value: "percentage", label: "Percentage", group: "numeric", icon: "Percent" },
    { value: "email", label: "Email", group: "contact", icon: "Mail" },
    { value: "phone", label: "Phone", group: "contact", icon: "Phone" },
    { value: "url", label: "URL", group: "contact", icon: "Link" },
    { value: "date", label: "Date", group: "date", icon: "Calendar" },
    { value: "datetime", label: "Date & Time", group: "date", icon: "Clock" },
    { value: "boolean", label: "Boolean", group: "choice", icon: "ToggleLeft" },
    { value: "list", label: "Select List", group: "choice", icon: "List" },
    { value: "multiselect", label: "Multi-Select", group: "choice", icon: "ListChecks" },
];

// Types whose options come from `list_values`.
export const LIST_TYPES = new Set(["list", "multiselect"]);

// Used only if GET /api/attribute-types/ fails: the types render and can be
// picked, they just have no configuration options until the registry loads.
export const FALLBACK_REGISTRY = {
    common_options: [
        "label", "name", "description", "order", "placeholder",
        "is_required", "is_unique", "default_value", "is_filterable", "show_in_table",
    ],
    types: ATTRIBUTE_TYPES.map((t) => ({
        ...t,
        storage: "string",
        supports_unique: false,
        uses_list_values: LIST_TYPES.has(t.value),
        operators: [],
        config_schema: {},
    })),
};

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

// Options are objects ({value,label,color,order,is_active}) as of the phase 2
// migration; plain strings are still accepted so a record saved by an older
// client, or a definition not yet migrated, keeps rendering.
export const normalizeOption = (option, index = 0) =>
    typeof option === "object" && option !== null
        ? {
            value: option.value ?? option.label,
            label: option.label ?? option.value,
            color: option.color ?? null,
            order: option.order ?? index,
            is_active: option.is_active !== false,
        }
        : { value: option, label: option, color: null, order: index, is_active: true };

export const normalizeOptions = (listValues) => {
    const raw = typeof listValues === "string" ? safeParse(listValues) : listValues;
    return (raw || []).map(normalizeOption);
};

// Only options a user may still pick. Retired ones stay resolvable for display
// (see optionLabel) so an existing record does not render as a blank.
export const activeOptions = (listValues) =>
    normalizeOptions(listValues).filter((o) => o.is_active);

export const findOption = (listValues, value) =>
    normalizeOptions(listValues).find((o) => o.value === value) || null;

const safeParse = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        return [];
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Coercion — form inputs always hand back strings
// ─────────────────────────────────────────────────────────────────────────────

const NUMERIC_TYPES = new Set(["number", "currency", "percentage"]);

export const coerceAttributeValue = (attr, rawValue) => {
    if (!attr) return rawValue;
    if (attr.type === "multiselect") return Array.isArray(rawValue) ? rawValue : [];
    if (rawValue === "" || rawValue === null || rawValue === undefined) return rawValue;
    if (NUMERIC_TYPES.has(attr.type)) {
        const num = Number(rawValue);
        return Number.isNaN(num) ? rawValue : num;
    }
    return rawValue;
};

// The value an empty form field should start at, per type.
export const emptyValueFor = (attr) => {
    if (attr?.type === "multiselect") return [];
    if (attr?.type === "boolean") return false;
    return "";
};

// ─────────────────────────────────────────────────────────────────────────────
// Display formatting
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors format_value in crm-back-end/app/attributes/formatters.py. The two
// are held together by app/tests/fixtures/format_cases.json, which this side
// checks via scripts/check-format-contract.mjs and the backend checks in
// app/tests/test_attribute_formatters.py — so a currency merge field in a
// campaign email renders exactly what the table column shows.

export const resolveCurrencyDecimals = (currencyCode) => {
    const zero = ["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG",
        "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"];
    const three = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"];
    const code = (currencyCode || "").toUpperCase();
    if (zero.includes(code)) return 0;
    if (three.includes(code)) return 3;
    return 2;
};

export const formatCurrency = (value, config = {}) => {
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    const code = config.currency_code || "USD";
    const decimals = config.decimals ?? resolveCurrencyDecimals(code);
    const locale = config.locale || undefined;

    const amount = num.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    // An explicit symbol wins; otherwise derive it from the currency code.
    const symbol = config.symbol || currencySymbol(code, locale);
    return config.symbol_position === "after" ? `${amount} ${symbol}` : `${symbol}${amount}`;
};

export const currencySymbol = (code, locale) => {
    try {
        const parts = new Intl.NumberFormat(locale, { style: "currency", currency: code })
            .formatToParts(0);
        return parts.find((p) => p.type === "currency")?.value || code;
    } catch {
        return code;
    }
};

export const formatAttributeValue = (attr, rawValue) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return "";
    const config = attr?.format_config || {};

    switch (attr?.type) {
        case "currency":
            return formatCurrency(rawValue, config);
        case "percentage": {
            const num = Number(rawValue);
            if (Number.isNaN(num)) return String(rawValue);
            const decimals = config.decimals ?? 2;
            // config.locale, not undefined: the server formats merge fields
            // with it, and the two have to agree (see format_cases.json).
            return `${num.toLocaleString(config.locale || undefined, { maximumFractionDigits: decimals })}%`;
        }
        case "number": {
            const num = Number(rawValue);
            if (Number.isNaN(num)) return String(rawValue);
            const body = config.thousands_separator
                ? num.toLocaleString(config.locale || undefined, {
                    maximumFractionDigits: config.decimals ?? 20,
                })
                : String(num);
            return `${config.prefix || ""}${body}${config.suffix || ""}`;
        }
        case "phone": {
            // Stored as E.164 once entered through PhoneInput; legacy
            // digits-only values won't parse and fall through unchanged.
            const parsed = parsePhoneNumberFromString(String(rawValue));
            if (!parsed) return String(rawValue);
            if (config.display_format === "national") return parsed.formatNational();
            if (config.display_format === "e164") return parsed.number;
            return parsed.formatInternational();
        }
        case "boolean":
            return rawValue ? (config.true_label || "Yes") : (config.false_label || "No");
        case "datetime": {
            const parsed = new Date(rawValue);
            if (Number.isNaN(parsed.getTime())) return String(rawValue);
            // 'iso' echoes the stored string rather than going through
            // toISOString(), which would shift a naive value into UTC and
            // disagree with the server for the same stored value.
            if (config.display_format === "iso") return String(rawValue);
            return parsed.toLocaleString();
        }
        case "list":
            return findOption(attr.list_values, rawValue)?.label ?? String(rawValue);
        case "multiselect": {
            if (!Array.isArray(rawValue)) return String(rawValue);
            return rawValue
                .map((v) => findOption(attr.list_values, v)?.label ?? v)
                .join(", ");
        }
        default:
            return String(rawValue);
    }
};

// Generalizes the "find every attribute of a given type with a value" lookup —
// first written inline in LeadDetail.jsx for the email-recipient picker, now
// reusable for phone (click-to-call, future SMS) or any future type that needs
// the same "find real values, not field names" treatment.
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
