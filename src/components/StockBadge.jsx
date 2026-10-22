import { formatCount } from "@/lib/utils";

/** Stock of one variant: how many are on hand, flagged when at or under the reorder level. */
export const StockBadge = ({ stock }) => {
    if (!stock) return <span className="text-xs text-muted-foreground">Stock not tracked</span>;
    const onHand = Number(stock.quantity_on_hand);
    const out = onHand <= 0;
    const tone = out ? "bg-red-50 text-red-600 dark:bg-red-500/15" : stock.low ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15" : "bg-muted text-[var(--secondary-text)]";
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`} title={`Reorder at ${formatCount(stock.reorder_level)}`}>
            {out ? "Out of stock" : stock.low ? `Low: ${formatCount(onHand)} left` : `${formatCount(onHand)} in stock`}
        </span>
    );
};
