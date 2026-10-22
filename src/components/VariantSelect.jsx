import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { sellableVariants } from "../lib/variants";
import { formatCount, formatDecimal } from "@/lib/utils";

/**
 * Variant picker for a catalogue item. Renders nothing for items without
 * variants, so callers can drop it in unconditionally.
 * onChange(variantId, variant) — variant is the full object (carries effective_price).
 */
export const VariantSelect = ({ item, value, onChange, className = "h-8 w-full" }) => {
    const variants = sellableVariants(item);
    // A line saved earlier may point at a variant that has since been deactivated; keep it visible.
    const current = (item?.variants || []).find((v) => String(v.id) === String(value));
    const options = current && !current.is_active ? [...variants, current] : variants;
    if (options.length === 0) return null;

    const money = (v) => `${item.currency || 'USD'} ${formatDecimal(v.effective_price ?? item.base_price)}`;
    // Informational only: selling past zero is allowed, but the person should see it.
    const stockNote = (v) => (!v.stock ? "" : Number(v.stock.quantity_on_hand) <= 0 ? " · out of stock" : v.stock.low ? ` · ${formatCount(v.stock.quantity_on_hand)} left` : "");

    return (
        <Select value={value ? String(value) : ""} onValueChange={(id) => onChange(id, options.find((v) => String(v.id) === id))}>
            <SelectTrigger className={className}><SelectValue placeholder="Choose a variant" /></SelectTrigger>
            <SelectContent>
                {options.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} — {money(v)}{stockNote(v)}{v.is_active ? "" : " (inactive)"}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
