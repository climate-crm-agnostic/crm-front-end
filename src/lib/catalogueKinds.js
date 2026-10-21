// What is being sold, as the user thinks of it. The catalogue stores three
// types (product / service / subscription); a subscription is a recurring
// service, so it is grouped under "Service" rather than hidden or given a
// third choice.
export const KIND_OPTIONS = [
    { value: "product", label: "Product" },
    { value: "service", label: "Service" },
];

export const itemKind = (item) => (item?.type === "product" ? "product" : "service");

export const itemsOfKind = (items, kind) => (items || []).filter((item) => itemKind(item) === kind);

// Label shown in the item dropdown; only subscriptions need their type spelled out.
export const itemLabel = (item) => (item.type === "subscription" ? `${item.name} (subscription)` : item.name);
