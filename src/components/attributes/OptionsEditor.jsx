import { GripVertical, Plus, Trash2 } from "lucide-react";
import { normalizeOptions } from "../../utils/attributeTypes";

// Brand palette, so option colours stay coherent with the rest of the CRM.
// Note: --accent equals --primary in the current palette, so it's skipped here
// in favor of the old citron tone — otherwise two swatches would be identical.
const SWATCHES = [
    "var(--secondary)", "#B8C76A", "var(--primary)", "var(--destructive)", "#356a80",
    "#6b3fa0", "#c0622a", "var(--muted-foreground)", null,
];

const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: 5,
};

/**
 * Editor for the options of a `list` / `multiselect` attribute.
 *
 * Options are objects, not strings. That is what lets an option be recoloured,
 * reordered, renamed or retired — the `value` is what stored records point at
 * and is therefore never edited after creation, only the `label` is. Retiring
 * (`is_active: false`) keeps existing records valid while removing the option
 * from new entries; deleting outright would orphan them.
 */
export const OptionsEditor = ({ value, onChange, error, lockedValues }) => {
    const options = normalizeOptions(value);
    // Values already saved on the server. Those are what stored records point
    // at, so renaming one must only change its label. A value not in this set
    // belongs to an option being typed right now, and tracks the label until it
    // is saved for the first time.
    const isLocked = (option) => !!lockedValues?.has(option.value);

    const update = (index, patch) => {
        const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o));
        onChange(next.map((o, i) => ({ ...o, order: i })));
    };

    const add = () => onChange([
        ...options,
        { value: "", label: "", color: null, order: options.length, is_active: true },
    ]);

    const remove = (index) =>
        onChange(options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i })));

    const move = (index, delta) => {
        const target = index + delta;
        if (target < 0 || target >= options.length) return;
        const next = [...options];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next.map((o, i) => ({ ...o, order: i })));
    };

    return (
        <div className="flex flex-col gap-2">
            <label style={labelStyle}>Options</label>

            {options.length === 0 && (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs"
                   style={{ borderColor: "var(--border)", color: "#9b948e" }}>
                    No options yet — a select field needs at least one.
                </p>
            )}

            <div className="flex flex-col gap-1.5">
                {options.map((option, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
                        style={{
                            border: "1px solid var(--border)",
                            backgroundColor: option.is_active ? "var(--background)" : "var(--card)",
                            opacity: option.is_active ? 1 : 0.65,
                        }}
                    >
                        <div className="flex flex-col">
                            <button type="button" onClick={() => move(index, -1)}
                                    className="leading-none" style={{ color: "var(--border)" }}
                                    title="Move up" disabled={index === 0}>
                                <GripVertical size={12} />
                            </button>
                        </div>

                        <input
                            value={option.label}
                            onChange={(e) => {
                                const label = e.target.value;
                                // Keyed off "has this been saved", not "does it
                                // already have a value": the previous check made
                                // the value stop following the label after the
                                // first keystroke, so typing "Alto" into a new
                                // option stored the value as "A".
                                update(index, isLocked(option)
                                    ? { label }
                                    : { label, value: label });
                            }}
                            placeholder="Option label"
                            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                            style={{ color: "var(--foreground)" }}
                        />

                        <div className="flex shrink-0 items-center gap-0.5">
                            {SWATCHES.map((swatch) => (
                                <button
                                    key={swatch || "none"}
                                    type="button"
                                    title={swatch || "No colour"}
                                    onClick={() => update(index, { color: swatch })}
                                    className="h-4 w-4 rounded-full"
                                    style={{
                                        backgroundColor: swatch || "transparent",
                                        border: swatch
                                            ? `2px solid ${option.color === swatch ? "var(--foreground)" : "transparent"}`
                                            : `1px dashed ${option.color ? "var(--border)" : "var(--foreground)"}`,
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => update(index, { is_active: !option.is_active })}
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                            title={option.is_active
                                ? "Retire — keeps existing records valid, hides it from new ones"
                                : "Bring back"}
                            style={{
                                border: "1px solid var(--border)",
                                color: option.is_active ? "var(--secondary-text)" : "#9b948e",
                            }}
                        >
                            {option.is_active ? "Active" : "Retired"}
                        </button>

                        <button type="button" onClick={() => remove(index)}
                                className="shrink-0" style={{ color: "var(--destructive)" }} title="Delete">
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={add}
                className="flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold"
                style={{ border: "1px dashed var(--border)", color: "var(--secondary-text)" }}
            >
                <Plus size={12} /> Add option
            </button>

            {error && <span style={{ color: "var(--destructive)", fontSize: 11 }}>{error}</span>}

            <p style={{ fontSize: 11, color: "#9b948e" }}>
                A new option's key follows what you type. Once saved, renaming changes only
                what people see — records keep pointing at it. Retire instead of deleting to
                stop an option being chosen without breaking the records that already use it.
            </p>
        </div>
    );
};
