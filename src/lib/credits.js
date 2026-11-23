export const CREDITS_LABEL = "Credits";

/** "12.3%" from the API percent (may exceed 100; never clamped in text). */
export const formatPercent = (percent) => {
    const n = Number(percent);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
};

export const WARN_PERCENT = 80;

/** "ok" | "warning" (>= 80% of the pool) | "exhausted" (>= 100%: AI is blocked). Prefers the server's `status`. */
export const creditStatus = (credits) => {
    if (!credits) return "ok";
    if (credits.status === "ok" || credits.status === "warning" || credits.status === "exhausted") return credits.status;
    const percent = Number(credits.percent);
    if (!Number.isFinite(percent)) return "ok";
    if (percent >= 100) return "exhausted";
    return percent >= (Number(credits.warn_percent) || WARN_PERCENT) ? "warning" : "ok";
};

export const EXHAUSTED_TEXT = "AI credits exhausted. AI is paused until an administrator adds more credits.";
export const warningText = (percent) => `You have used ${Math.floor(Number(percent) || 0)}% of this month's AI credits.`;
