import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DateInput } from "../ui/date-input";
import { DateTimeInput } from "../ui/datetime-input";
import { PhoneInput } from "../ui/phone-input";
import { CurrencyInput } from "../ui/currency-input";
import { SearchableSelect } from "../ui/searchable-select";
import { MultiSelect } from "../ui/multi-select";
import { MaskedInput } from "../ui/masked-input";
import { FunctionSquare } from "lucide-react";
import { formatAttributeValue, normalizeOptions, selectableOptions } from "../../utils/attributeTypes";

/**
 * Single renderer for a dynamic Attribute/PipelineAttribute value, covering
 * every type in the registry (crm-back-end/app/attributes/registry.py). Adding
 * a type means one entry there and one branch here — nothing else.
 *
 * Each branch now reads the type's `format_config`, so the same `list` type can
 * be a dropdown, a radio group, buttons, or a searchable picker depending on how
 * the admin configured it. The backend remains the only authority on whether a
 * value is acceptable; the config here is about making the right value easy to
 * enter. Numeric ranges are the one thing echoed back as you type (see
 * WithRangeNote) — not to enforce them, but because a bound that only speaks up
 * when you press Save reads as if it were never applied at all.
 *
 * `onChange` always receives the new raw value directly (not an event) —
 * callers do `onChange={(v) => handleAttributeChange(attr.name, v)}`.
 */
export const DynamicAttributeField = ({ attr, value, onChange, idPrefix, disabled }) => {
    const id = idPrefix ? `${idPrefix}-${attr.name}` : attr.name;
    const config = attr.format_config || {};
    const placeholder = attr.placeholder || attr.label;

    // A calculated field is derived on save; there is nothing to type into it.
    // It shows the stored value, formatted by its output type, and says so.
    if (attr.is_calculated) {
        return <CalculatedValue id={id} attr={attr} value={value} />;
    }

    if (attr.type === "list") {
        const options = normalizeOptions(attr.options || attr.list_values);
        const selectable = selectableOptions(attr.options || attr.list_values);
        // Auto-enable search past the point a plain dropdown gets unwieldy;
        // an explicit `searchable` in the config always wins.
        const searchable = config.searchable ?? selectable.length > 8;

        if (config.display === "radio" || config.display === "buttons") {
            return (
                <OptionButtons
                    id={id} options={selectable} value={value} onChange={onChange}
                    disabled={disabled} variant={config.display}
                />
            );
        }
        if (searchable) {
            return (
                <SearchableSelect
                    id={id} options={options} value={value} onChange={onChange}
                    disabled={disabled} placeholder={`Select ${attr.label}`}
                />
            );
        }
        return (
            <Select onValueChange={onChange} value={value} disabled={disabled}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={`Select ${attr.label}`} />
                </SelectTrigger>
                <SelectContent>
                    {selectable.length === 0 ? (
                        <SelectItem value="no-options" disabled>No options available</SelectItem>
                    ) : selectable.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                                {opt.color && (
                                    <span className="h-2.5 w-2.5 rounded-full"
                                          style={{ backgroundColor: opt.color }} />
                                )}
                                {opt.label}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (attr.type === "multiselect") {
        return (
            <MultiSelect
                id={id}
                options={selectableOptions(attr.options || attr.list_values)}
                value={value}
                onChange={onChange}
                disabled={disabled}
                display={config.display || "tags"}
                maxSelected={config.max_selected || undefined}
                placeholder={`Select ${attr.label}`}
            />
        );
    }

    if (attr.type === "boolean") {
        const trueLabel = config.true_label || "Yes";
        const falseLabel = config.false_label || "No";
        if (config.display === "checkbox") {
            return (
                <div className="flex items-center space-x-2 h-10">
                    <Checkbox id={id} checked={!!value} disabled={disabled}
                              onCheckedChange={(checked) => onChange(!!checked)} />
                    <Label htmlFor={id} className="cursor-pointer font-normal text-muted-foreground">
                        {value ? trueLabel : falseLabel}
                    </Label>
                </div>
            );
        }
        if (config.display === "radio") {
            return (
                <OptionButtons
                    id={id} variant="radio" disabled={disabled}
                    options={[{ value: "true", label: trueLabel }, { value: "false", label: falseLabel }]}
                    value={value ? "true" : "false"}
                    onChange={(v) => onChange(v === "true")}
                />
            );
        }
        return (
            <div className="flex items-center space-x-2 h-10">
                <Switch id={id} checked={!!value} onCheckedChange={onChange} disabled={disabled} />
                <Label htmlFor={id} className="cursor-pointer font-normal text-muted-foreground">
                    {value ? trueLabel : falseLabel}
                </Label>
            </div>
        );
    }

    if (attr.type === "date") {
        return (
            <DateInput id={id} value={value || ""} disabled={disabled}
                       min={config.min_date} max={config.max_date}
                       onChange={(e) => onChange(e.target.value)} />
        );
    }

    if (attr.type === "datetime") {
        return (
            <DateTimeInput id={id} value={value || ""} onChange={onChange}
                           disabled={disabled} minuteStep={config.minute_step ?? 15} />
        );
    }

    if (attr.type === "textarea") {
        const max = config.max_length || undefined;
        return (
            <div className="flex flex-col gap-1">
                <Textarea
                    id={id} placeholder={placeholder} value={value || ""} disabled={disabled}
                    rows={config.rows ?? 3} maxLength={max}
                    onChange={(e) => onChange(e.target.value)}
                />
                {config.show_counter && max && (
                    <span className="self-end text-[11px] text-muted-foreground">
                        {(value || "").length} / {max}
                    </span>
                )}
            </div>
        );
    }

    if (attr.type === "phone") {
        return (
            <PhoneInput
                id={id} value={value || ""} onChange={onChange} disabled={disabled}
                defaultCountry={config.default_country}
                allowedCountries={config.allowed_countries}
                placeholder={attr.placeholder}
            />
        );
    }

    if (attr.type === "currency") {
        return (
            <WithRangeNote attr={attr} value={value}>
                <CurrencyInput
                    id={id} value={value ?? ""} onChange={onChange} disabled={disabled}
                    currencyCode={config.currency_code}
                    symbol={config.symbol}
                    symbolPosition={config.symbol_position}
                    locale={config.locale}
                    decimals={config.decimals}
                    placeholder={attr.placeholder}
                />
            </WithRangeNote>
        );
    }

    if (attr.type === "email") {
        return (
            <Input id={id} type="email" placeholder={placeholder} value={value || ""}
                   disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        );
    }

    if (attr.type === "url") {
        return (
            <Input id={id} type="url" placeholder={placeholder} value={value || ""}
                   disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        );
    }

    if (attr.type === "percentage") {
        return (
            <WithRangeNote attr={attr} value={value}>
                <div className="relative">
                    <Input
                        id={id} type="number" placeholder={placeholder} value={value ?? ""}
                        disabled={disabled} className="pr-7"
                        min={config.min ?? undefined} max={config.max ?? undefined}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                </div>
            </WithRangeNote>
        );
    }

    if (attr.type === "number") {
        const { prefix, suffix } = config;
        return (
            <WithRangeNote attr={attr} value={value}>
            <div className="relative">
                {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {prefix}
                    </span>
                )}
                <Input
                    id={id} type="number" placeholder={placeholder} value={value ?? ""}
                    disabled={disabled}
                    min={config.min ?? undefined} max={config.max ?? undefined}
                    step={config.step ?? undefined}
                    className={`${prefix ? "pl-8" : ""} ${suffix ? "pr-10" : ""}`.trim()}
                    onChange={(e) => onChange(e.target.value)}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
            </WithRangeNote>
        );
    }

    // text — the only type left, and the one that can carry a literal mask
    // (national IDs, plates). Phone numbers do NOT use this: libphonenumber
    // already knows every country's format.
    if (config.mask) {
        return (
            <MaskedInput id={id} value={value || ""} onChange={onChange}
                         mask={config.mask} placeholder={attr.placeholder} disabled={disabled} />
        );
    }
    return (
        <Input
            id={id} type="text" placeholder={placeholder} value={value || ""} disabled={disabled}
            minLength={config.min_length ?? undefined} maxLength={config.max_length ?? undefined}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};

/**
 * The message the API would return for a numeric value out of range, worded
 * exactly as _check_number in app/attributes/validators.py words it, so the
 * sentence someone reads while typing is the sentence they would otherwise
 * have met on save.
 *
 * This does not gate anything: the backend stays the only authority on whether
 * a value is acceptable. It only stops the rejection being a surprise — an
 * `<input type="number" min max>` does not refuse out-of-range typing, it only
 * constrains the spinner, which is what made the range look decorative.
 */
const rangeMessage = (attr, value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;

    const config = attr.format_config || {};
    const label = attr.label || attr.name;
    if (config.allow_negative === false && num < 0) return `'${label}' cannot be negative.`;
    if (config.min !== null && config.min !== undefined && num < config.min) {
        return `'${label}' must be at least ${config.min}.`;
    }
    if (config.max !== null && config.max !== undefined && num > config.max) {
        return `'${label}' must be at most ${config.max}.`;
    }
    return null;
};

const WithRangeNote = ({ attr, value, children }) => {
    const message = rangeMessage(attr, value);
    if (!message) return children;
    return (
        <div className="flex flex-col gap-1">
            {children}
            <span className="text-[11px]" style={{ color: "#b4453c" }}>{message}</span>
        </div>
    );
};

const CalculatedValue = ({ id, attr, value }) => {
    const rendered = formatAttributeValue(attr, value);
    return (
        <div
            id={id}
            title={attr.formula ? `Formula: ${attr.formula}` : undefined}
            className="flex h-9 items-center gap-2 rounded-md px-3"
            style={{ backgroundColor: "var(--card)", border: "1px dashed var(--border)", color: "var(--foreground)" }}
        >
            <FunctionSquare size={13} style={{ color: "var(--secondary-text)", flexShrink: 0 }} />
            <span className="truncate text-sm">
                {rendered || <span style={{ color: "#9b948e" }}>Calculated on save</span>}
            </span>
        </div>
    );
};

const OptionButtons = ({ id, options, value, onChange, disabled, variant = "buttons" }) => (
    <div id={id} className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
            const selected = opt.value === value;
            return (
                <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(selected ? "" : opt.value)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                        backgroundColor: selected ? (opt.color || "var(--secondary)") : "transparent",
                        color: selected ? "var(--background)" : "var(--foreground)",
                        border: `1px solid ${opt.color || "var(--border)"}`,
                        opacity: disabled ? 0.6 : 1,
                    }}
                >
                    {variant === "radio" && (
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{
                                border: `1px solid ${selected ? "var(--background)" : "#9b948e"}`,
                                backgroundColor: selected ? "var(--background)" : "transparent",
                            }}
                        />
                    )}
                    {opt.label}
                </button>
            );
        })}
    </div>
);
