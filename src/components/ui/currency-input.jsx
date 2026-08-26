import { useEffect, useState } from "react";
import { Input } from "./input";

// Keeps only digits and a single decimal point — anything else the user
// types (a second ".", a stray comma, letters) is dropped rather than
// rejected outright, so pasting a pre-formatted "$1,234.50" still works.
const stripToNumericString = (input) => {
    let cleaned = String(input || "").replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
    return cleaned;
};

// Live, while-typing formatting — inserts thousands separators into the
// integer part but leaves the decimal part exactly as typed (no padding/
// truncating mid-keystroke; that only happens on blur, see handleBlur below).
const formatLive = (numericString) => {
    if (!numericString) return "";
    const [intPart, decPart] = numericString.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
};

// Same wire-format/display-format split as date-input.jsx and phone-input.jsx:
// the stored value (`value` prop / `onChange` payload) is always a plain
// number, only the on-screen text carries the "$" / thousands-separator
// formatting. `symbol`/`decimals` come from the attribute's format_config.
export const CurrencyInput = ({ id, value, onChange, symbol = "$", decimals = 2, placeholder, disabled }) => {
    const displayFromValue = () => (value === "" || value === null || value === undefined ? "" : formatLive(String(value)));
    const [text, setText] = useState(displayFromValue());

    useEffect(() => {
        setText(displayFromValue());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e) => {
        const numericString = stripToNumericString(e.target.value);
        setText(formatLive(numericString));
        if (numericString === "" || numericString === ".") {
            onChange?.("");
            return;
        }
        const num = Number(numericString);
        if (!Number.isNaN(num)) onChange?.(num);
    };

    const handleBlur = () => {
        const num = Number(value);
        if (value === "" || value === null || value === undefined || Number.isNaN(num)) {
            setText("");
            return;
        }
        setText(num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
    };

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                {symbol}
            </span>
            <Input
                id={id}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={placeholder || "0.00"}
                value={text}
                disabled={disabled}
                onChange={handleChange}
                onBlur={handleBlur}
                className="pl-6"
            />
        </div>
    );
};
