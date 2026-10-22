import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMyAIUsage } from "@/services/aiService";
import { Bot, Building2, Infinity as InfinityIcon, UserCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/SectionCard";
import { PlanSummary } from "@/components/PlanSummary";
import { formatCount } from "@/lib/utils";

const chip = { background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" };

function QuotaBar({ used, limit }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barColor = pct >= 90 ? "var(--destructive)" : pct >= 70 ? "#e0a030" : "var(--primary)";

    return (
        <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
                <p className="font-heading tabular-nums">
                    <span className="text-4xl font-bold">{formatCount(used)}</span>
                    <span className="ml-2 text-sm font-medium text-muted-foreground">of {formatCount(limit)} questions today</span>
                </p>
                <span className="text-sm font-semibold tabular-nums" style={{ color: pct >= 70 ? barColor : "var(--secondary-text)" }}>
                    {pct.toFixed(0)}%
                </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
            <p className="text-[13px] text-muted-foreground">Resets daily at midnight UTC</p>
        </div>
    );
}

export const MyInfo = () => {
    const { user, isFeatureEnabled } = useAuth();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initials = (user?.username ?? "?").slice(0, 2).toUpperCase();

    return (
        <div className="mx-auto max-w-2xl space-y-5 py-6">
            <Card>
                <CardHeader icon={UserCircle2} title="My account" subtitle="Who you are signed in as" />
                <div className="flex items-center gap-5 px-6 py-6">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full font-heading text-xl font-bold" style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                        {initials}
                    </div>
                    <div className="min-w-0 space-y-1">
                        <p className="truncate font-heading text-xl font-semibold">{user?.username}</p>
                        <p className="truncate text-sm text-muted-foreground">{user?.email || "No email on file"}</p>
                        {user?.groups?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {user.groups.map((g) => (
                                    <span key={g} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={chip}>
                                        <Building2 className="size-3" aria-hidden="true" />{g}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <PlanSummary />

            {isFeatureEnabled("ai") && (
                <Card>
                    <CardHeader icon={Bot} title="Chett AI" subtitle="Your daily question quota" />
                    <div className="px-6 py-5">
                        {usageLoading ? (
                            <div className="h-16 animate-pulse rounded-lg bg-muted" />
                        ) : !aiUsage ? (
                            <p className="text-sm text-muted-foreground">Usage data unavailable.</p>
                        ) : aiUsage.unlimited ? (
                            <div className="flex items-center gap-3">
                                <span className="grid size-10 place-items-center rounded-xl" style={chip}><InfinityIcon className="size-5" aria-hidden="true" /></span>
                                <div>
                                    <p className="font-heading text-lg font-semibold">Unlimited questions</p>
                                    <p className="text-sm text-muted-foreground">{formatCount(aiUsage.question_count)} sent today</p>
                                </div>
                            </div>
                        ) : (
                            <QuotaBar used={aiUsage.question_count} limit={aiUsage.daily_limit} />
                        )}
                        {aiUsage && !aiUsage.unlimited && aiUsage.ai_tier && (
                            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                                Tier <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={chip}>{aiUsage.ai_tier}</span>
                            </p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};
