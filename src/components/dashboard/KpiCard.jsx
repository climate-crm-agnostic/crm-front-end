import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "./Sparkline";

const chipStyle = { background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" };

export const DeltaChip = ({ change }) => {
    if (change === null || change === undefined) {
        return <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[13px] font-semibold text-muted-foreground">New</span>;
    }
    const up = change >= 0;
    const Arrow = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold"
            style={up ? chipStyle : { background: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
        >
            <Arrow className="size-3.5" aria-hidden="true" />{Math.abs(change)}%
        </span>
    );
};

/** One indicator: icon, big number, change against the previous period and a 12-week sparkline. */
export const KpiCard = ({ label, icon, value, change, series, caption, loading }) => {
    const Icon = icon;
    return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">{label}</span>
            <span className="grid h-9 w-9 place-items-center rounded-full" style={chipStyle}><Icon className="size-[18px]" aria-hidden="true" /></span>
        </div>
        {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        ) : (
            <div className="font-heading text-[32px] font-bold leading-none tabular-nums">{value}</div>
        )}
        <div className="flex items-center justify-between gap-2">
            {loading ? <div className="h-6 w-16 animate-pulse rounded-full bg-muted" /> : <DeltaChip change={change} />}
            {!loading && <Sparkline values={series} />}
        </div>
        <p className="text-[12.5px] text-muted-foreground">{caption}</p>
    </article>
    );
};
