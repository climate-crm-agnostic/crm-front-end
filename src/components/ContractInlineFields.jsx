import { Fragment, useMemo } from "react";

// Matches both marker conventions used by the two flows:
//   - {{variable}}  → uploaded-PDF variables detected by the AI
//   - {lead.x}/{client.x} → AI-template merge fields
// A single-brace token must contain a dot (entity.field) so it doesn't catch
// stray "{" in prose; a double-brace token matches any identifier.
const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.\- ]+?)\s*\}\}|\{([a-zA-Z_]\w*\.[a-zA-Z_]\w*)\}/g;

/**
 * Renders a contract's sections as an interactive form (Option 2): the
 * document text is shown as-is with an inline input wherever a variable
 * appears, so the user "writes over" each spot in context instead of filling
 * a detached list of fields. Used for both the uploaded-PDF flow (parsed
 * {{markers}}) and the AI-template flow ({lead.x}/{client.x}).
 *
 * Props:
 *   sections: [{ title, body }] with variable markers in `body`.
 *   values:   { [name]: string } current input values.
 *   labels:   optional { [name]: label } for input aria/placeholder.
 *   onChange: (name, value) => void.
 *   readOnly: render resolved text without inputs (preview of the final doc).
 */
export const ContractInlineFields = ({ sections = [], values = {}, labels = {}, onChange, readOnly = false }) => {
    const rendered = useMemo(() => sections.map((section, si) => {
        const body = section.body || "";
        const parts = [];
        let last = 0;
        let match;
        let idx = 0;
        TOKEN_PATTERN.lastIndex = 0;
        while ((match = TOKEN_PATTERN.exec(body)) !== null) {
            if (match.index > last) parts.push({ type: "text", value: body.slice(last, match.index), key: `t${idx++}` });
            const name = (match[1] || match[2] || "").trim();
            parts.push({ type: "var", name, key: `v${idx++}` });
            last = TOKEN_PATTERN.lastIndex;
        }
        if (last < body.length) parts.push({ type: "text", value: body.slice(last), key: `t${idx++}` });
        return { si, title: section.title, parts };
    }), [sections]);

    return (
        <div className="space-y-4">
            {rendered.map(({ si, title, parts }) => (
                <div key={si} className="space-y-1">
                    {title ? <p className="text-sm font-semibold">{title}</p> : null}
                    <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
                        {parts.map((part) => {
                            if (part.type === "text") return <Fragment key={part.key}>{part.value}</Fragment>;
                            const val = values[part.name] ?? "";
                            if (readOnly) {
                                return (
                                    <span key={part.key} className="font-medium underline decoration-dotted">
                                        {val || `{${part.name}}`}
                                    </span>
                                );
                            }
                            return (
                                <input
                                    key={part.key}
                                    type="text"
                                    value={val}
                                    onChange={(e) => onChange?.(part.name, e.target.value)}
                                    placeholder={labels[part.name] || part.name}
                                    aria-label={labels[part.name] || part.name}
                                    className="inline-block align-baseline mx-0.5 px-1.5 py-0.5 min-w-[8ch] rounded border border-primary/40 bg-primary/5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    style={{ width: `${Math.max(8, (val.length || (labels[part.name] || part.name).length) + 1)}ch` }}
                                />
                            );
                        })}
                    </p>
                </div>
            ))}
        </div>
    );
};
