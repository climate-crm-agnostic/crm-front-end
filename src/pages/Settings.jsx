import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../services/settingsService";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/SectionCard";
import { CreditCard } from "lucide-react";
import { PlanSummary } from "../components/PlanSummary";
import Swal from "sweetalert2";

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
            <Label className="text-sm font-semibold">{label}</Label>
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
                    <code className="flex h-10 min-w-0 flex-1 items-center truncate rounded-lg border bg-muted/40 px-3 font-mono text-sm">
                        {maskedValue || <span className="font-sans text-muted-foreground">Not configured</span>}
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

            <PlanSummary />

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
                <div className="space-y-5 px-6 py-5">
                    <p className="text-sm text-muted-foreground">Accept card payments through Stripe invoices. Keys are stored encrypted; only the last characters are shown.</p>

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
                    <details className="group rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                        <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-foreground marker:content-none">How to connect Stripe webhooks</summary>
                        <div className="space-y-2 border-t px-4 py-3">
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
                    </details>
                </div>
            </Card>
        </div>
    );
};
