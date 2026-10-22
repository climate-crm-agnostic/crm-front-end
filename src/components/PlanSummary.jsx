import { BadgeCheck, Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader } from "@/components/SectionCard";
import { formatCount } from "@/lib/utils";

const FEATURE_LABELS = {
    ai: "Chett AI", webhooks: "Webhooks", inventory: "Inventory", assets: "Asset tracking",
    audit_trail: "Audit trail", stripe: "Stripe integration", max_users: "Users", max_pipelines: "Pipelines",
};
const titleCase = (key) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const labelFor = (key) => FEATURE_LABELS[key] ?? titleCase(key);

const DAY = 86400000;

const Stat = ({ label, children }) => (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="mt-0.5 font-heading text-lg font-semibold tabular-nums">{children}</div>
    </div>
);

/** The plan this instance runs on: tier and status, dates with time left, and what it includes. Read-only. */
export function PlanSummary() {
    const { plan } = useAuth();
    if (!plan) return null;

    const entries = Object.entries(plan.features || {});
    const included = entries.filter(([, v]) => v === true);
    const limits = entries.filter(([, v]) => typeof v === "number" && v > 0);
    const missing = entries.filter(([, v]) => v === false || v === 0);

    const status = plan.is_suspended ? "Suspended" : plan.is_active ? "Active" : "Expired";
    const ok = status === "Active";
    const start = plan.start_date ? new Date(plan.start_date) : null;
    const end = plan.end_date ? new Date(plan.end_date) : null;
    const daysLeft = end ? Math.max(0, Math.ceil((end - new Date()) / DAY)) : null;
    const elapsed = start && end && end > start ? Math.min(100, Math.max(0, ((new Date() - start) / (end - start)) * 100)) : null;

    return (
        <Card>
            <CardHeader icon={BadgeCheck} title="Plan" subtitle="What this workspace includes" />
            <div className="space-y-5 px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="font-heading text-2xl font-bold">{plan.tier_display ?? "—"}</span>
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                        style={ok
                            ? { background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" }
                            : { background: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
                    >
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{status}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Stat label="Started">{plan.start_date ?? "—"}</Stat>
                    <Stat label="Valid until">
                        {plan.end_date ?? "No expiry"}
                        {daysLeft !== null && <span className="ml-2 text-sm font-normal text-muted-foreground">{formatCount(daysLeft)} days left</span>}
                    </Stat>
                </div>
                {elapsed !== null && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-border" role="img" aria-label={`${Math.round(elapsed)}% of the plan period has passed`}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${elapsed}%` }} />
                    </div>
                )}

                {(included.length > 0 || limits.length > 0) && (
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Included</p>
                        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {included.map(([key]) => (
                                <li key={key} className="flex items-center gap-2 text-sm">
                                    <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }}>
                                        <Check className="size-3" style={{ color: "var(--secondary-text)" }} aria-hidden="true" />
                                    </span>
                                    {labelFor(key)}
                                </li>
                            ))}
                            {limits.map(([key, value]) => (
                                <li key={key} className="flex items-center gap-2 text-sm">
                                    <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }}>
                                        <Check className="size-3" style={{ color: "var(--secondary-text)" }} aria-hidden="true" />
                                    </span>
                                    {labelFor(key)} <span className="font-semibold tabular-nums">up to {formatCount(value)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {missing.length > 0 && (
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Not in this plan</p>
                        <ul className="flex flex-wrap gap-2">
                            {missing.map(([key]) => (
                                <li key={key} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                                    <X className="size-3" aria-hidden="true" />{labelFor(key)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Card>
    );
}
