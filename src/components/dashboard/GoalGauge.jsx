import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { formatCount, formatMoney } from "@/lib/utils";

const N = 52;
const CX = 130;
const CY = 122;
const R1 = 84;
const R2 = 108;

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";

const formatValue = (value, unit) => {
    if (value === null || value === undefined) return "—";
    const n = Number(value);
    return unit === "currency" ? formatMoney(n) : formatCount(n);
};

/** Semicircle of ticks for the team's progress on one indicator, with the members ranked below. */
export const GoalGauge = ({ goal, loading, canManage }) => {
    const ticks = Array.from({ length: N }, (_, i) => {
        const f = i / (N - 1);
        const a = Math.PI + f * Math.PI;
        return { x1: CX + R1 * Math.cos(a), y1: CY + R1 * Math.sin(a), x2: CX + R2 * Math.cos(a), y2: CY + R2 * Math.sin(a), f };
    });
    const pct = goal?.team_goal?.progress_pct;
    const progress = Math.min(Math.max((pct ?? 0) / 100, 0), 1);
    const unit = goal?.indicator?.unit;

    return (
        <section className="min-w-0 rounded-xl border bg-card p-5 shadow-sm" aria-labelledby="goal-title">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 id="goal-title" className="font-heading text-lg font-bold">Team goal</h2>
                    <p className="text-[13px] text-muted-foreground">{goal ? `${goal.indicator.name} · ${goal.periodName}` : "Goals for this period"}</p>
                </div>
                <Link to="/goal" aria-label="Open goals" className="grid h-9 w-9 place-items-center rounded-full bg-muted outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-ring"><ArrowUpRight className="size-4" /></Link>
            </div>

            {loading ? (
                <div className="mt-4 h-48 animate-pulse rounded-lg bg-muted" />
            ) : !goal ? (
                <div className="mt-4 grid min-h-48 place-items-center rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                    <p>No goals set for the current period.{canManage && <> <Link to="/goal" className="font-semibold underline" style={{ color: "var(--secondary-text)" }}>Set one</Link>.</>}</p>
                </div>
            ) : (
                <>
                    <div className="relative mb-2 mt-1 grid place-items-center">
                        <svg viewBox="0 0 260 132" className="h-auto w-full max-w-[300px]" aria-hidden="true">
                            {ticks.map((t, i) => (
                                <line key={i} x1={t.x1.toFixed(1)} y1={t.y1.toFixed(1)} x2={t.x2.toFixed(1)} y2={t.y2.toFixed(1)}
                                    stroke={t.f <= progress ? "var(--primary-text)" : "var(--border)"} strokeWidth="3.4" strokeLinecap="round" />
                            ))}
                        </svg>
                        <div className="absolute bottom-1.5 text-center">
                            <b className="block font-heading text-[34px] leading-none tabular-nums">{pct === null || pct === undefined ? "—" : `${Math.round(pct)}%`}</b>
                            <span className="text-[13px] text-muted-foreground">{formatValue(goal.team_goal?.actual_value, unit)} of {formatValue(goal.team_goal?.target_value, unit)}</span>
                        </div>
                    </div>
                    <ul className="mt-2 flex flex-col gap-3">
                        {goal.members.slice(0, 4).map((member) => (
                            <li key={member.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3">
                                <span className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" }}>{initials(member.user?.name)}</span>
                                <div className="min-w-0">
                                    <b className="block truncate text-sm font-semibold">{member.user?.name}</b>
                                    <div className="mt-1.5 h-2 overflow-hidden rounded bg-muted" role="img" aria-label={`${member.user?.name}: ${Math.round(member.progress_pct ?? 0)}%`}>
                                        <i className="block h-full rounded" style={{ width: `${Math.min(member.progress_pct ?? 0, 100)}%`, background: "var(--primary-text)" }} />
                                    </div>
                                </div>
                                <span className="text-sm font-bold tabular-nums">{formatValue(member.actual_value, unit)}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
};
