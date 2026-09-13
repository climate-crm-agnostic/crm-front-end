import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMyAIUsage } from "@/services/aiService";
import { User, Building2, Bot, CheckCircle2, XCircle, Infinity } from "lucide-react";
import { Card, CardHeader } from "@/components/SectionCard";

const TIER_COLORS = {
    free_trial: { bg: "var(--card)", text: "var(--muted-foreground)", border: "var(--border)" },
    basic:      { bg: "var(--card)", text: "var(--muted-foreground)", border: "var(--border)" },
    full:       { bg: "var(--muted)", text: "var(--secondary)", border: "var(--primary)" },
    full_plus:  { bg: "var(--muted)", text: "var(--secondary)", border: "var(--secondary)" },
    business:   { bg: "var(--muted)", text: "#c04a00", border: "var(--primary)" },
    enterprise: { bg: "var(--muted)", text: "var(--muted-foreground)", border: "var(--secondary)" },
};

const FEATURE_LABELS = {
    ai:            "Chett AI",
    webhooks:      "Webhooks",
    inventory:     "Inventory",
    assets:        "Asset Tracking",
    audit_trail:   "Audit Trail",
    stripe:        "Stripe Integration",
    max_users:     "Max Users",
    max_pipelines: "Max Pipelines",
};

function QuotaBar({ used, limit }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barColor = pct >= 90 ? "#c04a00" : pct >= 70 ? "var(--primary)" : "var(--secondary)";

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold" style={{ color: "var(--foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    {used}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ {limit} today</span>
                </span>
                <span className="text-xs font-medium" style={{ color: barColor }}>
                    {pct.toFixed(0)}% used
                </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--border)" }}>
                <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Resets daily at midnight UTC
            </p>
        </div>
    );
}

export const MyInfo = () => {
    const { user, plan, isFeatureEnabled } = useAuth();
    const [aiUsage, setAiUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(true);

    useEffect(() => {
        if (!isFeatureEnabled("ai")) {
            setUsageLoading(false);
            return;
        }
        getMyAIUsage()
            .then(setAiUsage)
            .catch(() => setAiUsage(null))
            .finally(() => setUsageLoading(false));
    }, []);

    const tierKey = plan?.tier ?? "free_trial";
    const tierColors = TIER_COLORS[tierKey] ?? TIER_COLORS.free_trial;
    const initials = (user?.username ?? "?").slice(0, 2).toUpperCase();

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-4">

            {/* ── User Info ── */}
            <Card>
                <CardHeader icon={User} title="My Account" />
                <div className="px-6 py-5 flex items-center gap-5">
                    <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                        style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                        {initials}
                    </div>
                    <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-base truncate" style={{ color: "var(--foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                            {user?.username}
                        </p>
                        <p className="text-sm truncate" style={{ color: "var(--muted-foreground)" }}>
                            {user?.email || <span className="italic text-muted-foreground">No email on file</span>}
                        </p>
                        {user?.groups?.length > 0 && (
                            <div className="flex gap-2 flex-wrap pt-0.5">
                                {user.groups.map(g => (
                                    <span
                                        key={g}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: "var(--muted)", color: "var(--secondary)", border: "1px solid var(--primary)" }}
                                    >
                                        <Building2 className="h-3 w-3" />
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── Plan / Tier ── */}
            <Card>
                <CardHeader icon={Building2} title="Current Plan" accentColor="var(--primary)" />
                <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <span
                            className="px-3 py-1 rounded-full text-sm font-semibold tracking-wide"
                            style={{ backgroundColor: tierColors.bg, color: tierColors.text, border: `1px solid ${tierColors.border}` }}
                        >
                            {plan?.tier_display ?? "—"}
                        </span>
                        {plan && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                    backgroundColor: plan.is_active ? "var(--muted)" : "var(--muted)",
                                    color: plan.is_active ? "var(--secondary)" : "#c04a00",
                                    border: `1px solid ${plan.is_active ? "var(--primary)" : "var(--primary)"}`,
                                }}
                            >
                                {plan.is_active ? "Active" : "Inactive"}
                            </span>
                        )}
                    </div>

                    {plan && (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                            <div>
                                <span style={{ color: "var(--muted-foreground)" }}>Start date</span>
                                <p className="font-medium" style={{ color: "var(--foreground)" }}>{plan.start_date ?? "—"}</p>
                            </div>
                            <div>
                                <span style={{ color: "var(--muted-foreground)" }}>End date</span>
                                <p className="font-medium" style={{ color: "var(--foreground)" }}>{plan.end_date ?? "No expiry"}</p>
                            </div>
                        </div>
                    )}

                    {plan?.features && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted-foreground)" }}>Features</p>
                            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                                    const val = plan.features[key];
                                    const enabled = val !== false && val !== 0 && val !== undefined;
                                    const isLimit = typeof val === "number" && val > 0;
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            {enabled
                                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--secondary)" }} />
                                                : <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--border)" }} />
                                            }
                                            <span className="text-xs" style={{ color: enabled ? "var(--foreground)" : "var(--muted-foreground)" }}>
                                                {label}
                                                {isLimit ? ` (${val === true ? "∞" : val})` : ""}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* ── AI Usage ── */}
            {isFeatureEnabled("ai") && (
                <Card>
                    <CardHeader icon={Bot} title="Chett AI — Daily Quota" accentColor="var(--primary)" />
                    <div className="px-6 py-5">
                        {usageLoading ? (
                            <div className="h-12 animate-pulse rounded" style={{ backgroundColor: "var(--border)" }} />
                        ) : !aiUsage ? (
                            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Usage data unavailable.</p>
                        ) : aiUsage.unlimited ? (
                            <div className="flex items-center gap-3">
                                <Infinity className="h-6 w-6" style={{ color: "var(--secondary)" }} />
                                <div>
                                    <p className="font-semibold" style={{ color: "var(--foreground)" }}>Unlimited queries</p>
                                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                                        {aiUsage.question_count} sent today
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <QuotaBar used={aiUsage.question_count} limit={aiUsage.daily_limit} />
                        )}
                        {aiUsage && !aiUsage.unlimited && aiUsage.ai_tier && (
                            <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>
                                Tier: <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>{aiUsage.ai_tier}</span>
                            </p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};
