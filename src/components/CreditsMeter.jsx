import { BarChart3 } from "lucide-react";
import { formatCount, formatDecimal } from "@/lib/utils";
import { useAICredits } from "@/hooks/useAICredits";

export const CREDITS_METER_LABEL = "AI credits used this month";

/** Discreet one-line "used / pool" (icon + numbers) shown under the input of every AI feature. Display only. */
export const CreditsMeter = ({ className = "", style }) => {
    const { credits } = useAICredits();
    if (!credits || credits.enabled === false || !(Number(credits.pool) > 0)) return null;
    const used = Number(credits.used) || 0;
    const pool = Number(credits.pool);
    return (
        <div
            data-testid="credits-meter"
            role="status"
            aria-label={CREDITS_METER_LABEL}
            title={CREDITS_METER_LABEL}
            className={`flex items-center gap-1 text-[11px] leading-4 text-muted-foreground ${className}`}
            style={style}
        >
            <BarChart3 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{`${formatDecimal(used)} / ${formatCount(pool)}`}</span>
        </div>
    );
};
