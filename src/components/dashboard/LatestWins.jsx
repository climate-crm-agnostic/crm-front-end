import { Link } from "react-router-dom";

import { formatMoney as money } from "@/lib/utils";

const Tag = ({ win }) => {
    if (win.recurring) {
        return <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" }}>Recurring</span>;
    }
    return <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground capitalize">{win.kind || "—"}</span>;
};

/** The last deals won. Each lead sells products or services, never both, so one tag is enough. */
export const LatestWins = ({ wins, loading }) => (
    <section className="min-w-0 rounded-xl border bg-card p-5 shadow-sm" aria-labelledby="wins-title">
        <div className="mb-3 flex items-start justify-between gap-3">
            <div>
                <h2 id="wins-title" className="font-heading text-lg font-bold">Latest wins</h2>
                <p className="text-[13px] text-muted-foreground">Most recent closed deals</p>
            </div>
            <Link to="/lead" className="inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">View all</Link>
        </div>
        {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : wins.length === 0 ? (
            <p className="rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">No deals closed yet. Moving a lead to Won will show it here.</p>
        ) : (
            <ul>
                {wins.map((win) => (
                    <li key={win.id}>
                        <Link to={`/lead/${win.id}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3.5 border-t py-3 first:border-t-0 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
                            <div className="min-w-0">
                                <b className="block truncate font-semibold">{win.what}</b>
                                <span className="block truncate text-[13px] text-muted-foreground">{win.client}</span>
                            </div>
                            <Tag win={win} />
                            <span className="font-bold tabular-nums">{money(win.amount)}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        )}
    </section>
);
