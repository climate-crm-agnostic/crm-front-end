import { COUNTRY_LIST } from "../../utils/phoneCountries";

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
    locale: "e.g. es-CR for 1.234,56 — leave empty to follow the viewer.",
    mask: "# digit · A letter · @ letter or digit. e.g. (###) ###-####",
    pattern: "Advanced. Only for formats a mask cannot express.",
    require_valid: "Off by default so numbers imported without a country prefix stay editable.",
    relative_constraint: "Blocks dates before today or after today.",
    searchable: "Leave unset to turn on automatically past 8 options.",
    allow_other: "Lets someone type a value that is not in the list.",
};

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
export const TypeConfigPanel = ({ typeMeta, config, onChange, currencies }) => {
    const schema = typeMeta?.config_schema || {};
    const keys = Object.keys(schema);

    if (keys.length === 0) {
        return (
            <p style={{ fontSize: 12, color: "#9b948e" }}>
                This type has no extra settings.
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
                        {OPTION_HINTS[key] && (
                            <p style={{ fontSize: 11, color: "#9b948e", marginTop: 3 }}>
                                {OPTION_HINTS[key]}
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
                        <option key={option} value={option}>{enumLabel(option)}</option>
                    ))}
                </select>
            );

        case "currency_code":
            return (
                <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}
                        style={{ ...inputStyle, appearance: "auto" }}>
                    {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.code} — {c.name}
                        </option>
                    ))}
                </select>
            );

        case "country_code":
            return (
                <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}
                        style={{ ...inputStyle, appearance: "auto" }}>
                    <option value="">Follow the viewer's browser</option>
                    {COUNTRY_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.name} (+{c.callingCode})
                        </option>
                    ))}
                </select>
            );

        case "country_list":
            return (
                <TokenList
                    value={value}
                    placeholder="CR, PA, NI — empty means every country"
                    transform={(v) => v.toUpperCase()}
                    onChange={onChange}
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

// Comma-separated entry for the list-shaped options. Kept as free text while
// typing so a trailing comma does not fight the user mid-word.
const TokenList = ({ value, onChange, placeholder, transform }) => (
    <input
        type="text"
        value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
        placeholder={placeholder}
        onChange={(e) =>
            onChange(
                e.target.value
                    .split(",")
                    .map((v) => (transform ? transform(v.trim()) : v.trim()))
                    .filter(Boolean)
            )}
        style={inputStyle}
    />
);
