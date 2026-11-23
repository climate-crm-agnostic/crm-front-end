import { Progress } from "@/components/ui/progress";
import { formatCount, formatDecimal } from "@/lib/utils";
import { CREDITS_LABEL, EXHAUSTED_TEXT, creditStatus, formatPercent, warningText } from "@/lib/credits";

const BAR_COLOR = {
    ok: "",
    warning: "[&_[data-slot=progress-indicator]]:bg-amber-500",
    exhausted: "[&_[data-slot=progress-indicator]]:bg-destructive",
};

/** Context-bar style meter of AI credits used vs the monthly pool. Measure and display only. */
export const CreditsBar = ({ credits, className = "" }) => {
    if (!credits || credits.enabled === false || !(Number(credits.pool) > 0)) return null;
    const percent = Number(credits.percent);
    const visual = Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 0;
    const text = `${formatDecimal(credits.used)} / ${formatCount(credits.pool)}`;
    const status = creditStatus(credits);
    return (
        <div
            data-testid="credits-bar"
            className={`flex min-w-[180px] max-w-[280px] flex-1 flex-col gap-1 ${className}`}
            title={credits.period?.label ? `${CREDITS_LABEL} · ${credits.period.label}` : CREDITS_LABEL}
        >
            <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span>{CREDITS_LABEL}: {text}</span>
                <span className="font-semibold text-foreground">{formatPercent(percent)}</span>
            </div>
            <Progress
                value={visual}
                aria-label={`${CREDITS_LABEL} used`}
                aria-valuetext={`${text}, ${formatPercent(percent)}`}
                className={`h-1.5 ${BAR_COLOR[status]}`}
            />
            {status !== "ok" && (
                <p
                    data-testid="credits-alert"
                    role={status === "exhausted" ? "alert" : "status"}
                    className={`text-[11px] leading-4 ${status === "exhausted" ? "font-semibold text-destructive" : "text-amber-600"}`}
                >
                    {status === "exhausted" ? EXHAUSTED_TEXT : warningText(percent)}
                </p>
            )}
        </div>
    );
};
