import { useEffect, useRef, useState } from "react";
import { CreditCard, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTopUpOptions, startTopUp, confirmTopUp, getTopUp, startCardChange, setTopUpCard } from "@/services/topUpService";
import { getStripe } from "@/lib/stripeJs";

const money = (cents) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const brandName = (brand) => (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Card");
const CREDIT_POLL_MS = 1500;
const CREDIT_POLL_MAX = 20;   // ~30 s; the payment is safe either way, the balance just updates later
const TITLES = { voice_minutes: "Top up calling minutes", ai_credits: "Buy AI credits" };
const NOTES = {
    voice_minutes: "Minutes are added to your calling balance and can be used for 6 months. Calls are charged per connected second at $0.179 per minute.",
    ai_credits: "Credits are added to your own AI balance for this month. They are not refundable.",
};
const ELEMENT_STYLE = { base: { fontSize: "15px", fontFamily: "inherit", color: "#1f2a1f", "::placeholder": { color: "#8a948c" } } };

/**
 * Buys one fixed pack (decisions of 2026-11-20): the saved card, its security code (Stripe's CVC
 * recollection), 3D Secure if the bank asks, then waits for the credit. `kind` is voice_minutes or
 * ai_credits; the backend only offers what this user may buy. onDone() runs after a credited purchase.
 */
export function TopUpDialog({ open, onOpenChange, kind, onDone }) {
    const [options, setOptions] = useState(null);
    const [price, setPrice] = useState("");
    // phase decides what is ON SCREEN; working/waiting only lock it. Keeping them apart keeps the
    // Stripe Element mounted while its request runs (a phase change used to unmount it mid-request).
    const [phase, setPhase] = useState("choose");   // choose | card | done
    const [working, setWorking] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const cvcRef = useRef(null);
    const cardRef = useRef(null);
    const elements = useRef({});

    const packs = (options?.packs || []).filter((p) => p.kind === kind);
    const pack = packs.find((p) => p.price === price);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setOptions(null); setError(""); setPhase("choose"); setResult(null); setPrice(""); setWorking(false); setWaiting(false);
        getTopUpOptions()
            .then((data) => {
                if (cancelled) return;
                setOptions(data);
                const first = (data.packs || []).find((p) => p.kind === kind);
                setPrice(first?.price || "");
            })
            .catch((e) => !cancelled && setError(e.message));
        return () => { cancelled = true; };
    }, [open, kind]);

    // Stripe Elements: the CVC of the saved card, or a whole new card (administrators).
    useEffect(() => {
        if (!open || !options?.publishable_key) return undefined;
        const target = phase === "card" ? cardRef.current : (phase === "choose" && options.card ? cvcRef.current : null);
        if (!target) return undefined;
        let element;
        let cancelled = false;
        getStripe(options.publishable_key).then((stripe) => {
            if (cancelled) return;
            const els = stripe.elements();
            element = phase === "card" ? els.create("card", { style: ELEMENT_STYLE, hidePostalCode: true }) : els.create("cardCvc", { style: ELEMENT_STYLE });
            element.mount(target);
            elements.current = { stripe, element };
        }).catch((e) => !cancelled && setError(e.message));
        return () => { cancelled = true; element?.destroy(); elements.current = {}; };
    }, [open, options?.publishable_key, options?.card, phase]);

    async function waitForCredit(paymentIntentId) {
        setWaiting(true);
        for (let i = 0; i < CREDIT_POLL_MAX; i += 1) {
            const status = await getTopUp(paymentIntentId).catch(() => null);
            if (status?.credited) break;
            await new Promise((r) => setTimeout(r, CREDIT_POLL_MS));
        }
        setWaiting(false);
        setPhase("done");
        onDone?.();
    }

    async function pay() {
        setError("");
        const { stripe, element } = elements.current;
        if (!pack || !stripe || !element) return;
        setWorking(true);
        try {
            const started = await startTopUp(pack.price);
            const token = await stripe.createToken("cvc_update", element);
            if (token.error) throw new Error(token.error.message);
            let confirmed = await confirmTopUp(started.payment_intent_id, token.token.id);
            if (confirmed.status === "requires_action") {
                const action = await stripe.handleCardAction(confirmed.client_secret);
                if (action.error) throw new Error(action.error.message);
                confirmed = await confirmTopUp(started.payment_intent_id);
            }
            if (confirmed.status !== "succeeded" && confirmed.status !== "processing") {
                throw new Error(confirmed.error?.message || "Your bank declined the payment. Try again or use another card.");
            }
            setResult({ ...started, pack });
            await waitForCredit(started.payment_intent_id);
        } catch (e) {
            setError(e.message);
        } finally {
            setWorking(false);
            setWaiting(false);
        }
    }

    async function saveCard() {
        setError("");
        const { stripe, element } = elements.current;
        if (!stripe || !element) return;
        setWorking(true);
        try {
            const setup = await startCardChange();
            const confirmed = await stripe.confirmCardSetup(setup.client_secret, { payment_method: { card: element } });
            if (confirmed.error) throw new Error(confirmed.error.message);
            const saved = await setTopUpCard(confirmed.setupIntent.id);
            setOptions((o) => ({ ...o, card: saved.card }));
            setPhase("choose");
        } catch (e) {
            setError(e.message);
        } finally {
            setWorking(false);
        }
    }

    const busy = working || waiting;
    return (
        <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{TITLES[kind]}</DialogTitle>
                </DialogHeader>

                {phase === "done" ? (
                    <div className="space-y-3 py-2" role="status">
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                            <Check className="h-4 w-4" aria-hidden="true" /> Payment received
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {result?.pack?.label} for {money(result?.amount_cents || 0)} on {brandName(options?.card?.brand)} •••• {options?.card?.last4}.
                            It is added to your balance in a few seconds; you will also get the receipt by email.
                        </p>
                    </div>
                ) : !options && !error ? (
                    <div className="h-32 animate-pulse rounded-lg bg-muted" />
                ) : (
                    <div className="space-y-5">
                        {packs.length > 0 && phase !== "card" && (
                            <fieldset className="space-y-2">
                                <legend className="text-sm font-medium mb-2">Choose a pack</legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {packs.map((p) => (
                                        <label key={p.price}
                                            className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${price === p.price ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60"}`}>
                                            <input type="radio" name="top-up-pack" value={p.price} checked={price === p.price}
                                                onChange={() => setPrice(p.price)} className="sr-only" disabled={busy} />
                                            <span className="block font-semibold">{p.label}</span>
                                            <span className="block text-muted-foreground tabular-nums">{money(p.amount_cents)}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">{NOTES[kind]} Sales tax is added where it applies.</p>
                            </fieldset>
                        )}
                        {options && packs.length === 0 && (
                            <p className="text-sm text-muted-foreground">There are no packs you can buy here. Ask an administrator of your account.</p>
                        )}

                        {phase === "card" ? (
                            <div className="space-y-2">
                                <Label>New card</Label>
                                <div ref={cardRef} className="rounded-md border px-3 py-3" />
                                <p className="text-xs text-muted-foreground">It replaces the saved card for top-ups and for your monthly plan. Card details go straight to Stripe.</p>
                            </div>
                        ) : options?.card ? (
                            <div className="space-y-2">
                                <Label>Pay with</Label>
                                <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                    <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" aria-hidden="true" />
                                        {brandName(options.card.brand)} •••• {options.card.last4}</span>
                                    {options.can_change_card && (
                                        <Button type="button" variant="link" size="sm" className="h-auto p-0" disabled={busy} onClick={() => setPhase("card")}>Use another card</Button>
                                    )}
                                </div>
                                <Label htmlFor="top-up-cvc">Security code (CVC)</Label>
                                <div id="top-up-cvc" ref={cvcRef} className="w-32 rounded-md border px-3 py-2" />
                            </div>
                        ) : options && packs.length > 0 && (
                            <div className="rounded-md border px-3 py-3 text-sm">
                                <p>There is no card saved for top-ups.</p>
                                {options.can_change_card
                                    ? <Button type="button" variant="link" className="h-auto p-0" onClick={() => setPhase("card")}>Add a card</Button>
                                    : <p className="text-muted-foreground">Ask an administrator of your account to add one.</p>}
                            </div>
                        )}

                        {waiting && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Payment approved, adding it to your balance…
                            </p>
                        )}
                        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                    </div>
                )}

                <DialogFooter>
                    {phase === "done" ? (
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    ) : phase === "card" ? (
                        <>
                            <Button variant="outline" disabled={busy} onClick={() => setPhase("choose")}>Cancel</Button>
                            <Button disabled={busy} onClick={saveCard}>Save card</Button>
                        </>
                    ) : working && !waiting ? (
                        <Button disabled><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> Processing…</Button>
                    ) : (
                        <>
                            <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button disabled={busy || !pack || !options?.card} onClick={pay}>
                                {pack ? `Pay ${money(pack.amount_cents)}` : "Pay"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
