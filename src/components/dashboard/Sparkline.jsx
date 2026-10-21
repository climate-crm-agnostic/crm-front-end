import { scalePoints, smoothPath } from "@/lib/chartPaths";

export const Sparkline = ({ values = [], className = "h-8 w-24" }) => {
    if (values.length < 2 || values.every((v) => v === 0)) {
        return <svg viewBox="0 0 96 32" className={className} aria-hidden="true"><path d="M0,28 L96,28" fill="none" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" /></svg>;
    }
    const min = Math.min(...values);
    const shifted = values.map((v) => v - min);
    const points = scalePoints(shifted, { width: 96, height: 32, pad: 4, max: Math.max(...shifted, 1) });
    return (
        <svg viewBox="0 0 96 32" className={`${className} overflow-visible`} aria-hidden="true">
            <path d={smoothPath(points)} fill="none" stroke="var(--primary-text)" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};
