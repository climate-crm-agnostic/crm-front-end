import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Swal } from "../components/payables/payablesUi";
import { HelpNote } from "../components/payables/HelpNote";
import { ArrowLeft, Ban, HandCoins, Plus, Trash2 } from "lucide-react";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { DateInput } from "../components/ui/date-input";
import { SearchableSelect } from "../components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DynamicAttributeField } from "../components/attributes/DynamicAttributeField";
import { AttachmentsCard } from "../components/payables/AttachmentsCard";
import { BILL_STATUS, PAYABLE_STATUSES, addDays, askVoidReason, cents, methodLabel, money, today, useCan } from "../components/payables/payablesUi";
import { coerceAttributeValue, emptyValueFor, normalizeOptions } from "../utils/attributeTypes";
import { CURRENCY_LIST } from "../utils/currencies";
import { formatDate } from "../utils/date";
import { getSuppliers } from "../services/supplierService";
import { getCatalogueItems } from "../services/catalogueService";
import {
    createBillLineItem, createSupplierBill, deleteBillFile, deleteBillLineItem, deleteSupplierBill,
    getBillLineItems, getBillPayments, getSupplierBill, getSupplierBillAttributes, updateSupplierBill,
    uploadBillFile, voidSupplierBill,
} from "../services/payablesService";

const CURRENCY_OPTIONS = CURRENCY_LIST.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}`, keywords: c.code }));

const emptyLine = { description: "", catalogue_item: "", quantity: "1", unit_price: "0.00", tax_rate: "0" };

export const SupplierBillDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const can = useCan();
    const isNew = id === "new";

    const [suppliers, setSuppliers] = useState([]);
    const [catalogue, setCatalogue] = useState([]);
    const [attributes, setAttributes] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    const [bill, setBill] = useState(null); // last server copy
    const [form, setForm] = useState({
        supplier: searchParams.get("supplier") || "",
        bill_number: "",
        status: "open",
        issue_date: today(),
        due_date: addDays(today(), 30),
        currency: "USD",
        subtotal: "0.00",
        tax_amount: "0.00",
        discount: "0.00",
        notes: "",
    });
    const [lines, setLines] = useState([]);
    const [payments, setPayments] = useState([]);
    const [newLine, setNewLine] = useState(emptyLine);
    const [pctMode, setPctMode] = useState({ discount: false, tax_amount: false });
    const [pct, setPct] = useState({ discount: "", tax_amount: "" });

    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                const [supplierData, attrData, catalogueData] = await Promise.all([
                    getSuppliers(),
                    getSupplierBillAttributes().catch(() => []),
                    getCatalogueItems({ is_active: true }).catch(() => []),
                ]);
                setSuppliers(supplierData);
                setCatalogue(catalogueData);
                const attrs = attrData.map((a) => ({ ...a, options: normalizeOptions(a.options || a.list_values) }));
                setAttributes(attrs);
                const initial = {};
                attrs.forEach((a) => { initial[a.name] = emptyValueFor(a); });

                if (!isNew) {
                    const data = await load(id);
                    attrs.forEach((a) => {
                        const v = data.attributes?.[a.name];
                        if (v !== undefined && v !== null) initial[a.name] = v;
                    });
                }
                setDynamicData(initial);
            } catch (err) {
                console.error("Error loading bill", err);
                setError("Failed to load the bill.");
            } finally {
                setFetching(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const load = async (billId) => {
        const [data, lineData, paymentData] = await Promise.all([
            getSupplierBill(billId), getBillLineItems(billId), getBillPayments(billId),
        ]);
        setBill(data);
        setLines(lineData);
        setPayments(paymentData);
        setForm({
            supplier: String(data.supplier),
            bill_number: data.bill_number || "",
            status: data.status,
            issue_date: data.issue_date,
            due_date: data.due_date,
            currency: data.currency,
            subtotal: data.subtotal,
            tax_amount: data.tax_amount,
            discount: data.discount,
            notes: data.notes || "",
        });
        return data;
    };

    const status = bill?.status || form.status;
    const isVoid = status === "void";
    const hasPayments = Number(bill?.amount_paid || 0) > 0;
    const hasLines = lines.length > 0;
    const editable = !isVoid && can(isNew ? "app.add_supplierbill" : "app.change_supplierbill");
    // Once money is applied the bill's figures are fixed (the backend enforces
    // the same): amounts, lines, supplier, currency, number and issue date.
    // The due date stays editable until the bill is fully paid.
    const figuresEditable = editable && !hasPayments;
    const dueEditable = editable && status !== "paid";

    const supplierOptions = useMemo(
        () => suppliers.map((s) => ({ value: String(s.id), label: s.name })),
        [suppliers],
    );

    // Live preview of the total while typing; the server recomputes on save.
    // Tax and discount can be typed as an amount or as a %. The amount is
    // what gets saved (it has to match the supplier's document); a % is only
    // a way of entering it. Discount % applies to the subtotal, tax % to the
    // subtotal after the discount.
    const subtotalNum = Number(form.subtotal) || 0;
    const discountAmount = pctMode.discount
        ? cents(subtotalNum * (Number(pct.discount) || 0) / 100)
        : Number(form.discount) || 0;
    const taxAmount = pctMode.tax_amount
        ? cents((subtotalNum - discountAmount) * (Number(pct.tax_amount) || 0) / 100)
        : Number(form.tax_amount) || 0;
    const previewTotal = subtotalNum + taxAmount - discountAmount;

    const togglePct = (field) => {
        const toPct = !pctMode[field];
        if (toPct) {
            // Start the % from the amount already entered.
            const base = field === "discount" ? subtotalNum : subtotalNum - discountAmount;
            const current = field === "discount" ? discountAmount : taxAmount;
            setPct((prev) => ({ ...prev, [field]: base > 0 ? String(cents(current / base * 100)) : "" }));
        } else {
            set(field)((field === "discount" ? discountAmount : taxAmount).toFixed(2));
        }
        setPctMode((prev) => ({ ...prev, [field]: toPct }));
    };

    const handleSave = async () => {
        setError(null);
        if (!form.supplier) { setError("Select a supplier."); return; }
        setSaving(true);
        try {
            const payload = {
                supplier: form.supplier,
                bill_number: form.bill_number.trim(),
                issue_date: form.issue_date,
                due_date: form.due_date,
                currency: form.currency,
                discount: discountAmount.toFixed(2),
                notes: form.notes,
                attributes: Object.fromEntries(attributes.map((a) => [a.name, coerceAttributeValue(a, dynamicData[a.name])])),
            };
            if (!hasLines) {
                payload.subtotal = form.subtotal || "0";
                payload.tax_amount = taxAmount.toFixed(2);
            }
            if (["draft", "open"].includes(form.status) && (isNew || ["draft", "open"].includes(bill?.status))) {
                payload.status = form.status;
            }

            if (isNew) {
                const created = await createSupplierBill(payload);
                navigate(`/supplier-bill/${created.id}`, { replace: true });
            } else {
                await updateSupplierBill(id, payload);
                await load(id);
                Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleVoid = async () => {
        const reason = await askVoidReason("bill");
        if (!reason) return;
        try {
            await voidSupplierBill(id, reason);
            await load(id);
        } catch (err) {
            Swal.fire("Cannot void", err.message, "error");
        }
    };

    const handleDelete = async () => {
        const { isConfirmed } = await Swal.fire({
            title: "Delete this draft?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete",
        });
        if (!isConfirmed) return;
        try {
            await deleteSupplierBill(id);
            navigate("/supplier-bill");
        } catch (err) {
            Swal.fire("Cannot delete", err.message, "error");
        }
    };

    const handleCatalogueSelect = (value) => {
        const item = catalogue.find((c) => String(c.id) === value);
        setNewLine((prev) => ({
            ...prev,
            catalogue_item: value || "",
            description: item ? item.name : prev.description,
        }));
    };

    const handleAddLine = async () => {
        try {
            await createBillLineItem(id, {
                ...newLine,
                catalogue_item: newLine.catalogue_item || null,
            });
            setNewLine(emptyLine);
            await load(id);
        } catch (err) {
            Swal.fire("Cannot add line", err.message, "error");
        }
    };

    const handleDeleteLine = async (line) => {
        try {
            await deleteBillLineItem(id, line.id);
            await load(id);
        } catch (err) {
            Swal.fire("Cannot delete line", err.message, "error");
        }
    };

    const refreshAttachments = (data) => setBill((prev) => ({ ...prev, attachments: data.attachments }));

    // After "Create Bill" the route changes from /new to the id before the
    // new bill is loaded, so wait for it rather than render without it.
    if (fetching || (!isNew && !bill)) {
        return <div className="p-10 flex justify-center">{error || "Loading..."}</div>;
    }

    const statusMeta = BILL_STATUS[status] || BILL_STATUS.open;
    const currency = form.currency || "USD";

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/supplier-bill")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-semibold truncate">
                                {isNew ? "New Supplier Bill" : `Bill ${bill.bill_number || bill.reference}`}
                            </h1>
                            {!isNew && (
                                bill.is_overdue
                                    ? <Badge variant="destructive">{bill.days_overdue}d overdue</Badge>
                                    : <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                            {isNew ? "Record an invoice a supplier sent you" : (
                                <>
                                    {bill.reference} ·{" "}
                                    <Link to={`/supplier/${bill.supplier}/account`} className="underline">{bill.supplier_name}</Link>
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    {!isNew && PAYABLE_STATUSES.includes(status) && can("app.add_supplierpayment") && (
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/supplier-payment/new?supplier=${bill.supplier}&bill=${bill.id}`)}
                        >
                            <HandCoins className="h-4 w-4 mr-2" /> Pay this bill
                        </Button>
                    )}
                    {!isNew && status === "draft" && !hasPayments && can("app.delete_supplierbill") && (
                        <Button variant="outline" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                    )}
                    {!isNew && status !== "draft" && !isVoid && can("app.delete_supplierbill") && (
                        <Button
                            variant="outline"
                            onClick={handleVoid}
                            disabled={hasPayments}
                            title={hasPayments ? "Void the payments applied to this bill first" : "Void bill"}
                        >
                            <Ban className="h-4 w-4 mr-2" /> Void
                        </Button>
                    )}
                    {editable && (
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : isNew ? "Create Bill" : "Save Changes"}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
                <HelpNote id="bill-detail" items={[
                    <>Enter the bill as the supplier issued it: their invoice number, dates and amounts should match their document.</>,
                    <><b>Total</b> = subtotal − discount + tax. Tax and discount can be typed as an amount or as a %; the amount is what gets saved.</>,
                    <>Line items are optional. When a bill has lines, its subtotal and tax come from them.</>,
                    <>Once a payment is applied, the bill's amounts, lines and dates are locked and it can't be voided. To correct it, void those payments first.</>,
                ]} />
                {error && (
                    <div className="p-4 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive">
                        {error}
                    </div>
                )}
                {!isNew && !isVoid && hasPayments && (
                    <div className="p-4 text-sm rounded-md border bg-muted text-muted-foreground">
                        Payments are applied to this bill, so its amounts, lines, supplier, currency, number and issue date are locked.
                        To correct them, void those payments first (see <b>Payments applied</b> below).
                        You can still edit the notes, attachments and additional information{status !== "paid" ? ", and the due date" : ""}.
                    </div>
                )}
                {isVoid && (
                    <div className="p-4 text-sm rounded-md border bg-muted text-muted-foreground">
                        Voided {bill.voided_at ? formatDate(bill.voided_at) : ""} — {bill.void_reason}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Bill Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Supplier <span className="text-destructive">*</span></Label>
                                <SearchableSelect
                                    value={form.supplier}
                                    onChange={(v) => set("supplier")(v || "")}
                                    options={supplierOptions}
                                    placeholder="Select supplier"
                                    disabled={!editable || hasPayments}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bill_number">Supplier invoice #</Label>
                                <Input
                                    id="bill_number"
                                    placeholder="As printed on their invoice"
                                    value={form.bill_number}
                                    onChange={(e) => set("bill_number")(e.target.value)}
                                    disabled={!figuresEditable}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <SearchableSelect
                                    value={form.currency}
                                    onChange={(v) => set("currency")(v || "USD")}
                                    options={CURRENCY_OPTIONS}
                                    allowClear={false}
                                    disabled={!editable || hasPayments}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="issue_date">Issue date</Label>
                                <DateInput id="issue_date" value={form.issue_date} onChange={(e) => set("issue_date")(e.target.value)} disabled={!figuresEditable} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="due_date">Due date</Label>
                                <DateInput id="due_date" value={form.due_date} onChange={(e) => set("due_date")(e.target.value)} disabled={!dueEditable} />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                {isNew || ["draft", "open"].includes(status) ? (
                                    <Select value={form.status} onValueChange={set("status")} disabled={!editable || hasPayments}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft — not payable yet</SelectItem>
                                            <SelectItem value="open">Open — ready to pay</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="h-9 flex items-center text-sm">{statusMeta.label}</p>
                                )}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea id="notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} disabled={!editable} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted p-6 rounded-lg border shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="font-medium text-lg border-b pb-2 mb-4">Summary</h3>
                            <div className="space-y-3 text-sm">
                                {[["Subtotal", "subtotal"], ["Discount", "discount"], ["Tax", "tax_amount"]].map(([label, field]) => {
                                    const locked = !figuresEditable || (field !== "discount" && hasLines);
                                    const canPct = field !== "subtotal";
                                    const isPct = canPct && pctMode[field];
                                    const amount = field === "discount" ? discountAmount : field === "tax_amount" ? taxAmount : subtotalNum;
                                    return (
                                        <div key={field} className="space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-muted-foreground">{label}</span>
                                                {locked ? (
                                                    <span className="font-medium">{money(currency, amount)}</span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number" step="0.01" min="0"
                                                            className="w-24 h-8 text-right"
                                                            placeholder={isPct ? "0 %" : "0.00"}
                                                            value={isPct ? pct[field] : form[field]}
                                                            onChange={(e) => (isPct
                                                                ? setPct((prev) => ({ ...prev, [field]: e.target.value }))
                                                                : set(field)(e.target.value))}
                                                        />
                                                        {!canPct && <span className="w-12 shrink-0" aria-hidden="true" />}
                                                        {canPct && (
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePct(field)}
                                                                title={isPct ? "Enter as an amount" : "Enter as a percentage"}
                                                                className="h-8 w-12 shrink-0 rounded-md border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                                                            >
                                                                {isPct ? "%" : currency}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {isPct && !locked && (
                                                <p className="text-xs text-right text-muted-foreground">
                                                    = {money(currency, amount)}{field === "tax_amount" ? " (on subtotal after discount)" : ""}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                                {hasLines && figuresEditable && (
                                    <p className="text-xs text-muted-foreground">Subtotal and tax come from the line items.</p>
                                )}
                                <div className="flex justify-between text-base font-bold pt-3 border-t">
                                    <span>Total</span>
                                    <span>{money(currency, isNew || !hasLines ? previewTotal : bill.total)}</span>
                                </div>
                            </div>
                        </div>
                        {!isNew && (
                            <div className="mt-6 pt-4 border-t space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Paid</span>
                                    <span className="font-medium text-secondary-text">{money(currency, bill.amount_paid)}</span>
                                </div>
                                <div className={`flex justify-between text-lg font-bold ${bill.is_overdue ? "text-destructive" : ""}`}>
                                    <span>Balance due</span>
                                    <span>{money(currency, isVoid ? 0 : bill.balance_due)}</span>
                                </div>
                            </div>
                        )}
                        {isNew && (
                            <p className="mt-8 text-sm text-center text-muted-foreground italic">
                                Save the bill to add line items, files and payments.
                            </p>
                        )}
                    </div>
                </div>

                {!isNew && (
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-medium text-lg">Line items <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
                        </div>
                        {figuresEditable && (
                            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end bg-muted/30 p-4 rounded-md border">
                                <div className="space-y-1 w-full md:w-56">
                                    <Label className="text-xs">Catalogue item</Label>
                                    <SearchableSelect
                                        value={newLine.catalogue_item}
                                        onChange={handleCatalogueSelect}
                                        options={catalogue.map((c) => ({ value: String(c.id), label: c.sku ? `${c.name} (${c.sku})` : c.name }))}
                                        placeholder="None"
                                    />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <Label className="text-xs">Description</Label>
                                    <Input className="h-9" value={newLine.description} onChange={(e) => setNewLine((p) => ({ ...p, description: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:w-20">
                                    <Label className="text-xs">Qty</Label>
                                    <Input className="h-9" type="number" step="0.01" min="0" value={newLine.quantity} onChange={(e) => setNewLine((p) => ({ ...p, quantity: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:w-28">
                                    <Label className="text-xs">Unit cost</Label>
                                    <Input className="h-9" type="number" step="0.01" min="0" value={newLine.unit_price} onChange={(e) => setNewLine((p) => ({ ...p, unit_price: e.target.value }))} />
                                </div>
                                <div className="space-y-1 md:w-20">
                                    <Label className="text-xs">Tax %</Label>
                                    <Input className="h-9" type="number" step="0.01" min="0" value={newLine.tax_rate} onChange={(e) => setNewLine((p) => ({ ...p, tax_rate: e.target.value }))} />
                                </div>
                                <Button className="h-9" onClick={handleAddLine} disabled={!newLine.description.trim()}>
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </div>
                        )}
                        {lines.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                                No line items — the bill uses the subtotal and tax entered above.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground border-b">
                                            <th className="py-2 pr-2 font-medium">Description</th>
                                            <th className="py-2 px-2 font-medium text-right">Qty</th>
                                            <th className="py-2 px-2 font-medium text-right">Unit cost</th>
                                            <th className="py-2 px-2 font-medium text-right">Tax</th>
                                            <th className="py-2 px-2 font-medium text-right">Amount</th>
                                            {figuresEditable && <th className="w-10" />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line) => (
                                            <tr key={line.id} className="border-b last:border-0">
                                                <td className="py-2 pr-2">{line.description}</td>
                                                <td className="py-2 px-2 text-right">{Number(line.quantity)}</td>
                                                <td className="py-2 px-2 text-right">{money(currency, line.unit_price)}</td>
                                                <td className="py-2 px-2 text-right">{Number(line.tax_rate)}%</td>
                                                <td className="py-2 px-2 text-right font-medium">{money(currency, line.subtotal)}</td>
                                                {figuresEditable && (
                                                    <td className="py-2 text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteLine(line)} title="Remove line">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {!isNew && (
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Payments applied</h3>
                        {payments.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No payments applied yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {payments.map((p) => (
                                    <li key={`${p.payment}-${p.amount}`} className={`flex items-center justify-between gap-3 p-3 rounded-md border bg-background ${p.status === "void" ? "opacity-60" : ""}`}>
                                        <div className="min-w-0">
                                            <Link to={`/supplier-payment/${p.payment}`} className="text-sm font-medium underline">
                                                {p.payment_number}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(p.payment_date)} · {methodLabel(p.method)}{p.reference ? ` · ${p.reference}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {p.status === "void" && <Badge variant="outline">Void</Badge>}
                                            <span className={`text-sm font-semibold ${p.status === "void" ? "line-through" : ""}`}>
                                                {money(currency, p.amount)}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {!isNew && (
                    <AttachmentsCard
                        attachments={bill.attachments || []}
                        disabled={!editable}
                        hint="Attach the supplier's invoice (PDF or image)."
                        onUpload={async (file) => refreshAttachments(await uploadBillFile(id, file))}
                        onDelete={async (path) => refreshAttachments(await deleteBillFile(id, path))}
                    />
                )}

                {attributes.length > 0 && (
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Additional Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {attributes.map((attr) => (
                                <div key={attr.name} className="space-y-2">
                                    <Label htmlFor={attr.name}>{attr.label}</Label>
                                    <DynamicAttributeField
                                        attr={attr}
                                        value={dynamicData[attr.name]}
                                        onChange={(val) => setDynamicData((prev) => ({ ...prev, [attr.name]: val }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
