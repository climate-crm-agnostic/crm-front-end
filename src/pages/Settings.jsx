import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../services/settingsService";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
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
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {editing ? (
                <div className="flex gap-2">
                    <Input
                        type="password"
                        autoFocus
                        placeholder="Enter new value..."
                        value={pendingValues[fieldKey] ?? ""}
                        onChange={(e) => onChange(fieldKey, e.target.value)}
                        className="font-mono text-sm"
                    />
                    <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded border font-mono text-muted-foreground">
                        {maskedValue || <span className="italic">Not configured</span>}
                    </code>
                    <Button variant="outline" size="sm" onClick={handleEdit}>Change</Button>
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

    const hasPending = Object.keys(pending).length > 0;

    if (loading) return <div className="p-10 flex justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            <div className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between bg-card shadow-sm">
                <div>
                    <h1 className="text-xl font-semibold">Integrations</h1>
                    <p className="text-sm text-muted-foreground">Configure third-party services</p>
                </div>
                <Button onClick={handleSave} disabled={saving || !hasPending}>
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <div className="p-6 max-w-3xl mx-auto space-y-8">

                {/* ── Stripe ─────────────────────────────────────────── */}
                <section className="bg-card border rounded-lg shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="font-semibold text-base">Stripe</h2>
                                <p className="text-xs text-muted-foreground">Accept card payments via Stripe Invoices</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={settings?.stripe_enabled ? "default" : "outline"}>
                                {settings?.stripe_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Switch
                                checked={!!settings?.stripe_enabled}
                                onCheckedChange={(v) => handleToggle("stripe_enabled", v)}
                            />
                        </div>
                    </div>
                    <div className="px-6 py-5 space-y-4">
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
                        <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 border space-y-2">
                            <p className="font-semibold text-foreground">Stripe Webhook Setup</p>
                            <p>
                                <span className="font-medium text-foreground">Option 1 — Built-in (automatic):</span> Register the CRM's own endpoint in your Stripe Dashboard to automatically update invoice status on payment:
                            </p>
                            <code className="block font-mono bg-muted px-2 py-1 rounded">https://yourcrm.com/stripe/events/</code>
                            <p>
                                <span className="font-medium text-foreground">Option 2 — Custom integration:</span> Point Stripe to your own backend server. Your server receives the event, authenticates with the CRM API using a token, and updates the invoice via <code className="font-mono">PATCH /api/invoices/&#123;id&#125;/</code>.
                                Use this when you need custom logic (ERP sync, notifications, etc.).
                            </p>
                            <p>Events to listen: <code className="font-mono">invoice.paid</code>, <code className="font-mono">invoice.payment_failed</code></p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
