export const CREDITS_LABEL = "Credits";

/** "12.3%" from the API percent (may exceed 100; never clamped in text). */
export const formatPercent = (percent) => {
    const n = Number(percent);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
};
