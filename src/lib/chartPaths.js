/** Smooth (Catmull-Rom → Bézier) path through [x, y] points. */
export const smoothPath = (points) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
    let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
};

/** Values → points scaled into a width × height box with `pad` px top and bottom. */
export const scalePoints = (values, { width, height, pad = 4, max }) => {
    const top = max ?? Math.max(...values, 1);
    const n = values.length;
    return values.map((value, i) => [
        n === 1 ? width / 2 : (i * width) / (n - 1),
        height - pad - (value / top) * (height - pad * 2),
    ]);
};

/** A "nice" ceiling for an axis: 1, 2, 4, 5, 10 × a power of ten. */
export const niceMax = (value) => {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 4, 5, 10].find((m) => value <= m * power) * power;
    return step;
};

export const compactMoney = (value, currency = "$") => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${currency}${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${currency}${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
    return `${currency}${Math.round(value).toLocaleString()}`;
};
