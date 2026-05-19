import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMyAIUsage } from "@/services/aiService";
import { User, Building2, Bot, CheckCircle2, XCircle, Infinity } from "lucide-react";

const TIER_COLORS = {
    free_trial: { bg: "#F2EBDD", text: "#6b6560", border: "#D8D2C4" },
    basic:      { bg: "#F2EBDD", text: "#6b6560", border: "#D8D2C4" },
    full:       { bg: "#e8edde", text: "#5E6A43", border: "#B8C76A" },
    full_plus:  { bg: "#e8edde", text: "#5E6A43", border: "#5E6A43" },
    business:   { bg: "#FFDCC8", text: "#c04a00", border: "#F29B6B" },
    enterprise: { bg: "#f0f4dc", text: "#3a4a20", border: "#5E6A43" },
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

function Card({ children, style }) {
    return (
        <div
            style={{
                backgroundColor: "#F2EBDD",
                border: "1px solid #D8D2C4",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(46,42,38,0.06)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, title, accentColor = "#5E6A43" }) {
    return (
        <div
            className="flex items-center gap-3 px-6 py-4 border-b"
            style={{ borderColor: "#D8D2C4" }}
        >
            <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: accentColor }}
            >
                <Icon className="h-4 w-4 text-white" />
            </div>
            <h2
                className="text-sm font-semibold"
                style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
            >
                {title}
            </h2>
        </div>
    );
}

function QuotaBar({ used, limit }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barColor = pct >= 90 ? "#c04a00" : pct >= 70 ? "#F29B6B" : "#5E6A43";

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    {used}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ {limit} today</span>
                </span>
                <span className="text-xs font-medium" style={{ color: barColor }}>
                    {pct.toFixed(0)}% used
                </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#D8D2C4" }}>
                <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
            <p className="text-xs" style={{ color: "#9b948e" }}>
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
                        style={{ backgroundColor: "#5E6A43", color: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                        {initials}
                    </div>
                    <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-base truncate" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                            {user?.username}
                        </p>
                        <p className="text-sm truncate" style={{ color: "#6b6560" }}>
                            {user?.email || <span className="italic text-muted-foreground">No email on file</span>}
                        </p>
                        {user?.groups?.length > 0 && (
                            <div className="flex gap-2 flex-wrap pt-0.5">
                                {user.groups.map(g => (
                                    <span
                                        key={g}
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: "#e8edde", color: "#5E6A43", border: "1px solid #B8C76A" }}
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
                <CardHeader icon={Building2} title="Current Plan" accentColor="#B8C76A" />
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
                                    backgroundColor: plan.is_active ? "#e8edde" : "#FFDCC8",
                                    color: plan.is_active ? "#5E6A43" : "#c04a00",
                                    border: `1px solid ${plan.is_active ? "#B8C76A" : "#F29B6B"}`,
                                }}
                            >
                                {plan.is_active ? "Active" : "Inactive"}
                            </span>
                        )}
                    </div>

                    {plan && (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                            <div>
                                <span style={{ color: "#9b948e" }}>Start date</span>
                                <p className="font-medium" style={{ color: "#2E2A26" }}>{plan.start_date ?? "—"}</p>
                            </div>
                            <div>
                                <span style={{ color: "#9b948e" }}>End date</span>
                                <p className="font-medium" style={{ color: "#2E2A26" }}>{plan.end_date ?? "No expiry"}</p>
                            </div>
                        </div>
                    )}

                    {plan?.features && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#9b948e" }}>Features</p>
                            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                                    const val = plan.features[key];
                                    const enabled = val !== false && val !== 0 && val !== undefined;
                                    const isLimit = typeof val === "number" && val > 0;
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            {enabled
                                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#5E6A43" }} />
                                                : <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#D8D2C4" }} />
                                            }
                                            <span className="text-xs" style={{ color: enabled ? "#2E2A26" : "#9b948e" }}>
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
                    <CardHeader icon={Bot} title="Chett AI — Daily Quota" accentColor="#F29B6B" />
                    <div className="px-6 py-5">
                        {usageLoading ? (
                            <div className="h-12 animate-pulse rounded" style={{ backgroundColor: "#D8D2C4" }} />
                        ) : !aiUsage ? (
                            <p className="text-sm" style={{ color: "#9b948e" }}>Usage data unavailable.</p>
                        ) : aiUsage.unlimited ? (
                            <div className="flex items-center gap-3">
                                <Infinity className="h-6 w-6" style={{ color: "#5E6A43" }} />
                                <div>
                                    <p className="font-semibold" style={{ color: "#2E2A26" }}>Unlimited queries</p>
                                    <p className="text-xs" style={{ color: "#9b948e" }}>
                                        {aiUsage.question_count} sent today
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <QuotaBar used={aiUsage.question_count} limit={aiUsage.daily_limit} />
                        )}
                        {aiUsage && !aiUsage.unlimited && aiUsage.ai_tier && (
                            <p className="text-xs mt-3" style={{ color: "#9b948e" }}>
                                Tier: <span className="font-medium" style={{ color: "#6b6560" }}>{aiUsage.ai_tier}</span>
                            </p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};
