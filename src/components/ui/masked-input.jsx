import { useMemo } from "react";
import { Input } from "./input";

// Literal mask tokens, matching app/attributes/validators.py's _MASK_TOKENS so
// what the input allows is exactly what the backend accepts.
const TOKENS = {
    "#": (c) => /\d/.test(c),
    A: (c) => /[a-zA-Z]/.test(c),
    "@": (c) => /[a-zA-Z0-9]/.test(c),
};

// Applies the mask to whatever the user has typed, inserting the literal
// characters (dashes, parentheses) as they go and dropping anything that does
// not fit the next token.
//
// Not exported: a module that exports both a component and a plain function
// breaks fast refresh. Nothing outside needs it — the backend enforces the mask
// independently (app/attributes/validators.py's _matches_mask).
const applyMask = (mask, raw) => {
    if (!mask) return raw;
    const input = String(raw ?? "");
    let out = "";
    let i = 0;
    for (const maskChar of mask) {
        if (i >= input.length) break;
        const check = TOKENS[maskChar];
        if (!check) {
            out += maskChar;
            // Let the user type the literal themselves without duplicating it.
            if (input[i] === maskChar) i += 1;
            continue;
        }
        while (i < input.length && !check(input[i])) i += 1;
        if (i >= input.length) break;
        out += input[i];
        i += 1;
    }
    return out;
};

export const MaskedInput = ({ id, value, onChange, mask, placeholder, disabled }) => {
    const hint = useMemo(() => placeholder || mask, [placeholder, mask]);
    return (
        <Input
            id={id}
            value={value || ""}
            placeholder={hint}
            disabled={disabled}
            onChange={(e) => onChange?.(applyMask(mask, e.target.value))}
            inputMode={/^[#\s()\-+.]*$/.test(mask || "") ? "numeric" : undefined}
        />
    );
};
