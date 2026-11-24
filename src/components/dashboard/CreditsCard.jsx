import { useState } from "react";
import { CreditsBar } from "@/components/CreditsBar";
import { Button } from "@/components/ui/button";
import { TopUpDialog } from "@/components/topups/TopUpDialog";
import { CREDITS_LABEL, formatPercent } from "@/lib/credits";
import { formatCount, formatDecimal } from "@/lib/utils";

const Stat = ({ label, value }) => (
    <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-bold" data-testid={`credits-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
    </div>
);

/** Dashboard section: monthly AI credit pool, credits consumed and percentage consumed. */
export const CreditsCard = ({ credits, loading, onChanged }) => {
    const [buying, setBuying] = useState(false);
    if (!loading && (!credits || credits.enabled === false || !(Number(credits.pool) > 0))) return null;
    return (
        <section className="min-w-0 rounded-xl border bg-card p-5 shadow-sm" aria-labelledby="credits-title">
            <TopUpDialog open={buying} onOpenChange={setBuying} kind="ai_credits" onDone={onChanged} />
            <div className="flex items-start justify-between gap-3">
                <h2 id="credits-title" className="font-heading text-lg font-bold">{CREDITS_LABEL}</h2>
                <Button size="sm" variant="outline" onClick={() => setBuying(true)}>Buy credits</Button>
            </div>
            {credits?.period?.label && <p className="text-[13px] text-muted-foreground">{credits.period.label}</p>}
            {loading || !credits ? (
                <div className="mt-4 h-20 animate-pulse rounded-lg bg-muted" />
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <Stat label="Pool" value={formatCount(credits.pool)} />
                        <Stat label="Credits consumed" value={formatDecimal(credits.used)} />
                        <Stat label="Consumed" value={formatPercent(credits.percent)} />
                    </div>
                    <CreditsBar credits={credits} className="mt-4 max-w-none" />
                </>
            )}
        </section>
    );
};
