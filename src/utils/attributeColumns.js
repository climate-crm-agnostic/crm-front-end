import { createElement } from "react";
import { AttributeCell } from "@/components/OptionChip";

/**
 * Table columns for an entity's custom fields. Honours each field's "Column in tables" switch; when none is
 * switched on (a tenant that never set it) every field is shown, as before.
 */
export const buildAttributeColumns = (attributes = []) => {
    const flagged = attributes.filter((attr) => attr.show_in_table);
    return (flagged.length ? flagged : attributes).map((attr) => ({
        key: attr.name, label: attr.label, render: (value) => createElement(AttributeCell, { attr, value }),
    }));
};
