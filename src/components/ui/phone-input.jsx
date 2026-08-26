import { useEffect, useState } from "react";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js/min";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { COUNTRY_LIST, guessDefaultCountry } from "@/utils/phoneCountries";

// Same wire-format/display-format split as date-input.jsx and
// currency-input.jsx: the stored value (the `value` prop / what `onChange`
// emits) is always a full E.164 string (e.g. "+50688888888") once the
// number is complete enough to parse — the country is derived FROM that
// string via libphonenumber-js, never stored separately, so a phone
// attribute's value stays a single plain string everywhere else in the
// codebase that already expects one (uniqueness checks, Excel export, merge
// fields, ...). Nothing is emitted while the number is still incomplete;
// like DateInput, the display reverts to the last valid value on blur if
// what's typed never became a real number.
const deriveDisplay = (value, fallbackCountry) => {
    if (!value) return { country: fallbackCountry, text: "" };
    let parsed = parsePhoneNumberFromString(value);
    if (!parsed) {
        // Legacy/bare-digits values (saved before this component existed,
        // with no country encoded) — reinterpret as a national number under
        // the fallback country instead of failing to display at all.
        parsed = parsePhoneNumberFromString(value, fallbackCountry);
    }
    if (parsed) {
        return { country: parsed.country || fallbackCountry, text: parsed.formatNational() };
    }
    return { country: fallbackCountry, text: value };
};

export const PhoneInput = ({ id, value, onChange, defaultCountry, disabled, placeholder }) => {
    const fallbackCountry = defaultCountry || guessDefaultCountry();
    const [country, setCountry] = useState(() => deriveDisplay(value, fallbackCountry).country);
    const [text, setText] = useState(() => deriveDisplay(value, fallbackCountry).text);

    useEffect(() => {
        const derived = deriveDisplay(value, country || fallbackCountry);
        setCountry(derived.country);
        setText(derived.text);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const emitIfComplete = (rawDigits, forCountry) => {
        if (!rawDigits) {
            onChange?.("");
            return;
        }
        const parsed = parsePhoneNumberFromString(rawDigits, forCountry);
        if (parsed) onChange?.(parsed.number);
    };

    const handleTextChange = (e) => {
        const raw = e.target.value;
        setText(new AsYouType(country).input(raw));
        emitIfComplete(raw, country);
    };

    const handleCountryChange = (newCountry) => {
        const digits = text.replace(/\D/g, "");
        setCountry(newCountry);
        setText(new AsYouType(newCountry).input(digits));
        emitIfComplete(digits, newCountry);
    };

    const handleBlur = () => {
        const derived = deriveDisplay(value, country);
        setCountry(derived.country);
        setText(derived.text);
    };

    const selectedCountry = COUNTRY_LIST.find((c) => c.code === country);

    return (
        <div className="flex gap-1.5">
            <Select value={country} onValueChange={handleCountryChange} disabled={disabled}>
                <SelectTrigger className="w-[92px] shrink-0 px-2" aria-label="Country">
                    <SelectValue>
                        {selectedCountry ? `${selectedCountry.flag} +${selectedCountry.callingCode}` : country}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {COUNTRY_LIST.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.name} (+{c.callingCode})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                id={id}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder={placeholder || "Phone number"}
                value={text}
                disabled={disabled}
                onChange={handleTextChange}
                onBlur={handleBlur}
                className="flex-1"
            />
        </div>
    );
};
