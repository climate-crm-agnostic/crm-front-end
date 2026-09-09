import { getFlagEmoji } from "./phoneCountries";

// Currency list for the attribute configuration picker.
//
// Built from Intl.supportedValuesOf('currency') where the browser has it (all
// current evergreen browsers do), so there is no bundled ISO 4217 table to keep
// up to date — the same reasoning as phoneCountries.js deriving its data from
// libphonenumber and Intl.DisplayNames rather than a data file.
const FALLBACK_CODES = [
    "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY",
    "MXN", "CRC", "GTQ", "PAB", "NIO", "HNL", "DOP", "COP",
    "CLP", "PEN", "ARS", "BRL", "UYU", "BOB", "PYG", "VES",
];

const displayNames = typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "currency" })
    : null;

const currencyName = (code) => {
    try {
        return displayNames?.of(code) || code;
    } catch {
        return code;
    }
};

// The first two letters of an ISO 4217 code are the ISO 3166 country in almost
// every case (CRC -> CR, JPY -> JP), which is enough for a flag. EUR maps to
// "EU", whose regional-indicator pair renders as the EU flag. Codes that are
// not country-based (XAF, XOF, XPF) get no flag rather than a wrong one.
const flagFor = (code) => (code.startsWith("X") ? "" : getFlagEmoji(code.slice(0, 2)));

const codes = (() => {
    try {
        const supported = Intl.supportedValuesOf?.("currency");
        return supported?.length ? supported : FALLBACK_CODES;
    } catch {
        return FALLBACK_CODES;
    }
})();

export const CURRENCY_LIST = codes
    .map((code) => ({ code, name: currencyName(code), flag: flagFor(code) }))
    .sort((a, b) => a.code.localeCompare(b.code));
