import { GripVertical, Plus, Trash2 } from "lucide-react";
import { normalizeOptions } from "../../utils/attributeTypes";

// Brand palette, so option colours stay coherent with the rest of the CRM.
const SWATCHES = [
    "#5E6A43", "#B8C76A", "#F29B6B", "#c0392b", "#356a80",
    "#6b3fa0", "#c0622a", "#6b6560", null,
];

const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "#6b6560", marginBottom: 5,
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
                   style={{ borderColor: "#D8D2C4", color: "#9b948e" }}>
                    No options yet — a select field needs at least one.
                </p>
            )}

            <div className="flex flex-col gap-1.5">
                {options.map((option, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
                        style={{
                            border: "1px solid #D8D2C4",
                            backgroundColor: option.is_active ? "#fff" : "#F2EBDD",
                            opacity: option.is_active ? 1 : 0.65,
                        }}
                    >
                        <div className="flex flex-col">
                            <button type="button" onClick={() => move(index, -1)}
                                    className="leading-none" style={{ color: "#D8D2C4" }}
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
                            style={{ color: "#2E2A26" }}
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
                                            ? `2px solid ${option.color === swatch ? "#2E2A26" : "transparent"}`
                                            : `1px dashed ${option.color ? "#D8D2C4" : "#2E2A26"}`,
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
                                border: "1px solid #D8D2C4",
                                color: option.is_active ? "#5E6A43" : "#9b948e",
                            }}
                        >
                            {option.is_active ? "Active" : "Retired"}
                        </button>

                        <button type="button" onClick={() => remove(index)}
                                className="shrink-0" style={{ color: "#c0392b" }} title="Delete">
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={add}
                className="flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-semibold"
                style={{ border: "1px dashed #D8D2C4", color: "#5E6A43" }}
            >
                <Plus size={12} /> Add option
            </button>

            {error && <span style={{ color: "#c0392b", fontSize: 11 }}>{error}</span>}

            <p style={{ fontSize: 11, color: "#9b948e" }}>
                A new option's key follows what you type. Once saved, renaming changes only
                what people see — records keep pointing at it. Retire instead of deleting to
                stop an option being chosen without breaking the records that already use it.
            </p>
        </div>
    );
};
