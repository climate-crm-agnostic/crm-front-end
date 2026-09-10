import { formatAttributeValue } from "../../utils/attributeTypes";

/**
 * Read-only rendering of one attribute value for a table cell.
 *
 * Almost every type is just formatted text (formatAttributeValue handles
 * that). `url` is the one type that needs a real element instead of a
 * string: a clickable link is a rendering concern, not a formatting one, so
 * it lives here rather than in formatAttributeValue — whose return value is
 * also used by the Excel export and merge fields, where an <a> has no
 * meaning.
 */
export const AttributeValueCell = ({ attr, value }) => {
    const text = formatAttributeValue(attr, value);

    if (attr?.type === "url" && value) {
        const openInNewTab = attr.format_config?.open_in_new_tab !== false;
        return (
            <a
                href={value}
                target={openInNewTab ? "_blank" : undefined}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                className="underline"
                style={{ color: "#5E6A43" }}
                onClick={(e) => e.stopPropagation()}
            >
                {text}
            </a>
        );
    }

    return text;
};
