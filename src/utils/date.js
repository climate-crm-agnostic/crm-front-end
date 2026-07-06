// Formats an ISO date (YYYY-MM-DD) or datetime string as MM/DD/YYYY.
//
// Date-only strings are parsed by hand instead of `new Date()` because the
// JS Date constructor treats "YYYY-MM-DD" as UTC midnight — converting that
// to local time rolls the calendar day back by one in any timezone west of
// UTC (all of the US). Full datetime strings (with time/zone) go through
// `new Date()` + local getters, which is the correct behavior for an actual
// timestamp shown to a local viewer.
export function formatDate(value) {
    if (!value) return "";

    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (dateOnly) {
        const [, year, month, day] = dateOnly;
        return `${month}/${day}/${year}`;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return "";

    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}/${day}/${d.getFullYear()}`;
}
