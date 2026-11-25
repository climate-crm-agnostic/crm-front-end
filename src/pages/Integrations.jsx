import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Home, KeyRound, Loader2, Play, Plug, Trash2, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCount } from "@/lib/utils";
import {
    deleteIntegrationCredentials, getIntegrations, runIntegration, saveIntegrationCredentials, saveIntegrationSettings,
} from "@/services/integrationService";

const POLL_MS = 3000;
const CATEGORY_ICONS = { real_estate: Home };

const fail = (err) => Swal.fire("Error", err?.message || "Something went wrong.", "error");
const toast = (title) => Swal.fire({ icon: "success", title, toast: true, position: "top-end", showConfirmButton: false, timer: 2500 });

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

// "12 new · 3 updated · 2 taken off the market · 5 leads opened", from whatever the run reported.
const summarize = (result = {}) => {
    const parts = [
        [result.created, "new"], [result.updated, "updated"], [result.deactivated, "taken off the market"],
        [result.leads_created, "leads opened"], [result.leads_lost, "leads closed as lost"],
    ].filter(([n]) => n > 0).map(([n, label]) => `${formatCount(n)} ${label}`);
    const where = result.market ? `${result.market}: ` : "";
    return `${where}${parts.length ? parts.join(" · ") : "Nothing changed"}`;
};

const Chip = ({ children, tone = "neutral" }) => {
    const style = {
        neutral: { backgroundColor: "color-mix(in srgb, var(--muted-foreground) 14%, transparent)", color: "var(--muted-foreground)" },
        good: { backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--secondary-text)" },
        warn: { backgroundColor: "color-mix(in srgb, var(--destructive) 14%, transparent)", color: "var(--destructive)" },
    }[tone];
    return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={style}>{children}</span>;
};

function Credentials({ integration, onChange }) {
    const [values, setValues] = useState({});
    const [busy, setBusy] = useState(false);
    if (integration.credentials.length === 0) {
        return <p className="text-sm text-muted-foreground">No account or key needed.</p>;
    }
    const save = async () => {
        setBusy(true);
        try {
            const updated = await saveIntegrationCredentials(integration.key, values);
            setValues({});
            onChange(updated);
            toast("Saved");
        } catch (err) { await fail(err); } finally { setBusy(false); }
    };
    const remove = async () => {
        const { isConfirmed } = await Swal.fire({
            title: "Remove the credentials?", text: `${integration.name} will stop working until you add them again.`,
            icon: "warning", showCancelButton: true, confirmButtonColor: "var(--secondary)", confirmButtonText: "Remove",
        });
        if (!isConfirmed) return;
        try { onChange(await deleteIntegrationCredentials(integration.key)); } catch (err) { await fail(err); }
    };
    const anyConfigured = integration.credentials.some((c) => c.configured);
    return (
        <div className="space-y-3">
            {integration.credentials.map((field) => (
                <div key={field.name} className="space-y-1.5">
                    <Label htmlFor={`${integration.key}-${field.name}`}>{field.label}</Label>
                    <div className="flex items-center gap-2">
                        <Input id={`${integration.key}-${field.name}`} type="password" autoComplete="off" className="max-w-md"
                            placeholder={field.configured ? "Saved. Type a new one to replace it" : "Paste it here"}
                            value={values[field.name] || ""} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))} />
                        {field.configured && <Chip tone="good"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Saved</Chip>}
                    </div>
                    {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
                </div>
            ))}
            <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={save} disabled={busy || !Object.values(values).some((v) => v.trim())}>
                    <KeyRound className="h-4 w-4" aria-hidden="true" /> Save
                </Button>
                {anyConfigured && (
                    <Button size="sm" variant="outline" onClick={remove}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</Button>
                )}
            </div>
        </div>
    );
}

function Settings({ integration, onChange }) {
    const [values, setValues] = useState(() => Object.fromEntries(integration.settings.map((s) => [s.name, s.value ?? ""])));
    const [busy, setBusy] = useState(false);
    if (integration.settings.length === 0) return null;
    const dirty = integration.settings.some((s) => String(values[s.name] ?? "") !== String(s.value ?? ""));
    const save = async () => {
        setBusy(true);
        try { onChange(await saveIntegrationSettings(integration.key, values)); toast("Saved"); }
        catch (err) { await fail(err); } finally { setBusy(false); }
    };
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold">Settings</p>
            <div className="grid gap-3 md:grid-cols-2">
                {integration.settings.map((s) => (
                    <div key={s.name} className="space-y-1.5">
                        <Label htmlFor={`${integration.key}-${s.name}`}>{s.label}</Label>
                        <Input id={`${integration.key}-${s.name}`} type={s.kind === "int" ? "number" : "text"} min={s.kind === "int" ? s.min : undefined}
                            max={s.kind === "int" ? s.max : undefined} value={values[s.name] ?? ""}
                            onChange={(e) => setValues((v) => ({ ...v, [s.name]: e.target.value }))} />
                        {s.help && <p className="text-xs text-muted-foreground">{s.help}</p>}
                    </div>
                ))}
            </div>
            <Button size="sm" variant="outline" onClick={save} disabled={busy || !dirty}>Save settings</Button>
        </div>
    );
}

function LastRun({ run }) {
    if (!run) return <p className="text-sm text-muted-foreground">It has not been run yet.</p>;
    if (run.status === "running") {
        return <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{run.progress || "Running…"}</p>;
    }
    const ok = run.status === "success";
    return (
        <div className="flex items-start gap-2 text-sm">
            {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--secondary-text)" }} aria-hidden="true" />
                : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
            <div>
                <p>{ok ? summarize(run.result) : run.error}</p>
                <p className="text-xs text-muted-foreground">{ok ? "Finished" : "Failed"} {when(run.finished_at || run.started_at)}{run.triggered_by ? ` · by ${run.triggered_by}` : ""}</p>
            </div>
        </div>
    );
}

function IntegrationCard({ integration, onChange }) {
    const [starting, setStarting] = useState(false);
    const Icon = CATEGORY_ICONS[integration.category] || Plug;
    const left = integration.usage ? Math.max(0, integration.usage.cap - integration.usage.used) : null;
    const blocked = !integration.ready || integration.running || starting || left === 0;

    const run = async () => {
        if (integration.usage) {
            const { isConfirmed } = await Swal.fire({
                title: `Run ${integration.name}?`, icon: "question", showCancelButton: true, confirmButtonColor: "var(--secondary)",
                text: `This uses 1 of the ${formatCount(left)} requests left this month.`, confirmButtonText: "Run now",
            });
            if (!isConfirmed) return;
        }
        setStarting(true);
        try { await runIntegration(integration.key); await onChange(); } catch (err) { await fail(err); } finally { setStarting(false); }
    };

    return (
        <Card>
            <CardHeader icon={Icon} title={integration.name} subtitle={integration.category_label}
                right={integration.running ? <Chip><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Running</Chip>
                    : integration.ready ? <Chip tone="good"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Ready</Chip>
                        : <Chip tone="warn">Needs credentials</Chip>} />
            <div className="space-y-5 px-6 py-5">
                <div className="space-y-2">
                    <p className="text-sm">{integration.description}</p>
                    <p className="text-sm"><span className="font-semibold">What it does in your CRM: </span>{integration.creates}</p>
                    {integration.docs_url && (
                        <a href={integration.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline" style={{ color: "var(--secondary-text)" }}>
                            About this source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                    )}
                </div>
                <Credentials integration={integration} onChange={onChange} />
                <Settings key={JSON.stringify(integration.settings.map((s) => s.value))} integration={integration} onChange={onChange} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div className="space-y-1">
                        <LastRun run={integration.last_run} />
                        {integration.usage && (
                            <p className="text-xs text-muted-foreground">
                                {formatCount(integration.usage.used)} of {formatCount(integration.usage.cap)} requests used this month
                            </p>
                        )}
                    </div>
                    <Button onClick={run} disabled={blocked} variant="secondary">
                        <Play className="h-4 w-4" aria-hidden="true" /> Run now
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export const Integrations = () => {
    const [items, setItems] = useState(null);

    const load = useCallback(async () => {
        try { setItems(await getIntegrations()); } catch (err) { await fail(err); setItems((prev) => prev ?? []); }
    }, []);
    useEffect(() => { load(); }, [load]);

    // While something is running, keep the card fresh.
    const anyRunning = (items || []).some((i) => i.running);
    useEffect(() => {
        if (!anyRunning) return undefined;
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [anyRunning, load]);

    // A save returns the updated integration: swap it in without reloading the rest.
    const replace = (updated) => (updated?.key
        ? setItems((prev) => prev.map((i) => (i.key === updated.key ? updated : i)))
        : load());

    const categories = [...new Set((items || []).map((i) => i.category_label))];
    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <PageHeader icon={Plug} title="Integrations"
                description="Connect outside sources of data. Each one explains what it brings into your CRM, and only administrators can run it." />
            {items === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {items && items.length === 0 && <p className="text-sm text-muted-foreground">There are no integrations available.</p>}
            {categories.map((category) => (
                <section key={category} className="space-y-4">
                    <h2 className="font-heading text-lg font-semibold">{category}</h2>
                    {items.filter((i) => i.category_label === category).map((integration) => (
                        <IntegrationCard key={integration.key} integration={integration} onChange={replace} />
                    ))}
                </section>
            ))}
        </div>
    );
};
