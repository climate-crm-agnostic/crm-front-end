import { findOption, formatAttributeValue, LIST_TYPES } from "@/utils/attributeTypes";

/**
 * A list option as a chip: a dot in the option's own colour on a faint tint of it. The text keeps the normal
 * foreground colour, so it reads the same in light and dark mode whatever colour the admin picked.
 */
export const OptionChip = ({ label, color }) => (
    <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: `color-mix(in srgb, ${color || "var(--muted-foreground)"} 16%, transparent)`, color: "var(--foreground)" }}
    >
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color || "var(--muted-foreground)" }} aria-hidden="true" />
        {label}
    </span>
);

/** The value of a custom field in a table cell: list options as chips, everything else formatted by its type. */
export const AttributeCell = ({ attr, value }) => {
    if (value === undefined || value === null || value === "") return null;
    if (LIST_TYPES.has(attr.type) && attr.type === "list") {
        const option = findOption(attr.list_values, value);
        return <OptionChip label={option?.label ?? String(value)} color={option?.color} />;
    }
    return <>{formatAttributeValue(attr, value)}</>;
};

