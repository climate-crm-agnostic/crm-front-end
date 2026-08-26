import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DateInput } from "../ui/date-input";
import { PhoneInput } from "../ui/phone-input";
import { CurrencyInput } from "../ui/currency-input";

/**
 * Single renderer for a dynamic Attribute/PipelineAttribute value, covering
 * every type in crm-front-end/src/utils/attributeTypes.js. Replaces the
 * list/boolean/date/(email)/number/text ternary that used to be copy-pasted
 * into every entity detail page and modal — a new type now needs exactly one
 * edit (here), not a hunt through a dozen files that inevitably drifted out
 * of sync with each other (confirmed: 'email' shipped wired into only 4 of
 * 12+ of those copies).
 *
 * `onChange` always receives the new raw value directly (not an event) —
 * callers do `onChange={(v) => handleAttributeChange(attr.name, v)}`.
 */
export const DynamicAttributeField = ({ attr, value, onChange, idPrefix }) => {
    const id = idPrefix ? `${idPrefix}-${attr.name}` : attr.name;

    if (attr.type === "list") {
        return (
            <Select onValueChange={onChange} value={value}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={`Select ${attr.label}`} />
                </SelectTrigger>
                <SelectContent>
                    {attr.options?.map((opt) => (
                        <SelectItem key={opt.value || opt} value={opt.value || opt}>
                            {opt.label || opt}
                        </SelectItem>
                    )) || <SelectItem value="no-options">No options available</SelectItem>}
                </SelectContent>
            </Select>
        );
    }

    if (attr.type === "boolean") {
        return (
            <div className="flex items-center space-x-2 h-10">
                <Switch id={id} checked={!!value} onCheckedChange={onChange} />
                <Label htmlFor={id} className="cursor-pointer font-normal text-muted-foreground">
                    {value ? "Yes" : "No"}
                </Label>
            </div>
        );
    }

    if (attr.type === "date") {
        return <DateInput id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }

    if (attr.type === "textarea") {
        return <Textarea id={id} placeholder={attr.label} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }

    if (attr.type === "phone") {
        return (
            <PhoneInput
                id={id}
                value={value || ""}
                onChange={onChange}
                defaultCountry={attr.format_config?.default_country}
            />
        );
    }

    if (attr.type === "currency") {
        return (
            <CurrencyInput
                id={id}
                value={value ?? ""}
                onChange={onChange}
                symbol={attr.format_config?.symbol}
                decimals={attr.format_config?.decimals}
            />
        );
    }

    if (attr.type === "email") {
        return <Input id={id} type="email" placeholder={attr.label} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }

    if (attr.type === "url") {
        return <Input id={id} type="url" placeholder={attr.label} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }

    if (attr.type === "percentage") {
        return (
            <div className="relative">
                <Input
                    id={id}
                    type="number"
                    placeholder={attr.label}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
            </div>
        );
    }

    // text / number fallback (the two types that never needed a special
    // widget to begin with).
    return (
        <Input
            id={id}
            type={attr.type === "number" ? "number" : "text"}
            placeholder={attr.label}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};
