import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { cn } from "../../lib/utils";

/**
 * Single-select with a type-to-filter box, for lists long enough that a plain
 * dropdown stops being usable. Options are the canonical
 * {value,label,color,is_active} objects; retired ones are not offered but a
 * value already pointing at one still renders with its label.
 */
export const SearchableSelect = ({
    id, value, onChange, options = [], placeholder = "Select...", disabled, allowClear = true,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    // Active *and* actually selectable: an option with no value cannot be
    // picked, and offering it would let the caller clear the field by accident.
    const selectable = useMemo(
        () => options.filter((o) => o.is_active !== false && String(o.value ?? "").trim() !== ""),
        [options],
    );
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return selectable;
        return selectable.filter((o) => String(o.label).toLowerCase().includes(q));
    }, [selectable, query]);

    const current = options.find((o) => o.value === value);

    return (
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn("truncate", !current && "text-muted-foreground")}>
                        {current ? current.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                    <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                    {allowClear && (
                        <OptionRow
                            label={<span className="text-muted-foreground">Clear selection</span>}
                            selected={!value}
                            onSelect={() => { onChange?.(""); setOpen(false); }}
                        />
                    )}
                    {filtered.length === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No matches
                        </p>
                    ) : (
                        filtered.map((option) => (
                            <OptionRow
                                key={option.value}
                                label={option.label}
                                color={option.color}
                                selected={option.value === value}
                                onSelect={() => { onChange?.(option.value); setOpen(false); }}
                            />
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const OptionRow = ({ label, color, selected, onSelect }) => (
    <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
        <Check className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} />
        {color && (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )}
        <span className="truncate">{label}</span>
    </button>
);
