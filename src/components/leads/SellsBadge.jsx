// What a lead sells: its items are all products, all services, or (a lead that predates the one-kind rule) both.
const LABELS = {
    product: { text: "Products", tone: "bg-muted text-[var(--secondary-text)]" },
    service: { text: "Services", tone: "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--secondary-text)]" },
    mixed: { text: "Mixed", tone: "bg-red-50 text-red-600 dark:bg-red-500/15" },
};

export const SellsBadge = ({ sells, className = "" }) => {
    const label = LABELS[sells];
    if (!label) return <span className="text-muted-foreground">—</span>;
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${label.tone} ${className}`}
            title={sells === "mixed" ? "Sells products and services; split it into two leads" : undefined}
        >
            {label.text}
        </span>
    );
};
