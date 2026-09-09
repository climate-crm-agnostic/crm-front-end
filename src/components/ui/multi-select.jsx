import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { cn } from "../../lib/utils";

/**
 * Multi-select for the `multiselect` attribute type. The stored value is an
 * array of option *values* (not labels), matching what the backend validates.
 *
 * `display` mirrors the type's format_config: "checkboxes" renders them inline,
 * "tags" / "searchable" use the popover.
 */
export const MultiSelect = ({
    id, value, onChange, options = [], display = "tags", disabled,
    placeholder = "Select...", maxSelected,
}) => {
    const selected = Array.isArray(value) ? value : [];
    const selectable = useMemo(() => options.filter((o) => o.is_active !== false), [options]);

    const toggle = (optionValue) => {
        if (selected.includes(optionValue)) {
            onChange?.(selected.filter((v) => v !== optionValue));
            return;
        }
        if (maxSelected && selected.length >= maxSelected) return;
        onChange?.([...selected, optionValue]);
    };

    if (display === "checkboxes") {
        return (
            <div id={id} className="flex flex-col gap-1.5 rounded-md border p-2">
                {selectable.map((option) => (
                    <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                        <input
                            type="checkbox"
                            disabled={disabled}
                            checked={selected.includes(option.value)}
                            onChange={() => toggle(option.value)}
                            style={{ accentColor: "#5E6A43" }}
                        />
                        {option.color && (
                            <span className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: option.color }} />
                        )}
                        {option.label}
                    </label>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <PopoverPicker
                id={id}
                selected={selected}
                options={selectable}
                onToggle={toggle}
                placeholder={placeholder}
                disabled={disabled}
            />
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selected.map((v) => {
                        const option = options.find((o) => o.value === v);
                        return (
                            <span
                                key={v}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                                style={{
                                    backgroundColor: option?.color ? `${option.color}22` : "#F2EBDD",
                                    border: `1px solid ${option?.color || "#D8D2C4"}`,
                                    color: "#2E2A26",
                                }}
                            >
                                {option?.label ?? v}
                                {!disabled && (
                                    <button type="button" onClick={() => toggle(v)}
                                            className="opacity-60 hover:opacity-100">
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const PopoverPicker = ({ id, selected, options, onToggle, placeholder, disabled }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => String(o.label).toLowerCase().includes(q));
    }, [options, query]);

    return (
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
            <PopoverTrigger asChild>
                <Button id={id} type="button" variant="outline" role="combobox"
                        disabled={disabled} className="w-full justify-between font-normal">
                    <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
                        {selected.length === 0
                            ? placeholder
                            : `${selected.length} selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                    <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <input
                        autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                    {filtered.length === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches</p>
                    ) : filtered.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onToggle(option.value)}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                            <Check className={cn("h-3.5 w-3.5 shrink-0",
                                selected.includes(option.value) ? "opacity-100" : "opacity-0")} />
                            {option.color && (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: option.color }} />
                            )}
                            <span className="truncate">{option.label}</span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};
