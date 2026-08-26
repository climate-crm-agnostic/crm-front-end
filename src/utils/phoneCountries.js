import { getCountries, getCountryCallingCode } from "libphonenumber-js/min";

// Converts a 2-letter ISO country code into its flag emoji using Unicode
// "regional indicator symbol" letters (A -> 🇦, B -> 🇧, ...) — no image
// assets needed, works anywhere emoji render.
export const getFlagEmoji = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return "";
    const codePoints = [...countryCode.toUpperCase()].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
    return String.fromCodePoint(...codePoints);
};

const displayNames = typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const getCountryName = (countryCode) => {
    try {
        return displayNames?.of(countryCode) || countryCode;
    } catch {
        return countryCode;
    }
};

// Built once at module load — every ISO country libphonenumber-js knows a
// calling code for, with a display name (native Intl.DisplayNames, no
// bundled country-name data file needed) and a computed flag emoji.
export const COUNTRY_LIST = getCountries()
    .map((code) => ({
        code,
        name: getCountryName(code),
        callingCode: getCountryCallingCode(code),
        flag: getFlagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

// Best-effort initial country for a phone input that has no stored value yet
// and no attribute-level default_country configured — reads the region
// subtag out of the browser's locale (e.g. "es-CR" -> "CR"), falling back to
// "US" if that's missing/unrecognized.
export const guessDefaultCountry = () => {
    try {
        const locale = typeof navigator !== "undefined" ? navigator.language : "";
        const region = new Intl.Locale(locale).maximize().region;
        if (region && COUNTRY_LIST.some((c) => c.code === region)) return region;
    } catch {
        // fall through to hardcoded default below
    }
    return "US";
};
