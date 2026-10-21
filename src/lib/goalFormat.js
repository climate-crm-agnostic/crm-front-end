export const formatGoalValue = (value, unit) => {
    if (value === null || value === undefined || value === "") return "—";
    const n = Number(value);
    if (Number.isNaN(n)) return "—";
    return unit === 'currency'
        ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
