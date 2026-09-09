import { DynamicAttributeField } from "./DynamicAttributeField";
import { formatAttributeValue } from "../../utils/attributeTypes";

const CARD = {
    backgroundColor: "#fff", border: "1px solid #D8D2C4", borderRadius: 10, padding: 14,
};

/**
 * Live preview of the field being configured, plus a plain-language summary of
 * what it will accept.
 *
 * It renders the real DynamicAttributeField with the real draft config, so what
 * the admin sees here is literally what the person filling in a record gets —
 * not an approximation that can drift.
 */
export const AttributePreview = ({ draft, value, onChange, rules }) => {
    const attr = {
        name: draft.name || "preview",
        label: draft.label || "Untitled field",
        type: draft.type,
        placeholder: draft.placeholder,
        format_config: draft.format_config || {},
        list_values: draft.list_values || [],
        options: draft.list_values || [],
    };

    const hasValue = value !== "" && value !== null && value !== undefined
        && !(Array.isArray(value) && value.length === 0);

    return (
        <div className="flex flex-col gap-3">
            <div style={CARD}>
                <p style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#9b948e", marginBottom: 10,
                }}>
                    Preview
                </p>

                <label style={{
                    display: "block", fontSize: 12, fontWeight: 600,
                    color: "#2E2A26", marginBottom: 6,
                }}>
                    {attr.label}
                    {draft.is_required && <span style={{ color: "#c0392b" }}> *</span>}
                </label>

                <DynamicAttributeField
                    attr={attr}
                    value={value}
                    onChange={onChange}
                    idPrefix="preview"
                />

                {draft.description && (
                    <p style={{ fontSize: 11, color: "#9b948e", marginTop: 6 }}>
                        {draft.description}
                    </p>
                )}

                {hasValue && (
                    <div style={{
                        marginTop: 10, paddingTop: 10, borderTop: "1px dashed #D8D2C4",
                        fontSize: 11, color: "#6b6560",
                    }}>
                        <span style={{ opacity: 0.7 }}>Shown in tables as </span>
                        <strong style={{ color: "#2E2A26" }}>
                            {formatAttributeValue(attr, value) || "—"}
                        </strong>
                    </div>
                )}
            </div>

            <div style={CARD}>
                <p style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#9b948e", marginBottom: 8,
                }}>
                    Validation
                </p>
                {rules.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9b948e" }}>
                        No restrictions — anything of this type is accepted.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {rules.map((rule, i) => (
                            <li key={i} className="flex gap-2" style={{ fontSize: 12, color: "#2E2A26" }}>
                                <span style={{ color: "#5E6A43" }}>•</span>
                                <span>{rule}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
