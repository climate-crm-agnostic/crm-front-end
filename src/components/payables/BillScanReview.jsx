import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { SearchableSelect } from "../ui/searchable-select";
import { cents, money } from "./payablesUi";
import { formatDate } from "../../utils/date";

// Fields the reader can fill, in form order.
const FIELDS = [
    { key: "bill_number", label: "Supplier invoice #" },
    { key: "issue_date", label: "Issue date", type: "date" },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "currency", label: "Currency" },
    { key: "subtotal", label: "Subtotal", type: "number" },
    { key: "discount", label: "Discount", type: "number" },
    { key: "tax_amount", label: "Tax", type: "number" },
];

const same = (a, b) => String(a ?? "").trim() === String(b ?? "").trim()
    || (Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && a !== "" && b !== "" && Number(a) === Number(b));

/**
 * Review step between "Read with AI" and the form: every value read from the
 * invoice is shown next to what the form has now, can be corrected, and is
 * applied only if its box is ticked. Nothing reaches the form without this.
 */
export const BillScanReview = ({ result, form, suppliers, onApply, onClose }) => {
    const initial = useMemo(() => {
        const values = {};
        const checked = {};
        FIELDS.forEach(({ key }) => {
            values[key] = result[key] ?? "";
            checked[key] = result[key] != null && !same(result[key], form[key]);
        });
        return { values, checked };
    }, [result, form]);

    const [values, setValues] = useState(initial.values);
    const [checked, setChecked] = useState(initial.checked);
    const bestMatch = result.supplier_matches?.[0];
    const [supplier, setSupplier] = useState(bestMatch && bestMatch.score >= 0.8 ? bestMatch.id : "");
    const [applySupplier, setApplySupplier] = useState(Boolean(bestMatch && bestMatch.score >= 0.8));
    const [applyNotes, setApplyNotes] = useState(Boolean(result.notes));
    const [importLines, setImportLines] = useState(false);

    const lines = useMemo(() => result.line_items || [], [result.line_items]);

    // The bill computes its own total; show what it will be with the values
    // as they stand in this dialog, next to the total printed on the invoice.
    const effective = (key) => (checked[key] ? values[key] : form[key]);
    const billTotal = cents(Number(effective("subtotal") || 0) + Number(effective("tax_amount") || 0) - Number(effective("discount") || 0));
    const invoiceTotal = result.total != null ? Number(result.total) : null;
    const totalsMatch = invoiceTotal == null || Math.abs(billTotal - invoiceTotal) < 0.02;

    // Importing lines: subtotal and tax then come from the lines (one tax rate
    // for all of them), so check that this still lands on the invoice total.
    const linesPreview = useMemo(() => {
        if (!lines.length) return null;
        const usable = lines.every((l) => l.unit_price != null);
        if (!usable) return { usable: false };
        const itemsSubtotal = cents(lines.reduce((s, l) => s + Number(l.quantity || 1) * Number(l.unit_price), 0));
        const shipping = Number(result.shipping || 0);
        const tax = Number(values.tax_amount || 0);
        const rate = itemsSubtotal > 0 ? Math.round((tax / itemsSubtotal) * 10000) / 100 : 0;
        const taxFromLines = lines.reduce((s, l) => s + cents(Number(l.quantity || 1) * Number(l.unit_price) * rate / 100), 0);
        const total = cents(itemsSubtotal + shipping + taxFromLines - Number(values.discount || 0));
        return { usable: true, rate, total, shipping };
    }, [lines, result.shipping, values.tax_amount, values.discount]);

    const supplierOptions = useMemo(() => {
        const matchIds = new Set((result.supplier_matches || []).map((m) => m.id));
        return suppliers
            .map((s) => ({
                value: String(s.id),
                label: matchIds.has(String(s.id)) ? `${s.name} — suggested` : s.name,
                suggested: matchIds.has(String(s.id)),
            }))
            .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.label.localeCompare(b.label));
    }, [suppliers, result.supplier_matches]);

    const apply = () => {
        const patch = {};
        FIELDS.forEach(({ key }) => { if (checked[key]) patch[key] = values[key]; });
        if (applySupplier && supplier) patch.supplier = supplier;
        if (applyNotes && result.notes) patch.notes = [form.notes, result.notes].filter(Boolean).join("\n");
        onApply(patch, importLines && linesPreview?.usable ? { lines, rate: linesPreview.rate, shipping: linesPreview.shipping } : null);
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Check what was read from the invoice</DialogTitle>
                    <DialogDescription>
                        Compare each value with the document. Correct anything that is wrong and tick only what should go into the bill.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
                    {result.warnings?.length > 0 && (
                        <ul className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                            {result.warnings.map((w, i) => (
                                <li key={i} className="flex gap-2 text-foreground">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" /> {w}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Supplier */}
                    <div className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox checked={applySupplier} onCheckedChange={(v) => setApplySupplier(!!v)} disabled={!supplier} />
                            <span className="font-medium">Supplier</span>
                        </div>
                        <p className="text-muted-foreground">
                            On the invoice: <b className="text-foreground">{result.vendor_name || "not found"}</b>
                            {result.vendor_address && <> · {result.vendor_address}</>}
                            {result.vendor_tax_id && <> · Tax ID {result.vendor_tax_id}</>}
                        </p>
                        <SearchableSelect
                            value={supplier}
                            onChange={(v) => { setSupplier(v || ""); setApplySupplier(Boolean(v)); }}
                            options={supplierOptions}
                            placeholder="Select the supplier"
                        />
                        {!result.supplier_matches?.length && result.vendor_name && (
                            <p className="text-xs text-muted-foreground">
                                No existing supplier looks like &quot;{result.vendor_name}&quot;. Pick one, or create it in Operations → Suppliers first.
                            </p>
                        )}
                    </div>

                    {/* Fields */}
                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full min-w-[520px]">
                            <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                    <th className="p-2 w-8" />
                                    <th className="p-2 font-medium">Field</th>
                                    <th className="p-2 font-medium">Read from the invoice</th>
                                    <th className="p-2 font-medium">In the form now</th>
                                </tr>
                            </thead>
                            <tbody>
                                {FIELDS.map(({ key, label, type }) => (
                                    <tr key={key} className="border-b last:border-0">
                                        <td className="p-2">
                                            <Checkbox
                                                checked={!!checked[key]}
                                                onCheckedChange={(v) => setChecked((p) => ({ ...p, [key]: !!v }))}
                                                disabled={values[key] === "" || values[key] == null}
                                            />
                                        </td>
                                        <td className="p-2 whitespace-nowrap">
                                            {label}
                                            {key === "due_date" && result.due_date_derived && (
                                                <span className="block text-xs text-muted-foreground">from payment terms</span>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type={type === "date" ? "date" : type === "number" ? "number" : "text"}
                                                step={type === "number" ? "0.01" : undefined}
                                                className="h-8"
                                                value={values[key] ?? ""}
                                                placeholder="not found"
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setValues((p) => ({ ...p, [key]: v }));
                                                    setChecked((p) => ({ ...p, [key]: v !== "" }));
                                                }}
                                            />
                                        </td>
                                        <td className="p-2 text-muted-foreground">{(type === "date" ? formatDate(form[key]) : form[key]) || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={`flex items-center gap-2 rounded-md border p-3 ${totalsMatch ? "" : "border-destructive/40 bg-destructive/10"}`}>
                        {totalsMatch
                            ? <CheckCircle2 className="h-4 w-4 text-secondary-text" />
                            : <AlertTriangle className="h-4 w-4 text-destructive" />}
                        <span>
                            The bill total will be <b>{money(effective("currency") || "USD", billTotal)}</b>
                            {invoiceTotal != null && <> — the invoice says <b>{money(result.currency || "USD", invoiceTotal)}</b></>}
                            {!totalsMatch && ". Check subtotal, tax and discount."}
                        </span>
                    </div>

                    {result.notes && (
                        <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                            <Checkbox checked={applyNotes} onCheckedChange={(v) => setApplyNotes(!!v)} className="mt-0.5" />
                            <span>
                                <span className="font-medium">Add to notes</span>
                                <span className="block whitespace-pre-wrap text-muted-foreground">{result.notes}</span>
                            </span>
                        </label>
                    )}

                    {lines.length > 0 && (
                        <div className="rounded-md border p-3 space-y-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                                <Checkbox
                                    checked={importLines}
                                    onCheckedChange={(v) => setImportLines(!!v)}
                                    disabled={!linesPreview?.usable}
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="font-medium">Also add the {lines.length} line item{lines.length === 1 ? "" : "s"} to the bill</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {linesPreview?.usable
                                            ? <>Optional. Subtotal and tax will then come from the lines ({linesPreview.rate}% tax on each{linesPreview.shipping ? ", plus a shipping line" : ""}), giving a total of {money(result.currency || "USD", linesPreview.total)}.</>
                                            : "Some lines have no unit price, so they can't be added automatically."}
                                    </span>
                                    {linesPreview?.usable && invoiceTotal != null && Math.abs(linesPreview.total - invoiceTotal) >= 0.01 && (
                                        <span className="block text-xs text-destructive mt-1">
                                            That is {money(result.currency || "USD", Math.abs(linesPreview.total - invoiceTotal))} off the invoice total
                                            (tax rounding, or tax charged after the discount). Leave this unticked to keep the exact amounts.
                                        </span>
                                    )}
                                </span>
                            </label>
                            <ul className="text-xs text-muted-foreground space-y-0.5 pl-6">
                                {lines.map((l, i) => (
                                    <li key={i}>
                                        {l.description} — {Number(l.quantity || 1)} × {l.unit_price ?? "?"}{l.amount ? ` = ${l.amount}` : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Discard</Button>
                    <Button onClick={apply}>Apply to the bill</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
