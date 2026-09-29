import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Swal } from "../components/payables/payablesUi";
import { ArrowLeft, Ban, Wand2 } from "lucide-react";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { DateInput } from "../components/ui/date-input";
import { SearchableSelect } from "../components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DynamicAttributeField } from "../components/attributes/DynamicAttributeField";
import { AttachmentsCard } from "../components/payables/AttachmentsCard";
import { PAYMENT_METHODS, askVoidReason, cents, methodLabel, money, today, useCan } from "../components/payables/payablesUi";
import { coerceAttributeValue, emptyValueFor, normalizeOptions } from "../utils/attributeTypes";
import { CURRENCY_LIST } from "../utils/currencies";
import { formatDate } from "../utils/date";
import { getSuppliers } from "../services/supplierService";
import {
    applySupplierCredit, createSupplierPayment, deletePaymentFile, getSupplierBill, getSupplierBills,
    getSupplierPayment, getSupplierPaymentAttributes, updateSupplierPayment, uploadPaymentFile,
    voidSupplierPayment,
} from "../services/payablesService";

const CURRENCY_OPTIONS = CURRENCY_LIST.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}`, keywords: c.code }));

const byDueDate = (a, b) => (a.due_date || "").localeCompare(b.due_date || "") || (a.issue_date || "").localeCompare(b.issue_date || "");

export const SupplierPaymentDetail = () => {
    const { id } = useParams();
    return id === "new" ? <NewSupplierPayment /> : <ExistingSupplierPayment id={id} />;
};

const usePaymentAttributes = () => {
    const [attributes, setAttributes] = useState([]);
    useEffect(() => {
        getSupplierPaymentAttributes()
            .then((data) => setAttributes(data.map((a) => ({ ...a, options: normalizeOptions(a.options || a.list_values) }))))
            .catch(() => setAttributes([]));
    }, []);
    return attributes;
};

const AttributesCard = ({ attributes, values, onChange, disabled }) => {
    if (!attributes.length) return null;
    return (
        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">Additional Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attributes.map((attr) => (
                    <div key={attr.name} className="space-y-2">
                        <Label htmlFor={attr.name}>{attr.label}</Label>
                        <fieldset disabled={disabled}>
                            <DynamicAttributeField
                                attr={attr}
                                value={values[attr.name] ?? emptyValueFor(attr)}
                                onChange={(val) => onChange(attr.name, val)}
                            />
                        </fieldset>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PageHeader = ({ title, subtitle, badge, onBack, children }) => (
    <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold truncate">{title}</h1>
                    {badge}
                </div>
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">{children}</div>
    </div>
);

// ─── Record a new payment ───────────────────────────────────────────────────

const NewSupplierPayment = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const attributes = usePaymentAttributes();
    const preselectedBill = searchParams.get("bill");

    const [suppliers, setSuppliers] = useState([]);
    const [form, setForm] = useState({
        supplier: searchParams.get("supplier") || "",
        payment_date: today(),
        amount: "",
        currency: "USD",
        method: "bank_transfer",
        reference: "",
        notes: "",
    });
    // While the person hasn't typed an amount, it follows the sum applied to bills.
    const [amountTouched, setAmountTouched] = useState(false);
    const [dynamicData, setDynamicData] = useState({});

    const [bills, setBills] = useState([]); // payable bills of the supplier, all currencies
    const [applied, setApplied] = useState({}); // billId -> amount string
    const [loadingBills, setLoadingBills] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

    useEffect(() => {
        getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
    }, []);

    // Coming from "Pay this bill": adopt that bill's currency before loading.
    useEffect(() => {
        if (!preselectedBill) return;
        getSupplierBill(preselectedBill)
            .then((b) => setForm((prev) => ({ ...prev, currency: b.currency, supplier: String(b.supplier) })))
            .catch(() => {});
    }, [preselectedBill]);

    useEffect(() => {
        setApplied({});
        if (!form.supplier) { setBills([]); return; }
        setLoadingBills(true);
        getSupplierBills({ supplier: form.supplier, payable: "true" })
            .then((data) => {
                const sorted = [...data].sort(byDueDate);
                setBills(sorted);
                const pre = sorted.find((b) => b.id === preselectedBill);
                if (pre) setApplied({ [pre.id]: String(pre.balance_due) });
            })
            .catch(() => setBills([]))
            .finally(() => setLoadingBills(false));
    }, [form.supplier, preselectedBill]);

    const currencyBills = bills.filter((b) => b.currency === form.currency && Number(b.balance_due) > 0);
    const otherCurrencyCount = bills.length - currencyBills.length;

    const appliedTotal = cents(Object.entries(applied)
        .filter(([billId]) => currencyBills.some((b) => b.id === billId))
        .reduce((sum, [, v]) => sum + (Number(v) || 0), 0));
    const amount = amountTouched ? cents(form.amount) : appliedTotal;
    const credit = cents(amount - appliedTotal);

    const rowError = (bill) => {
        const v = Number(applied[bill.id]);
        if (!applied[bill.id]) return null;
        if (!(v > 0)) return "Must be more than zero";
        if (cents(v) > Number(bill.balance_due)) return `Max ${money(bill.currency, bill.balance_due)}`;
        return null;
    };
    const hasRowErrors = currencyBills.some(rowError);

    const toggleBill = (bill, checked) => {
        setApplied((prev) => {
            const next = { ...prev };
            if (!checked) { delete next[bill.id]; return next; }
            // Fill with what is left of the payment, or the whole balance.
            const remaining = amountTouched ? cents(form.amount) - appliedTotal : Infinity;
            const take = Math.max(0, Math.min(Number(bill.balance_due), remaining));
            next[bill.id] = take > 0 ? String(cents(take)) : String(bill.balance_due);
            return next;
        });
    };

    const applyInput = (bill) => {
        const err = rowError(bill);
        return (
            <>
                <Input
                    type="number" step="0.01" min="0"
                    className={`h-8 text-right ${err ? "border-destructive" : ""}`}
                    placeholder="Amount to apply"
                    value={applied[bill.id] ?? ""}
                    onChange={(e) => setApplied((prev) => {
                        const next = { ...prev };
                        if (e.target.value === "") delete next[bill.id];
                        else next[bill.id] = e.target.value;
                        return next;
                    })}
                />
                {err && <p className="text-xs text-destructive mt-1">{err}</p>}
            </>
        );
    };

    const autoApply = () => {
        let remaining = cents(form.amount);
        const next = {};
        for (const bill of currencyBills) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, Number(bill.balance_due));
            next[bill.id] = String(cents(take));
            remaining = cents(remaining - take);
        }
        setApplied(next);
    };

    const handleSubmit = async () => {
        setError(null);
        if (!form.supplier) return setError("Select a supplier.");
        if (!(amount > 0)) return setError("Enter the amount paid.");
        if (hasRowErrors) return setError("Fix the amounts applied to the bills.");
        if (credit < 0) return setError("The amounts applied add up to more than the payment.");

        if (credit > 0) {
            const { isConfirmed } = await Swal.fire({
                title: "Leave credit on account?",
                text: `${money(form.currency, credit)} will not be applied to any bill and stays as credit with this supplier. You can apply it later.`,
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Record payment",
            });
            if (!isConfirmed) return;
        }

        setSaving(true);
        try {
            const created = await createSupplierPayment({
                supplier: form.supplier,
                payment_date: form.payment_date,
                amount: amount.toFixed(2),
                currency: form.currency,
                method: form.method,
                reference: form.reference,
                notes: form.notes,
                attributes: Object.fromEntries(attributes.map((a) => [a.name, coerceAttributeValue(a, dynamicData[a.name])])),
                allocations: currencyBills
                    .filter((b) => Number(applied[b.id]) > 0)
                    .map((b) => ({ bill: b.id, amount: cents(applied[b.id]).toFixed(2) })),
            });
            navigate(`/supplier-payment/${created.id}`, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const supplierOptions = useMemo(() => suppliers.map((s) => ({ value: String(s.id), label: s.name })), [suppliers]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <PageHeader
                title="Record Supplier Payment"
                subtitle="Pay one bill, part of a bill, several bills — or pay ahead as credit"
                onBack={() => navigate(-1)}
            >
                <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : "Record Payment"}</Button>
            </PageHeader>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
                {error && (
                    <div className="p-4 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive">{error}</div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Payment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Supplier <span className="text-destructive">*</span></Label>
                                <SearchableSelect value={form.supplier} onChange={(v) => set("supplier")(v || "")} options={supplierOptions} placeholder="Select supplier" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment_date">Payment date</Label>
                                <DateInput id="payment_date" value={form.payment_date} onChange={(e) => set("payment_date")(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <SearchableSelect
                                    value={form.currency}
                                    onChange={(v) => { set("currency")(v || "USD"); setApplied({}); }}
                                    options={CURRENCY_OPTIONS}
                                    allowClear={false}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount paid <span className="text-destructive">*</span></Label>
                                <Input
                                    id="amount" type="number" step="0.01" min="0"
                                    placeholder={appliedTotal > 0 ? appliedTotal.toFixed(2) : "0.00"}
                                    value={amountTouched ? form.amount : (appliedTotal > 0 ? appliedTotal.toFixed(2) : "")}
                                    onChange={(e) => { setAmountTouched(e.target.value !== ""); set("amount")(e.target.value); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Method</Label>
                                <Select value={form.method} onValueChange={set("method")}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="reference">Reference</Label>
                                <Input id="reference" placeholder="Transfer #, check #..." value={form.reference} onChange={(e) => set("reference")(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea id="notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted p-6 rounded-lg border shadow-sm space-y-3 text-sm h-fit">
                        <h3 className="font-medium text-lg border-b pb-2 mb-2">Summary</h3>
                        <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{money(form.currency, amount)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Applied to bills</span><span className="font-medium">{money(form.currency, appliedTotal)}</span></div>
                        <div className={`flex justify-between text-base font-bold pt-3 border-t ${credit < 0 ? "text-destructive" : ""}`}>
                            <span>{credit < 0 ? "Over-applied" : "Left as credit"}</span>
                            <span>{money(form.currency, Math.abs(credit))}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                        <h3 className="font-medium text-lg">Apply to bills</h3>
                        <Button
                            size="sm" variant="outline" onClick={autoApply}
                            disabled={!amountTouched || !(Number(form.amount) > 0) || currencyBills.length === 0}
                            title="Enter the amount paid first"
                        >
                            <Wand2 className="h-4 w-4 mr-1" /> Apply oldest first
                        </Button>
                    </div>
                    {!form.supplier ? (
                        <p className="text-sm text-muted-foreground italic">Select a supplier to see what is owed.</p>
                    ) : loadingBills ? (
                        <div className="h-16 rounded-md animate-pulse bg-muted" />
                    ) : currencyBills.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                            No open bills in {form.currency}. The whole payment will be kept as credit.
                        </p>
                    ) : (
                        <>
                            {/* Phones: one card per bill so the amount field stays in view. */}
                            <ul className="sm:hidden space-y-2">
                                {currencyBills.map((bill) => (
                                    <li key={bill.id} className="p-3 rounded-md border bg-background space-y-2">
                                        <div className="flex items-start gap-3">
                                            <Checkbox className="mt-0.5" checked={applied[bill.id] !== undefined} onCheckedChange={(v) => toggleBill(bill, !!v)} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between gap-2 text-sm">
                                                    <Link to={`/supplier-bill/${bill.id}`} className="font-medium underline truncate">
                                                        {bill.bill_number ? `#${bill.bill_number}` : bill.reference}
                                                    </Link>
                                                    <span className="font-medium whitespace-nowrap">{money(bill.currency, bill.balance_due)}</span>
                                                </div>
                                                <p className={`text-xs ${bill.is_overdue ? "text-destructive" : "text-muted-foreground"}`}>
                                                    Due {formatDate(bill.due_date)}{bill.is_overdue && ` · ${bill.days_overdue}d overdue`}
                                                </p>
                                            </div>
                                        </div>
                                        {applyInput(bill)}
                                    </li>
                                ))}
                            </ul>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground border-b">
                                            <th className="py-2 w-8" />
                                            <th className="py-2 pr-2 font-medium">Bill</th>
                                            <th className="py-2 px-2 font-medium">Due</th>
                                            <th className="py-2 px-2 font-medium text-right">Total</th>
                                            <th className="py-2 px-2 font-medium text-right">Balance</th>
                                            <th className="py-2 pl-2 font-medium text-right w-40">Apply</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currencyBills.map((bill) => (
                                            <tr key={bill.id} className="border-b last:border-0 align-top">
                                                <td className="py-3">
                                                    <Checkbox checked={applied[bill.id] !== undefined} onCheckedChange={(v) => toggleBill(bill, !!v)} />
                                                </td>
                                                <td className="py-2 pr-2">
                                                    <Link to={`/supplier-bill/${bill.id}`} className="font-medium underline">
                                                        {bill.bill_number ? `#${bill.bill_number}` : bill.reference}
                                                    </Link>
                                                    {bill.bill_number && <p className="text-xs text-muted-foreground">{bill.reference}</p>}
                                                </td>
                                                <td className={`py-2 px-2 ${bill.is_overdue ? "text-destructive font-medium" : ""}`}>
                                                    {formatDate(bill.due_date)}
                                                    {bill.is_overdue && <p className="text-xs">{bill.days_overdue}d overdue</p>}
                                                </td>
                                                <td className="py-2 px-2 text-right">{money(bill.currency, bill.total)}</td>
                                                <td className="py-2 px-2 text-right font-medium whitespace-nowrap">{money(bill.currency, bill.balance_due)}</td>
                                                <td className="py-2 pl-2 text-right">{applyInput(bill)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {otherCurrencyCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {otherCurrencyCount} open bill{otherCurrencyCount === 1 ? " is" : "s are"} in another currency — change the payment currency to pay {otherCurrencyCount === 1 ? "it" : "them"}.
                        </p>
                    )}
                </div>

                <AttributesCard
                    attributes={attributes}
                    values={dynamicData}
                    onChange={(name, val) => setDynamicData((prev) => ({ ...prev, [name]: val }))}
                />
            </div>
        </div>
    );
};

// ─── View / manage a recorded payment ──────────────────────────────────────

const ExistingSupplierPayment = ({ id }) => {
    const navigate = useNavigate();
    const can = useCan();
    const attributes = usePaymentAttributes();

    const [payment, setPayment] = useState(null);
    const [edit, setEdit] = useState({ method: "", reference: "", notes: "" });
    const [dynamicData, setDynamicData] = useState({});
    const [openBills, setOpenBills] = useState([]);
    const [creditBill, setCreditBill] = useState("");
    const [creditAmount, setCreditAmount] = useState("");
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const load = async () => {
        const data = await getSupplierPayment(id);
        setPayment(data);
        setEdit({ method: data.method, reference: data.reference || "", notes: data.notes || "" });
        setDynamicData(data.attributes || {});
        if (data.status === "posted" && Number(data.amount_unapplied) > 0) {
            const bills = await getSupplierBills({ supplier: data.supplier, payable: "true", currency: data.currency });
            setOpenBills([...bills].sort(byDueDate));
        } else {
            setOpenBills([]);
        }
        return data;
    };

    useEffect(() => {
        setFetching(true);
        load()
            .catch(() => setError("Failed to load the payment."))
            .finally(() => setFetching(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (fetching) return <div className="p-10 flex justify-center">Loading...</div>;
    if (!payment) return <div className="p-10 text-center text-destructive">{error}</div>;

    const isVoid = payment.status === "void";
    const editable = !isVoid && can("app.change_supplierpayment");
    const currency = payment.currency;
    const unapplied = Number(payment.amount_unapplied);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateSupplierPayment(id, {
                ...edit,
                attributes: Object.fromEntries(attributes.map((a) => [a.name, coerceAttributeValue(a, dynamicData[a.name])])),
            });
            await load();
            Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleVoid = async () => {
        const reason = await askVoidReason("payment");
        if (!reason) return;
        try {
            await voidSupplierPayment(id, reason);
            await load();
        } catch (err) {
            Swal.fire("Cannot void", err.message, "error");
        }
    };

    const selectCreditBill = (billId) => {
        setCreditBill(billId || "");
        const bill = openBills.find((b) => b.id === billId);
        if (bill) setCreditAmount(String(cents(Math.min(unapplied, Number(bill.balance_due)))));
    };

    const handleApplyCredit = async () => {
        try {
            await applySupplierCredit(id, creditBill, creditAmount);
            setCreditBill("");
            setCreditAmount("");
            await load();
        } catch (err) {
            Swal.fire("Cannot apply credit", err.message, "error");
        }
    };

    const refreshAttachments = (data) => setPayment((prev) => ({ ...prev, attachments: data.attachments }));

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <PageHeader
                title={`Payment ${payment.payment_number}`}
                subtitle={`${payment.supplier_name} · ${formatDate(payment.payment_date)}`}
                badge={isVoid ? <Badge variant="outline">Void</Badge> : <Badge variant="default">Posted</Badge>}
                onBack={() => navigate("/supplier-payment")}
            >
                {!isVoid && can("app.delete_supplierpayment") && (
                    <Button variant="outline" onClick={handleVoid}>
                        <Ban className="h-4 w-4 mr-2" /> Void
                    </Button>
                )}
                {editable && (
                    <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                )}
            </PageHeader>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
                {error && (
                    <div className="p-4 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive">{error}</div>
                )}
                {isVoid && (
                    <div className="p-4 text-sm rounded-md border bg-muted text-muted-foreground">
                        Voided {formatDate(payment.voided_at)} — {payment.void_reason}. The bills it settled were reopened.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Payment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Supplier</p>
                                <Link to={`/supplier/${payment.supplier}/account`} className="font-medium underline">{payment.supplier_name}</Link>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Payment date</p>
                                <p className="font-medium">{formatDate(payment.payment_date)}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Method</Label>
                                {editable ? (
                                    <Select value={edit.method} onValueChange={(v) => setEdit((p) => ({ ...p, method: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : <p className="font-medium">{methodLabel(payment.method)}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reference">Reference</Label>
                                {editable ? (
                                    <Input id="reference" value={edit.reference} onChange={(e) => setEdit((p) => ({ ...p, reference: e.target.value }))} />
                                ) : <p className="font-medium">{payment.reference || "—"}</p>}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                {editable ? (
                                    <Textarea id="notes" value={edit.notes} onChange={(e) => setEdit((p) => ({ ...p, notes: e.target.value }))} />
                                ) : <p className="whitespace-pre-wrap">{payment.notes || "—"}</p>}
                            </div>
                        </div>
                        {!isVoid && (
                            <p className="text-xs text-muted-foreground">
                                The supplier, amount, currency and date of a recorded payment can't change. To correct them, void it and record it again.
                            </p>
                        )}
                    </div>

                    <div className="bg-muted p-6 rounded-lg border shadow-sm space-y-3 text-sm h-fit">
                        <h3 className="font-medium text-lg border-b pb-2 mb-2">Summary</h3>
                        <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className={`font-medium ${isVoid ? "line-through" : ""}`}>{money(currency, payment.amount)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Applied to bills</span><span className="font-medium">{money(currency, payment.amount_applied)}</span></div>
                        <div className="flex justify-between text-base font-bold pt-3 border-t">
                            <span>Unapplied credit</span>
                            <span className={unapplied > 0 ? "text-secondary-text" : ""}>{money(currency, payment.amount_unapplied)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Bills settled</h3>
                    {payment.allocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Not applied to any bill.</p>
                    ) : (
                        <ul className="space-y-2">
                            {payment.allocations.map((a) => (
                                <li key={a.id} className={`flex items-center justify-between gap-3 p-3 rounded-md border bg-background ${isVoid ? "opacity-60" : ""}`}>
                                    <div className="min-w-0">
                                        <Link to={`/supplier-bill/${a.bill}`} className="text-sm font-medium underline">
                                            {a.bill_number ? `#${a.bill_number}` : a.bill_reference}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">{a.bill_reference} · due {formatDate(a.bill_due_date)}</p>
                                    </div>
                                    <span className={`text-sm font-semibold ${isVoid ? "line-through" : ""}`}>{money(currency, a.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!isVoid && unapplied > 0 && can("app.change_supplierpayment") && (
                        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end bg-muted/30 p-4 rounded-md border">
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs">Apply credit to bill</Label>
                                <SearchableSelect
                                    value={creditBill}
                                    onChange={selectCreditBill}
                                    options={openBills.map((b) => ({
                                        value: b.id,
                                        label: `${b.bill_number ? `#${b.bill_number}` : b.reference} — due ${formatDate(b.due_date)} — balance ${money(b.currency, b.balance_due)}`,
                                    }))}
                                    placeholder={openBills.length ? "Select bill" : `No open bills in ${currency}`}
                                    disabled={!openBills.length}
                                />
                            </div>
                            <div className="space-y-1 md:w-36">
                                <Label className="text-xs">Amount</Label>
                                <Input className="h-9" type="number" step="0.01" min="0" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                            </div>
                            <Button className="h-9" onClick={handleApplyCredit} disabled={!creditBill || !(Number(creditAmount) > 0)}>
                                Apply
                            </Button>
                        </div>
                    )}
                </div>

                <AttachmentsCard
                    attachments={payment.attachments || []}
                    disabled={!editable}
                    hint="Attach the transfer receipt or a copy of the check."
                    onUpload={async (file) => refreshAttachments(await uploadPaymentFile(id, file))}
                    onDelete={async (path) => refreshAttachments(await deletePaymentFile(id, path))}
                />

                <AttributesCard
                    attributes={attributes}
                    values={dynamicData}
                    disabled={!editable}
                    onChange={(name, val) => setDynamicData((prev) => ({ ...prev, [name]: val }))}
                />
            </div>
        </div>
    );
};
