import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Database, Plus, Search } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader } from "@/components/SectionCard";
import { AI_NAME } from "@/lib/brand";
import { formatCount, formatDecimal } from "@/lib/utils";
import { formatPercent } from "@/lib/credits";
import { createCreditTopUp, getCreditTopUps, getCreditUsers, getIngestionBudget } from "@/services/creditsAdminService";

const MAX_TOPUP = 1_000_000;
const PRESETS = [500, 1000, 5000];

const STATUS = {
    ok: { label: "OK", chip: "bg-green-100 text-green-800", bar: "" },
    warning: { label: "Near limit", chip: "bg-amber-100 text-amber-800", bar: "[&_[data-slot=progress-indicator]]:bg-amber-500" },
    exhausted: { label: "Out of credits", chip: "bg-red-100 text-red-800", bar: "[&_[data-slot=progress-indicator]]:bg-destructive" },
    disabled: { label: "No credits on this plan", chip: "bg-muted text-muted-foreground", bar: "" },
};

const FILTERS = [
    { value: "all", label: "Everyone" },
    { value: "exhausted", label: "Out of credits" },
    { value: "warning", label: "Near limit" },
];

const fail = (err) => Swal.fire("Error", err?.message || "Something went wrong.", "error");
const displayName = (u) => u.full_name || u.username;
const noOutsideClose = { onInteractOutside: (e) => e.preventDefault(), onPointerDownOutside: (e) => e.preventDefault() };

const parseAmount = (text) => {
    const n = Number(text);
    return Number.isFinite(n) && n > 0 && n <= MAX_TOPUP ? n : null;
};

function TopUpDialog({ user, onClose, onSaved }) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => { if (user) { setAmount(""); setNote(""); setBusy(false); } }, [user]);

    const value = parseAmount(amount);
    const submit = async () => {
        setBusy(true);
        try {
            await createCreditTopUp(user.ingestion
                ? { pool: "ingestion", credits: value, note: note.trim() }
                : { user: user.user_id, credits: value, note: note.trim() });
            await onSaved();
            onClose();
        } catch (err) {
            await fail(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={Boolean(user)} onOpenChange={(o) => !o && !busy && onClose()}>
            <DialogContent {...noOutsideClose}>
                <DialogHeader>
                    <DialogTitle>{user?.ingestion ? "Add ingestion credits" : `Add credits for ${user ? displayName(user) : ""}`}</DialogTitle>
                    <DialogDescription>
                        {user?.ingestion
                            ? "These credits are added to the account's ingestion budget for the current month. It is shared by every administrator and never touches anyone's own credits."
                            : "The credits are added to this person only, for the current month. Everyone else keeps their own balance."}
                    </DialogDescription>
                </DialogHeader>
                {user && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground" data-testid="topup-current">
                            Used {formatDecimal(user.used)} of {formatCount(user.pool)} this month
                            {user.status === "exhausted" ? (user.ingestion ? " — new uploads are paused." : " — currently blocked.") : "."}
                        </p>
                        <div className="space-y-1.5">
                            <Label htmlFor="topup-amount">Credits to add</Label>
                            <Input id="topup-amount" type="number" min="1" max={MAX_TOPUP} inputMode="decimal"
                                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1000" />
                            <div className="flex gap-2 pt-1">
                                {PRESETS.map((p) => (
                                    <Button key={p} type="button" size="sm" variant="outline" onClick={() => setAmount(String(p))}>+{formatCount(p)}</Button>
                                ))}
                            </div>
                            {amount !== "" && value === null && (
                                <p className="text-xs text-destructive" role="alert">Enter a number greater than 0 and up to {formatCount(MAX_TOPUP)}.</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="topup-note">Note (optional)</Label>
                            <Input id="topup-note" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Quarter-end reports" />
                        </div>
                        {value !== null && (
                            <p className="text-sm font-medium" data-testid="topup-preview">
                                New {user.ingestion ? "budget" : "allotment"} this month: {formatCount(Number(user.pool) + value)} credits
                            </p>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button onClick={submit} disabled={value === null || busy}>{busy ? "Adding…" : "Add credits"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value, tone = "" }) {
    return (
        <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className={`font-heading text-2xl font-bold ${tone}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        </div>
    );
}

export const CreditsAdmin = () => {
    const [report, setReport] = useState(null);
    const [currentPeriod, setCurrentPeriod] = useState(null);
    const [period, setPeriod] = useState("");
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [target, setTarget] = useState(null);
    const [topups, setTopups] = useState([]);
    const [ingestion, setIngestion] = useState(null);

    const load = useCallback(async (p) => {
        try {
            const data = await getCreditUsers(p || undefined);
            setReport(data);
            setPeriod(data.period);
            if (!p) setCurrentPeriod(data.period);
            if (!p || p === currentPeriod) setTopups((await getCreditTopUps()).topups || []);
            getIngestionBudget().then(setIngestion).catch(() => setIngestion(null));
        } catch (err) {
            await fail(err);
        } finally {
            setLoading(false);
        }
    }, [currentPeriod]);

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const users = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (report?.users || []).filter((u) =>
            (filter === "all" || u.status === filter)
            && (!term || `${u.username} ${u.full_name}`.toLowerCase().includes(term)));
    }, [report, search, filter]);

    const counts = useMemo(() => {
        const all = report?.users || [];
        return { blocked: all.filter((u) => u.status === "exhausted").length, near: all.filter((u) => u.status === "warning").length };
    }, [report]);

    const isCurrent = period === currentPeriod;
    const refresh = () => load(isCurrent ? undefined : period);

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <div>
                <h1 className="font-heading text-2xl font-bold">AI credits by user</h1>
                <p className="text-sm text-muted-foreground">
                    Every person has their own monthly credits for {AI_NAME}. When someone runs out, only they are paused until you add more.
                </p>
            </div>

            <Card>
                <CardHeader icon={Coins} title="This month" subtitle={report ? `${formatCount(report.per_user_pool)} credits per person` : ""}
                    right={
                        <div className="flex items-center gap-2">
                            <Label htmlFor="credits-month" className="sr-only">Month</Label>
                            <Input id="credits-month" type="month" className="w-40" value={period} max={currentPeriod || undefined}
                                onChange={(e) => e.target.value && load(e.target.value === currentPeriod ? undefined : e.target.value)} />
                        </div>
                    } />
                <div className="grid grid-cols-2 gap-4 px-6 py-5 md:grid-cols-4">
                    <Stat label="People" value={formatCount(report?.users.length || 0)} />
                    <Stat label="Credits used" value={formatDecimal(report?.total || 0)} />
                    <Stat label="Out of credits" value={formatCount(counts.blocked)} tone={counts.blocked ? "text-destructive" : ""} />
                    <Stat label="Near limit" value={formatCount(counts.near)} tone={counts.near ? "text-amber-600" : ""} />
                </div>
            </Card>

            {ingestion?.enabled && isCurrent && (
                <Card>
                    <CardHeader icon={Database} title="Knowledge ingestion budget"
                        subtitle="Shared by the whole account; loading files into the knowledge base uses this, not anyone's own credits"
                        right={<Button size="sm" variant="outline" aria-label="Add ingestion credits" onClick={() => setTarget({ ...ingestion, ingestion: true })}><Plus className="size-4" />Add credits</Button>} />
                    <div className="space-y-2 px-6 py-5" data-testid="ingestion-card">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span>Used {formatDecimal(ingestion.used)} of {formatCount(ingestion.pool)} credits</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${(STATUS[ingestion.status] || STATUS.ok).chip}`}>
                                {ingestion.status === "exhausted" ? "Uploads paused" : (STATUS[ingestion.status] || STATUS.ok).label}
                            </span>
                        </div>
                        <Progress value={Math.min(Math.max(Number(ingestion.percent) || 0, 0), 100)} aria-label="Ingestion budget usage" className={`h-1.5 ${(STATUS[ingestion.status] || STATUS.ok).bar}`} />
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader icon={Search} title="Balances" subtitle="Used, allotment and status of each person"
                    right={
                        <div className="flex items-center gap-2">
                            <Input aria-label="Search people" className="w-48" placeholder="Search people…" value={search} onChange={(e) => setSearch(e.target.value)} />
                            <select aria-label="Filter" className="h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
                                {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                    } />
                <div className="px-2 py-2">
                    {loading ? (
                        <div className="m-4 h-24 animate-pulse rounded-lg bg-muted" />
                    ) : users.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-muted-foreground" data-testid="credits-empty">No people match.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Person</TableHead><TableHead className="text-right">Used</TableHead>
                                    <TableHead className="text-right">Allotment</TableHead><TableHead className="w-48">Usage</TableHead>
                                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => {
                                    const st = STATUS[u.status] || STATUS.ok;
                                    return (
                                        <TableRow key={u.user_id} data-testid="credit-row">
                                            <TableCell>
                                                <p className="font-medium">{displayName(u)}</p>
                                                {u.full_name && <p className="text-xs text-muted-foreground">{u.username}</p>}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{formatDecimal(u.used)}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCount(u.pool)}
                                                {u.extra > 0 && <span className="ml-1 text-xs text-muted-foreground">(+{formatCount(u.extra)})</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={Math.min(Math.max(Number(u.percent) || 0, 0), 100)} aria-label={`${displayName(u)} usage`} className={`h-1.5 flex-1 ${st.bar}`} />
                                                    <span className="w-12 text-right text-xs tabular-nums">{formatPercent(u.percent)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.chip}`}>{st.label}</span></TableCell>
                                            <TableCell className="text-right">
                                                {isCurrent && u.status !== "disabled" && (
                                                    <Button size="sm" variant="outline" aria-label={`Add credits for ${displayName(u)}`} onClick={() => setTarget(u)}>
                                                        <Plus className="size-4" />Add credits
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {isCurrent && (
                <Card>
                    <CardHeader icon={Plus} title="Credits added this month" subtitle="Every top-up, newest first" />
                    {topups.length === 0 ? (
                        <p className="px-6 py-6 text-sm text-muted-foreground" data-testid="topups-empty">Nothing added yet this month.</p>
                    ) : (
                        <ul className="divide-y">
                            {topups.map((t) => (
                                <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-3 text-sm" data-testid="topup-row">
                                    <div className="min-w-0">
                                        <p className="font-medium">+{formatCount(t.credits)} for {t.username || "the ingestion budget"}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {t.note ? `${t.note} · ` : ""}by {t.created_by || "system"} · {new Date(t.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            )}

            <TopUpDialog user={target} onClose={() => setTarget(null)} onSaved={refresh} />
        </div>
    );
};
