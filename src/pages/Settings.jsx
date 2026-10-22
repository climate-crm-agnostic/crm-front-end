import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../services/settingsService";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/SectionCard";
import { BadgeCheck, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatCount } from "../lib/utils";
import Swal from "sweetalert2";

const titleCase = (key) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** The plan this instance runs on: status, dates and what it includes. Read-only. */
const PlanCard = () => {
    const { plan } = useAuth();
    if (!plan) return null;
    const features = Object.entries(plan.features || {});
    const included = features.filter(([, v]) => v === true);
    const limits = features.filter(([, v]) => typeof v === "number");
    const missing = features.filter(([, v]) => v === false);
    const status = plan.is_suspended ? "Suspended" : plan.is_active ? "Active" : "Expired";
    const daysLeft = plan.end_date ? Math.ceil((new Date(plan.end_date) - new Date()) / 86400000) : null;

    return (
        <Card>
            <CardHeader
                icon={BadgeCheck}
                title="Plan"
                right={<Badge variant={status === "Active" ? "default" : "outline"}>{status}</Badge>}
            />
            <div className="space-y-4 p-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p><p className="text-lg font-semibold">{plan.tier_display}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p><p className="text-lg font-semibold">{plan.start_date}</p></div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Valid until</p>
                        <p className="text-lg font-semibold">
                            {plan.end_date ? plan.end_date : "No expiry"}
                            {daysLeft !== null && daysLeft >= 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">{formatCount(daysLeft)} days left</span>}
                        </p>
                    </div>
                </div>
                {included.length > 0 && (
                    <div>
                        <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Included</p>
                        <div className="flex flex-wrap gap-1.5">
                            {included.map(([name]) => <Badge key={name} variant="secondary">{titleCase(name)}</Badge>)}
                            {limits.map(([name, value]) => <Badge key={name} variant="outline">{titleCase(name)}: {formatCount(value)}</Badge>)}
                        </div>
                    </div>
                )}
                {missing.length > 0 && (
                    <p className="text-sm text-muted-foreground">Not in this plan: {missing.map(([name]) => titleCase(name)).join(", ")}.</p>
                )}
            </div>
        </Card>
    );
};

const SecretField = ({ label, maskedValue, fieldKey, pendingValues, onChange }) => {
    const [editing, setEditing] = useState(false);

    const handleEdit = () => {
        setEditing(true);
        onChange(fieldKey, "");
    };

    const handleCancel = () => {
        setEditing(false);
        onChange(fieldKey, undefined);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {editing ? (
                <div className="flex gap-2">
                    <Input
                        type="password"
                        autoFocus
                        placeholder="Enter new value..."
                        value={pendingValues[fieldKey] ?? ""}
                        onChange={(e) => onChange(fieldKey, e.target.value)}
                        className="font-mono text-base"
                    />
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 h-9 flex items-center truncate text-sm bg-muted px-3 rounded-md border font-mono text-muted-foreground">
                        {maskedValue || <span className="italic">Not configured</span>}
                    </code>
                    <Button variant="outline" onClick={handleEdit}>Change</Button>
                </div>
            )}
        </div>
    );
};

export const Settings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState({});

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getSettings();
                setSettings(data);
            } catch {
                Swal.fire("Error", "Could not load settings.", "error");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = (key, value) => {
        if (value === undefined) {
            setPending(prev => { const next = { ...prev }; delete next[key]; return next; });
        } else {
            setPending(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleToggle = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setPending(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (Object.keys(pending).length === 0) return;
        setSaving(true);
        try {
            const updated = await updateSettings(pending);
            setSettings(updated);
            setPending({});
            Swal.fire({ title: "Saved", icon: "success", timer: 1500, showConfirmButton: false });
        } catch {
            Swal.fire("Error", "Could not save settings.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = async () => {
        setPending({});
        try {
            setSettings(await getSettings());
        } catch {
            Swal.fire("Error", "Could not reload settings.", "error");
        }
    };

    const hasPending = Object.keys(pending).length > 0;

    if (loading) return <div className="p-10 flex justify-center">Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto py-6 px-2 space-y-6" style={{ fontFamily: 'var(--font-body)' }}>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="text-sm text-muted-foreground">Your plan and third-party integrations</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {hasPending && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
                    <Button variant="outline" onClick={handleDiscard} disabled={saving || !hasPending}>
                        Discard
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !hasPending}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            <PlanCard />

            {/* ── Stripe ─────────────────────────────────────────── */}
            <Card>
                <CardHeader
                    icon={CreditCard}
                    title="Stripe"
                    right={
                        <>
                            <Badge variant={settings?.stripe_enabled ? "default" : "outline"}>
                                {settings?.stripe_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Switch
                                checked={!!settings?.stripe_enabled}
                                onCheckedChange={(v) => handleToggle("stripe_enabled", v)}
                            />
                        </>
                    }
                />
                <div className="px-6 py-5 space-y-5">
                    <p className="text-sm text-muted-foreground">Accept card payments via Stripe Invoices</p>

                    <SecretField
                        label="Secret Key (sk_live_... or sk_test_...)"
                        maskedValue={settings?.stripe_secret_key_masked}
                        fieldKey="stripe_secret_key"
                        pendingValues={pending}
                        onChange={handleChange}
                    />
                    <SecretField
                        label="Publishable Key (pk_live_... or pk_test_...)"
                        maskedValue={settings?.stripe_publishable_key_masked}
                        fieldKey="stripe_publishable_key"
                        pendingValues={pending}
                        onChange={handleChange}
                    />
                    <SecretField
                        label="Webhook Secret (whsec_...)"
                        maskedValue={settings?.stripe_webhook_secret_masked}
                        fieldKey="stripe_webhook_secret"
                        pendingValues={pending}
                        onChange={handleChange}
                    />
                    <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 border space-y-2">
                        <p className="font-semibold text-foreground">Stripe Webhook Setup</p>
                        <p>
                            <span className="font-medium text-foreground">Option 1 — Built-in (automatic):</span> Register the CRM's own endpoint in your Stripe Dashboard to automatically update invoice status on payment:
                        </p>
                        <code className="block font-mono bg-muted px-2 py-1 rounded break-all">https://yourcrm.com/stripe/events/</code>
                        <p>
                            <span className="font-medium text-foreground">Option 2 — Custom integration:</span> Point Stripe to your own backend server. Your server receives the event, authenticates with the CRM API using a token, and updates the invoice via <code className="font-mono">PATCH /api/invoices/&#123;id&#125;/</code>.
                            Use this when you need custom logic (ERP sync, notifications, etc.).
                        </p>
                        <p>Events to listen: <code className="font-mono">invoice.paid</code>, <code className="font-mono">invoice.payment_failed</code></p>
                    </div>
                </div>
            </Card>
        </div>
    );
};
