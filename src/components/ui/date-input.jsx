import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// mm/dd/yyyy is the format requested for the whole app (US English) — the
// native <input type="date"> can't be forced into this format (its display
// follows the visitor's OS/browser locale, not the page), so this component
// replaces it everywhere a date needs to be entered. The wire format (the
// `value` prop and what `onChange` emits) stays ISO "yyyy-mm-dd" so it's a
// drop-in swap for existing `<input type="date" value={x} onChange={e =>
// setX(e.target.value)} />` call sites — no other code needs to change.

const isoToParts = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    return { year: m[1], month: m[2], day: m[3] };
};

const isoToDisplay = (iso) => {
    const p = isoToParts(iso);
    return p ? `${p.month}/${p.day}/${p.year}` : "";
};

const isoToDate = (iso) => {
    const p = isoToParts(iso);
    if (!p) return undefined;
    const d = new Date(Number(p.year), Number(p.month) - 1, Number(p.day));
    // Reject roll-over dates like Feb 30 -> Mar 2.
    if (d.getFullYear() !== Number(p.year) || d.getMonth() !== Number(p.month) - 1 || d.getDate() !== Number(p.day)) {
        return undefined;
    }
    return d;
};

const dateToIso = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Auto-inserts "/" as the user types digits, caps at mm/dd/yyyy length.
const maskDisplay = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const month = digits.slice(0, 2);
    const day = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    if (digits.length <= 2) return month;
    if (digits.length <= 4) return `${month}/${day}`;
    return `${month}/${day}/${year}`;
};

const displayToIsoIfComplete = (display) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
    if (!m) return null;
    const [, month, day, year] = m;
    const date = isoToDate(`${year}-${month}-${day}`);
    return date ? `${year}-${month}-${day}` : null;
};

export const DateInput = ({
    id,
    name,
    value,
    onChange,
    required,
    disabled,
    placeholder = "mm/dd/yyyy",
    className = "",
    style = {},
}) => {
    const [text, setText] = useState(isoToDisplay(value));
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setText(isoToDisplay(value));
    }, [value]);

    const emit = (isoValue) => onChange?.({ target: { name, value: isoValue } });

    const handleTextChange = (e) => {
        const masked = maskDisplay(e.target.value);
        setText(masked);
        if (masked === "") {
            emit("");
            return;
        }
        const iso = displayToIsoIfComplete(masked);
        if (iso) emit(iso);
    };

    const handleBlur = () => {
        // Revert to the last valid value if what's typed never completed.
        setText(isoToDisplay(value));
    };

    return (
        <div className={`relative flex items-center ${className}`} style={style}>
            <input
                id={id}
                name={name}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={placeholder}
                value={text}
                disabled={disabled}
                required={required}
                onChange={handleTextChange}
                onBlur={handleBlur}
                style={{
                    backgroundColor: disabled ? "#F2EBDD" : "#fff",
                    border: "1px solid #D8D2C4",
                    color: "#2E2A26",
                    width: "100%",
                    height: 36,
                    borderRadius: 6,
                    padding: "0 36px 0 12px",
                    fontSize: 14,
                }}
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label="Open calendar"
                        style={{
                            position: "absolute",
                            right: 8,
                            background: "transparent",
                            border: "none",
                            color: "#9b948e",
                            cursor: disabled ? "default" : "pointer",
                            display: "flex",
                        }}
                    >
                        <CalendarDays className="h-4 w-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-auto p-2"
                    style={{ backgroundColor: "#fff", border: "1px solid #D8D2C4" }}
                >
                    <div style={{ "--rdp-accent-color": "#5E6A43", "--rdp-accent-background-color": "#F2EBDD" }}>
                        <DayPicker
                            mode="single"
                            selected={isoToDate(value)}
                            defaultMonth={isoToDate(value) || new Date()}
                            onSelect={(date) => {
                                if (!date) return;
                                emit(dateToIso(date));
                                setOpen(false);
                            }}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};
