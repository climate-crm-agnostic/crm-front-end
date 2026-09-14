import { useState } from "react";
import { COUNTRY_LIST } from "../../utils/phoneCountries";
import { localeOptions } from "../../utils/locales";
import { SearchableSelect } from "../ui/searchable-select";
import { MultiSelect } from "../ui/multi-select";

const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "#6b6560", marginBottom: 5,
};

const inputStyle = {
    backgroundColor: "#fff", border: "1px solid #D8D2C4", color: "#2E2A26",
    borderRadius: 6, padding: "8px 10px", fontSize: 14, width: "100%", outline: "none",
};

// Human wording for option keys. Anything not listed falls back to the key with
// underscores turned into spaces, so a new registry option renders sensibly
// before anyone gets round to naming it here.
const OPTION_LABELS = {
    currency_code: "Currency",
    symbol: "Symbol override",
    symbol_position: "Symbol position",
    locale: "Number format",
    decimals: "Decimals",
    min: "Minimum",
    max: "Maximum",
    allow_negative: "Allow negative values",
    display_mode: "Value scale",
    thousands_separator: "Group thousands",
    prefix: "Prefix",
    suffix: "Suffix",
    step: "Step",
    min_length: "Minimum length",
    max_length: "Maximum length",
    mask: "Input mask",
    pattern: "Pattern (regex)",
    pattern_message: "Message when the pattern fails",
    transform: "Text transform",
    rows: "Height (rows)",
    show_counter: "Show character counter",
    allowed_domains: "Only these domains",
    blocked_domains: "Block these domains",
    normalize_lowercase: "Store in lowercase",
    default_country: "Default country",
    allowed_countries: "Only these countries",
    require_valid: "Require a valid number",
    number_type: "Number type",
    display_format: "Display format",
    allowed_schemes: "Allowed schemes",
    open_in_new_tab: "Open in a new tab",
    min_date: "Earliest date",
    max_date: "Latest date",
    relative_constraint: "Relative limit",
    minute_step: "Minute step",
    display: "Display as",
    true_label: "Label when on",
    false_label: "Label when off",
    searchable: "Searchable",
    allow_other: 'Allow an "Other" value',
    min_selected: "Minimum selected",
    max_selected: "Maximum selected",
};

const OPTION_HINTS = {
    currency_code: "Sets the symbol and decimal places automatically.",
    symbol: "Leave empty to use the currency's own symbol.",
    locale: "Only the separators — the currency is set above. Leave it on "
        + "\"follow the viewer\" and each person sees their own country's format.",
    mask: "# digit · A letter · @ letter or digit. e.g. (###) ###-####",
    pattern: "Advanced. Only for formats a mask cannot express.",
    require_valid: "Off by default so numbers imported without a country prefix stay editable.",
    relative_constraint: "Blocks dates before today or after today.",
    searchable: "Leave unset to turn on automatically past 8 options.",
    allow_other: "Lets someone type a value that is not in the list.",
    display_mode: "How a stored number maps to a percent shown on screen.",
};

// Hints that only make sense for one type. Percentage is the case that bites:
// min/max are checked against the value as *stored*, so in 0-1 mode the bound
// for "no more than 100%" is 1, not 100 — for every other numeric type stored
// and displayed are the same number and the note would just be noise.
const TYPE_OPTION_HINTS = {
    percentage: {
        min: "Against the stored value: 0-1 mode means 0.5, not 50.",
        max: "Against the stored value: 0-1 mode means 1, not 100.",
    },
};

// Per-value overrides for an enum's option text, keyed by option key. Falls
// back to enumLabel() below when a key or value isn't listed here — needed
// for display_mode because "0-100" / "0-1" read as noise once the dashes are
// stripped to spaces.
const ENUM_VALUE_LABELS = {
    display_mode: {
        "0-100": "0–100 (a stored 15 is 15%)",
        "0-1": "0–1 (a stored 0.15 is 15%)",
    },
};

// Options that change how a stored value is *rendered*, as opposed to how it
// is entered or validated. A calculated field is never typed into and skips
// validation entirely, so only these mean anything for one — offering it a
// `min` or a `mask` would be configuration that silently does nothing.
const DISPLAY_ONLY_OPTIONS = new Set([
    "decimals", "thousands_separator", "prefix", "suffix",
    "currency_code", "symbol", "symbol_position", "locale",
    "display_mode", "display_format", "open_in_new_tab",
    "true_label", "false_label",
]);

const hintFor = (type, key) => TYPE_OPTION_HINTS[type]?.[key] || OPTION_HINTS[key];

const humanize = (key) =>
    OPTION_LABELS[key] || key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const enumLabel = (value) =>
    String(value).replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());

/**
 * The type-specific half of the attribute form, generated from the registry's
 * `config_schema` (GET /api/attribute-types/).
 *
 * Nothing here is hard-coded per type: adding an option to a type on the backend
 * makes it appear in this panel with no JSX change. Only the wording and a few
 * richer controls (currency and country pickers) are curated above.
 */
export const TypeConfigPanel = ({ typeMeta, config, onChange, currencies,
                                  displayOnly = false }) => {
    const schema = typeMeta?.config_schema || {};
    const keys = Object.keys(schema)
        .filter((key) => !displayOnly || DISPLAY_ONLY_OPTIONS.has(key));

    if (keys.length === 0) {
        return (
            <p style={{ fontSize: 12, color: "#9b948e" }}>
                {displayOnly
                    ? "This type has nothing to configure about how its value is shown."
                    : "This type has no extra settings."}
            </p>
        );
    }

    const set = (key, value) => onChange({ ...config, [key]: value });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {keys.map((key) => {
                const spec = schema[key];
                const value = config?.[key] ?? spec.default;
                const wide = spec.kind === "string_list" || spec.kind === "country_list"
                    || key === "pattern" || key === "pattern_message";

                return (
                    <div key={key} className={wide ? "sm:col-span-2" : undefined}>
                        {spec.kind !== "bool" && <label style={labelStyle}>{humanize(key)}</label>}
                        <Control
                            spec={spec}
                            optionKey={key}
                            value={value}
                            currencies={currencies}
                            onChange={(v) => set(key, v)}
                        />
                        {hintFor(typeMeta?.value, key) && (
                            <p style={{ fontSize: 11, color: "#9b948e", marginTop: 3 }}>
                                {hintFor(typeMeta?.value, key)}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const Control = ({ spec, optionKey, value, onChange, currencies }) => {
    switch (spec.kind) {
        case "bool":
            return (
                <label className="flex cursor-pointer items-center gap-2 pt-4">
                    <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(e) => onChange(e.target.checked)}
                        style={{ accentColor: "#5E6A43", width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#2E2A26" }}>
                        {humanize(optionKey)}
                    </span>
                </label>
            );

        case "int":
        case "decimal":
            return (
                <input
                    type="number"
                    value={value ?? ""}
                    min={spec.min} max={spec.max}
                    step={spec.kind === "int" ? 1 : "any"}
                    onChange={(e) =>
                        onChange(e.target.value === "" ? null : Number(e.target.value))}
                    style={inputStyle}
                />
            );

        case "enum":
            return (
                <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
                        style={{ ...inputStyle, appearance: "auto" }}>
                    {spec.options.map((option) => (
                        <option key={option} value={option}>
                            {ENUM_VALUE_LABELS[optionKey]?.[option] || enumLabel(option)}
                        </option>
                    ))}
                </select>
            );

        // The three long lists (150+ currencies, 240+ countries, 30 locales)
        // get a searchable picker rather than a native <select>: an OS dropdown
        // that long is a scroll hunt, and typing to jump only matches the first
        // letters of the label.
        case "currency_code":
            return (
                <SearchableSelect
                    value={value ?? ""}
                    onChange={(v) => onChange(v || null)}
                    allowClear={false}
                    placeholder="Select a currency"
                    options={currencies.map((c) => ({
                        value: c.code,
                        label: `${c.flag} ${c.code} — ${c.name}`,
                    }))}
                />
            );

        case "country_code":
            return (
                <SearchableSelect
                    value={value ?? ""}
                    onChange={(v) => onChange(v || null)}
                    placeholder="Follow the viewer's browser"
                    options={COUNTRY_LIST.map((c) => ({
                        value: c.code,
                        label: `${c.flag} ${c.name} (+${c.callingCode})`,
                        // Findable by ISO code without showing it on the row.
                        keywords: c.code,
                    }))}
                />
            );

        // A picker rather than a comma-separated box: the set of countries is
        // known and finite, so there is nothing to type freehand — and an ISO
        // code typed from memory ("UK" for the United Kingdom, which is GB) is
        // accepted silently and then matches nothing.
        case "country_list":
            return (
                <MultiSelect
                    value={Array.isArray(value) ? value : []}
                    onChange={(codes) => onChange(codes.length ? codes : null)}
                    placeholder="Every country"
                    options={COUNTRY_LIST.map((c) => ({
                        value: c.code,
                        label: `${c.flag} ${c.name} (+${c.callingCode})`,
                        keywords: c.code,
                    }))}
                />
            );

        case "string_list":
            return (
                <TokenList
                    value={value}
                    placeholder={optionKey.includes("domain") ? "acme.com, acme.co.cr" : "http, https"}
                    onChange={onChange}
                />
            );

        case "date":
            return (
                <input type="date" value={value ?? ""}
                       onChange={(e) => onChange(e.target.value || null)} style={inputStyle} />
            );

        case "locale":
            // A picker rather than a text box: every option carries the number
            // it actually produces, so choosing one is reading rather than
            // knowing what a BCP-47 tag does to a thousands separator.
            return (
                <SearchableSelect
                    value={value ?? ""}
                    onChange={(v) => onChange(v || null)}
                    placeholder="Follow the viewer's browser"
                    options={localeOptions(value).map((o) => ({
                        value: o.value,
                        label: o.label,
                        keywords: o.title,
                    }))}
                />
            );

        default:
            return (
                <input
                    type="text"
                    value={value ?? ""}
                    maxLength={spec.max_length}
                    onChange={(e) => onChange(e.target.value || null)}
                    style={inputStyle}
                />
            );
    }
};

// Comma-separated entry for the list-shaped options.
//
// The input keeps its own draft text while the admin is typing, rather than
// showing `value.join(", ")` recomputed on every keystroke: re-deriving from
// the parsed array immediately drops whatever comma or trailing space they
// just typed (a lone "," parses to no tokens, so the display would snap back
// to what was there before it). The draft is only turned into the actual
// array — and handed to onChange — when the field loses focus.
const TokenList = ({ value, onChange, placeholder, transform }) => {
    const [draft, setDraft] = useState(
        () => (Array.isArray(value) ? value.join(", ") : (value ?? ""))
    );

    const commit = () => {
        const tokens = draft
            .split(",")
            .map((v) => (transform ? transform(v.trim()) : v.trim()))
            .filter(Boolean);
        onChange(tokens);
        // Re-sync the draft to what actually got saved — collapses stray
        // spacing and reflects `transform` (e.g. lowercase "cr" becoming
        // "CR"), so the field doesn't show something other than the value
        // it now holds.
        setDraft(tokens.join(", "));
    };

    return (
        <input
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            style={inputStyle}
        />
    );
};
