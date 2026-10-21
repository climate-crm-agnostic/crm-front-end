import { useMemo, useState } from "react";
import { compactMoney, niceMax, scalePoints, smoothPath } from "@/lib/chartPaths";

const W = 720;
const H = 220;
const PAD = 14;

const Segmented = ({ options, value, onChange, label }) => (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-full bg-muted p-[3px]">
        {options.map((option) => (
            <button
                key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}
                className={`h-[30px] cursor-pointer rounded-full px-3.5 text-[13px] font-semibold transition-colors ${value === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
                {option.label}
            </button>
        ))}
    </div>
);

const Chip = ({ active, children, onClick }) => (
    <button
        type="button" aria-pressed={active} onClick={onClick}
        className={`h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold transition-colors ${active ? "bg-[var(--nav-active)] text-[var(--nav-active-fg)]" : "border text-foreground hover:bg-muted"}`}
    >
        {children}
    </button>
);

const PERIODS = [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }];
const KINDS = [{ value: "all", label: "All" }, { value: "product", label: "Products" }, { value: "service", label: "Services" }];
const CAPTIONS = { day: "last 30 days, by day", week: "last 12 weeks", month: "last 12 months" };

/** Revenue of won deals against the previous window, with a hover tooltip. */
export const RevenueChart = ({ series, loading, granularity, kind, onGranularity, onKind }) => {
    const [hover, setHover] = useState(null);
    const points = useMemo(() => series?.points ?? [], [series]);

    const geometry = useMemo(() => {
        if (points.length < 2) return null;
        const max = niceMax(Math.max(...points.map((p) => Math.max(p.current, p.previous))));
        const current = scalePoints(points.map((p) => p.current), { width: W, height: H, pad: PAD, max });
        const previous = scalePoints(points.map((p) => p.previous), { width: W, height: H, pad: PAD, max });
        const line = smoothPath(current);
        return { max, current, line, area: `${line} L${W},${H} L0,${H} Z`, previous: smoothPath(previous) };
    }, [points]);

    const empty = !loading && (!geometry || (series.total_current === 0 && series.total_previous === 0));
    const activePoint = geometry && hover !== null ? { point: points[hover], xy: geometry.current[hover] } : null;

    const onMove = (event) => {
        if (!geometry) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        setHover(Math.round(ratio * (points.length - 1)));
    };

    return (
        <section className="min-w-0 rounded-xl border bg-card p-5 shadow-sm" aria-labelledby="revenue-title">
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="revenue-title" className="font-heading text-lg font-bold">Revenue</h2>
                    <p className="text-[13px] text-muted-foreground">Won deals, {CAPTIONS[granularity]}</p>
                </div>
                <Segmented options={PERIODS} value={granularity} onChange={onGranularity} label="Period" />
            </div>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Sold as">
                {KINDS.map((option) => (
                    <Chip key={option.value} active={kind === option.value} onClick={() => onKind(option.value)}>{option.label}</Chip>
                ))}
            </div>
            <div className="mb-1.5 flex gap-4 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-[18px] rounded-full" style={{ background: "var(--primary-text)" }} />This period</span>
                <span className="flex items-center gap-1.5"><i className="inline-block w-[18px] border-t-2 border-dashed" style={{ borderColor: "var(--muted-foreground)" }} />Previous</span>
            </div>

            {loading ? (
                <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
            ) : empty ? (
                <div className="grid h-[220px] place-items-center rounded-lg bg-muted/50 text-sm text-muted-foreground">No won deals in this window yet.</div>
            ) : (
                <>
                    <div className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[220px] w-full" role="img" aria-label="Revenue over time against the previous period">
                            <defs>
                                <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" style={{ stopColor: "var(--primary-text)", stopOpacity: 0.28 }} />
                                    <stop offset="1" style={{ stopColor: "var(--primary-text)", stopOpacity: 0 }} />
                                </linearGradient>
                            </defs>
                            {[0, 1, 2].map((i) => {
                                const y = PAD + (i * (H - PAD * 2)) / 2;
                                return <line key={i} x1="0" x2={W} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />;
                            })}
                            <path d={geometry.area} fill="url(#revArea)" />
                            <path d={geometry.previous} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.7" strokeWidth="1.8" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                            <path d={geometry.line} fill="none" stroke="var(--primary-text)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex h-[220px] flex-col justify-between text-xs text-muted-foreground" aria-hidden="true">
                            {[geometry.max, geometry.max / 2, 0].map((v) => <span key={v}>{compactMoney(v)}</span>)}
                        </div>
                        {activePoint && (
                            <>
                                <span className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card" style={{ left: `${(activePoint.xy[0] / W) * 100}%`, top: activePoint.xy[1], boxShadow: "0 0 0 3px var(--primary-text)" }} />
                                <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-[125%] whitespace-nowrap rounded-xl border bg-card px-3 py-2 text-[12.5px] shadow-lg" style={{ left: `${(activePoint.xy[0] / W) * 100}%`, top: activePoint.xy[1] }}>
                                    <span className="text-muted-foreground">{activePoint.point.label}</span>
                                    <b className="block font-heading text-[15px] tabular-nums">{compactMoney(activePoint.point.current)}</b>
                                    <span className="text-muted-foreground">before: {compactMoney(activePoint.point.previous)}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
                        {[0, 0.25, 0.5, 0.75, 1].map((f) => <span key={f}>{points[Math.round(f * (points.length - 1))]?.label}</span>)}
                    </div>
                </>
            )}
        </section>
    );
};
