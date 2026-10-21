import { useMemo, useState } from "react";
import { Image as ImageIcon, Repeat, Search } from "lucide-react";
import { formatDecimal } from "@/lib/utils";

const FILTERS = [
    { value: "all", label: "All" },
    { value: "product", label: "Products" },
    { value: "service", label: "Services" },
    { value: "subscription", label: "Subscriptions" },
];

const money = (value, currency = "USD") => `${currency} ${formatDecimal(value)}`;

const priceLabel = (item) =>
    item.has_variants && item.min_price !== item.max_price
        ? `${money(item.min_price, item.currency)} – ${formatDecimal(item.max_price)}`
        : money(item.base_price, item.currency);

const TypeTag = ({ item }) => {
    const recurring = item.billing_type === "recurring";
    return (
        <span
            className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur"
            style={recurring
                ? { background: "color-mix(in srgb, var(--primary) 22%, var(--card))", color: "var(--secondary-text)" }
                : { background: "color-mix(in srgb, var(--card) 88%, transparent)", color: "var(--muted-foreground)" }}
        >
            {recurring && <Repeat className="size-3" aria-hidden="true" />}
            <span className="capitalize">{recurring ? "Recurring" : item.type}</span>
        </span>
    );
};

const VariantStrip = ({ variants }) => {
    const active = variants.filter((v) => v.is_active);
    if (active.length === 0) return <span className="text-xs text-muted-foreground">Single item</span>;
    return (
        <span className="flex items-center gap-1.5">
            <span className="flex -space-x-1.5" aria-hidden="true">
                {active.slice(0, 4).map((variant) => (
                    <span key={variant.id} className="grid size-5 place-items-center overflow-hidden rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground">
                        {variant.list_of_images?.[0]
                            ? <img src={variant.list_of_images[0]} alt="" className="size-full object-cover" />
                            : variant.name.slice(0, 1).toUpperCase()}
                    </span>
                ))}
            </span>
            <span className="text-xs text-muted-foreground">{active.length} variant{active.length === 1 ? "" : "s"}</span>
        </span>
    );
};

/** Product-style cards for the catalogue: photo, type, price (or range) and variants. */
export const CatalogueGallery = ({ items, onOpen }) => {
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return items.filter((item) =>
            (filter === "all" || item.type === filter) &&
            (!needle || item.name?.toLowerCase().includes(needle) || item.sku?.toLowerCase().includes(needle)));
    }, [items, filter, query]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-full bg-muted px-4 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
                    <Search className="size-4" aria-hidden="true" />
                    <input
                        type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the catalogue" aria-label="Search the catalogue"
                        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
                    {FILTERS.map((option) => (
                        <button
                            key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}
                            className={`h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold transition-colors ${filter === option.value ? "bg-[var(--nav-active)] text-[var(--nav-active-fg)]" : "border hover:bg-muted"}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {visible.length === 0 ? (
                <p className="rounded-xl bg-muted/50 p-10 text-center text-sm text-muted-foreground">Nothing matches.</p>
            ) : (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))]">
                    {visible.map((item) => (
                        <button
                            key={item.id} type="button" onClick={() => onOpen(item)}
                            aria-label={`${item.name}, ${item.type}, ${priceLabel(item)}`}
                            className={`flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-2.5 pb-4 text-left shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring ${item.is_active === false ? "opacity-60" : ""}`}
                        >
                            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                                {item.list_of_images?.[0]
                                    ? <img src={item.list_of_images[0]} alt="" className="size-full object-cover" loading="lazy" />
                                    : <span className="flex flex-col items-center gap-1 text-xs font-semibold"><ImageIcon className="size-5 opacity-60" aria-hidden="true" />No photo</span>}
                                <TypeTag item={item} />
                            </div>
                            <div className="flex flex-col gap-1.5 px-2">
                                <span className="font-heading text-[15px] font-bold leading-tight">{item.name}</span>
                                <span className="font-semibold tabular-nums">{priceLabel(item)}{item.billing_type === "recurring" && <span className="font-normal text-muted-foreground"> / {item.billing_cycle === "yearly" ? "year" : item.billing_cycle === "quarterly" ? "quarter" : "month"}</span>}</span>
                                <VariantStrip variants={item.variants || []} />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
