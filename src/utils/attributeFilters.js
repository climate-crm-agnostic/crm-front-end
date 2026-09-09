// Client half of the `attr__<name>__<operator>=` filter engine
// (crm-back-end/app/attributes/filters.py).
//
// Which operators an attribute accepts comes from the type registry, so the UI
// physically cannot offer one the server would reject.

export const UNARY_OPERATORS = new Set(["is_empty", "is_not_empty", "is_true", "is_false"]);
export const MULTI_VALUE_OPERATORS = new Set([
    "in", "not_in", "has_any", "has_all", "has_none", "between",
]);

export const OPERATOR_LABELS = {
    eq: "is",
    ne: "is not",
    contains: "contains",
    not_contains: "does not contain",
    starts_with: "starts with",
    ends_with: "ends with",
    domain_is: "domain is",
    country_is: "country is",
    gt: "greater than",
    gte: "at least",
    lt: "less than",
    lte: "at most",
    between: "between",
    before: "before",
    after: "after",
    relative: "in the period",
    in: "is any of",
    not_in: "is none of",
    has_any: "has any of",
    has_all: "has all of",
    has_none: "has none of",
    is_true: "is yes",
    is_false: "is no",
    is_empty: "is empty",
    is_not_empty: "is filled in",
};

// Mirrors RELATIVE_WINDOWS in filters.py.
export const RELATIVE_WINDOWS = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "this_week", label: "This week" },
    { value: "this_month", label: "This month" },
    { value: "this_year", label: "This year" },
    { value: "last_7_days", label: "Last 7 days" },
    { value: "last_30_days", label: "Last 30 days" },
    { value: "last_90_days", label: "Last 90 days" },
    { value: "next_7_days", label: "Next 7 days" },
    { value: "next_30_days", label: "Next 30 days" },
];

export const operatorLabel = (operator) => OPERATOR_LABELS[operator] || operator;

/**
 * Turns the filter rows the UI holds into query params.
 *
 * A row is {name, operator, value} — `value` is an array for the multi-value
 * operators and ignored entirely for the unary ones. Incomplete rows are
 * skipped rather than sent half-built, so typing in one row never fires a
 * request that the server would 400.
 */
export const buildFilterParams = (rows) => {
    const params = {};
    (rows || []).forEach(({ name, operator, value }) => {
        if (!name || !operator) return;
        const key = `attr__${name}__${operator}`;

        if (UNARY_OPERATORS.has(operator)) {
            params[key] = "1";
            return;
        }
        if (MULTI_VALUE_OPERATORS.has(operator)) {
            const values = (Array.isArray(value) ? value : String(value ?? "").split(","))
                .map((v) => String(v).trim())
                .filter(Boolean);
            // `between` is meaningless with one end missing.
            if (operator === "between" ? values.length !== 2 : values.length === 0) return;
            params[key] = values.join(",");
            return;
        }
        if (value === "" || value === null || value === undefined) return;
        params[key] = String(value);
    });
    return params;
};

// How many filter rows are actually doing something — for the "N active" badge.
export const countActiveFilters = (rows) => Object.keys(buildFilterParams(rows)).length;

// The operator a freshly added row should start on: the first one the type
// declares, which the registry orders most-useful-first.
export const defaultOperatorFor = (typeMeta) => typeMeta?.operators?.[0] || "eq";

// What shape the value control needs for a given operator.
export const valueShape = (operator) => {
    if (UNARY_OPERATORS.has(operator)) return "none";
    if (operator === "between") return "range";
    if (operator === "relative") return "window";
    if (MULTI_VALUE_OPERATORS.has(operator)) return "multi";
    return "single";
};
