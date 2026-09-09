import { useEffect, useState } from "react";
import { DateInput } from "./date-input";
import { Input } from "./input";

// Splits an ISO datetime into the two things a person actually edits. The wire
// format stays a single ISO string ("2026-09-08T14:30"), so callers treat it
// exactly like DateInput's ISO date — same swap-in contract.
const split = (iso) => {
    if (!iso || typeof iso !== "string") return { date: "", time: "" };
    const [datePart, timePart = ""] = iso.split("T");
    return { date: datePart || "", time: timePart.slice(0, 5) };
};

const join = (date, time) => {
    if (!date) return "";
    return `${date}T${time || "00:00"}`;
};

export const DateTimeInput = ({ id, value, onChange, disabled, minuteStep = 15 }) => {
    const [{ date, time }, setParts] = useState(() => split(value));

    useEffect(() => { setParts(split(value)); }, [value]);

    const update = (nextDate, nextTime) => {
        setParts({ date: nextDate, time: nextTime });
        // A time on its own has no meaning without a date; emit only once the
        // date exists, and default the time rather than emitting a half value.
        onChange?.(nextDate ? join(nextDate, nextTime) : "");
    };

    return (
        <div className="flex gap-2">
            <div className="flex-1 min-w-0">
                <DateInput
                    id={id}
                    value={date}
                    disabled={disabled}
                    onChange={(e) => update(e.target.value, time)}
                />
            </div>
            <Input
                type="time"
                aria-label="Time"
                className="w-32 shrink-0"
                step={minuteStep * 60}
                value={time}
                disabled={disabled}
                onChange={(e) => update(date, e.target.value)}
            />
        </div>
    );
};
