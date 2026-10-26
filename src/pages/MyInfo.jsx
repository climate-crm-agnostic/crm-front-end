import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getMyAIUsage } from "@/services/aiService";
import { Bot, Building2, Infinity as InfinityIcon, KeyRound, Mail, ShieldCheck, UserCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/SectionCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanSummary } from "@/components/PlanSummary";
import { formatCount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPassword } from "@/services/userService";

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

function ChangePasswordCard() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setDone(false);
        if (next !== confirm) {
            setError("The new passwords do not match.");
            return;
        }
        setSaving(true);
        try {
            const res = await changeMyPassword({ currentPassword: current, newPassword: next });
            if (res.ok) {
                setCurrent("");
                setNext("");
                setConfirm("");
                setDone(true);
            } else if (res.status === 429) {
                setError("Too many attempts. Please wait a minute and try again.");
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.detail || "Could not change the password.");
            }
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader icon={KeyRound} title="Password" subtitle="Change the password you sign in with" />
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Choose a strong password</p>
                    <p>Avoid common passwords, all-numeric ones, or anything similar to your username or email.</p>
                    <p>Other devices will be signed out when you change it.</p>
                </div>
                <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="current-password">Current password</Label>
                        <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new-password">New password</Label>
                        <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="confirm-password">Confirm new password</Label>
                        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                    </div>
                    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                    {done && <p className="text-sm font-medium" style={{ color: "var(--secondary-text)" }} role="status">Password updated. Your other sessions were signed out.</p>}
                    <Button type="submit" disabled={saving || !current || !next || !confirm}>
                        {saving ? "Saving..." : "Change password"}
                    </Button>
                </form>
            </div>
        </Card>
    );
}

const Field = ({ label, children }) => (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words font-medium">{children}</div>
    </div>
);

const TABS = ["profile", "security", "plan", "ai"];

export const MyInfo = () => {
    const { user, isFeatureEnabled } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [aiUsage, setAiUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(true);
    const aiEnabled = isFeatureEnabled("ai");

    const requested = searchParams.get("tab");
    const activeTab = TABS.includes(requested) && (requested !== "ai" || aiEnabled) ? requested : "profile";
    const handleTabChange = (tab) => setSearchParams(tab === "profile" ? {} : { tab }, { replace: true });

    useEffect(() => {
        if (!aiEnabled) {
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
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-5 rounded-xl border bg-card px-6 py-5 shadow-sm">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full font-heading text-xl font-bold" style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    {initials}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-heading text-xl font-semibold">{fullName || user?.username}</p>
                    <p className="truncate text-sm text-muted-foreground">
                        {fullName ? `@${user?.username} · ` : ""}{user?.email || "No email on file"}
                    </p>
                </div>
                {user?.groups?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {user.groups.map((g) => (
                            <span key={g} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={chip}>
                                <Building2 className="size-3" aria-hidden="true" />{g}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="plan">Plan</TabsTrigger>
                    {aiEnabled && <TabsTrigger value="ai">Chett AI</TabsTrigger>}
                </TabsList>

                <TabsContent value="profile" className="mt-0">
                    <Card>
                        <CardHeader icon={UserCircle2} title="Account details" subtitle="Who you are signed in as" />
                        <div className="grid gap-3 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
                            <Field label="Username">{user?.username}</Field>
                            <Field label="Name">{fullName || <span className="text-muted-foreground">Not set</span>}</Field>
                            <Field label="Email">
                                {user?.email
                                    ? <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" aria-hidden="true" />{user.email}</span>
                                    : <span className="text-muted-foreground">No email on file</span>}
                            </Field>
                            <Field label="Access">
                                <span className="inline-flex items-center gap-1.5">
                                    <ShieldCheck className="size-3.5 text-muted-foreground" aria-hidden="true" />
                                    {user?.is_superuser ? "Administrator" : user?.is_staff ? "Staff" : "Standard user"}
                                </span>
                            </Field>
                            <Field label="Groups">{user?.groups?.length ? user.groups.join(", ") : <span className="text-muted-foreground">None</span>}</Field>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="mt-0">
                    <ChangePasswordCard />
                </TabsContent>

                <TabsContent value="plan" className="mt-0">
                    <PlanSummary />
                </TabsContent>

                {aiEnabled && (
                    <TabsContent value="ai" className="mt-0">
                        <Card>
                            <CardHeader icon={Bot} title="Chett AI" subtitle="Your daily question quota" />
                            <div className="px-6 py-6">
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
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};
