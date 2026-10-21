/** Active variants a catalogue item can be sold as (empty if it has none). */
export const sellableVariants = (item) => (item?.variants || []).filter((v) => v.is_active);
