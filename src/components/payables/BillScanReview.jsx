import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { DateInput } from "../ui/date-input";
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

const MATCH_REASON = { tax_id: "same tax ID", legal_name: "legal name matches", name: "similar name" };
const ZOOMS = [1, 1.5, 2, 3];

// The uploaded invoice, next to the values read from it. Images can be
// zoomed and rotated (phone photos are often sideways); PDFs use the
// browser's own viewer.
const InvoiceViewer = ({ file }) => {
    // Create and revoke the object URL in the same effect, so a re-run (React
    // StrictMode, or a new file) never leaves the viewer on a revoked URL.
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!file) { setUrl(null); return undefined; }
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    const [zoom, setZoom] = useState(0);
    const [rotation, setRotation] = useState(0);
    if (!file || !url) return null;
    const isImage = file.type.startsWith("image/");

    return (
        <div className="flex flex-col min-h-0 h-[45vh] lg:h-auto rounded-md border bg-muted/40 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b bg-card text-xs">
                <span className="truncate text-muted-foreground">{file.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {isImage && (
                        <>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Zoom out"
                                onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="w-10 text-center">{ZOOMS[zoom] * 100}%</span>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Zoom in"
                                onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Rotate"
                                onClick={() => setRotation((r) => (r + 90) % 360)}>
                                <RotateCw className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <a href={url} target="_blank" rel="noopener noreferrer" title="Open in a new tab"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted">
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
            {isImage ? (
                <div className="flex-1 min-h-0 overflow-auto p-2">
                    <img
                        src={url}
                        alt="Uploaded invoice"
                        style={{ width: `${ZOOMS[zoom] * 100}%`, maxWidth: "none", transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
                        className="mx-auto bg-white"
                    />
                </div>
            ) : (
                <iframe src={url} title="Uploaded invoice" className="flex-1 min-h-0 w-full bg-white" />
            )}
        </div>
    );
};

/**
 * Review step between "Read with AI" and the form: every value read from the
 * invoice is shown next to what the form has now, can be corrected, and is
 * applied only if its box is ticked. Nothing reaches the form without this.
 */
export const BillScanReview = ({ result, form, suppliers, file, onApply, onClose }) => {
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
    // Preselected only when the backend found one clear match (same tax ID,
    // or a name far closer than any other); otherwise the person chooses.
    const suggested = result.supplier_suggested || "";
    const [supplier, setSupplier] = useState(suggested);
    const [applySupplier, setApplySupplier] = useState(Boolean(suggested));
    const [showFile, setShowFile] = useState(true);
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
        const matches = new Map((result.supplier_matches || []).map((m) => [m.id, m]));
        return suppliers
            .map((s) => {
                const m = matches.get(String(s.id));
                return {
                    value: String(s.id),
                    label: m ? `${s.name} — ${MATCH_REASON[m.reason] || "suggested"}` : s.name,
                    suggested: Boolean(m),
                };
            })
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
            <DialogContent className={`${file && showFile ? "sm:max-w-6xl" : "sm:max-w-3xl"} w-[96vw] max-h-[92vh] flex flex-col overflow-hidden`}>
                <DialogHeader>
                    <DialogTitle>Check what was read from the invoice</DialogTitle>
                    <DialogDescription>
                        Compare each value with the document. Correct anything that is wrong and tick only what should go into the bill.
                    </DialogDescription>
                    {file && (
                        <button type="button" onClick={() => setShowFile((v) => !v)}
                            className="self-start inline-flex items-center gap-1 text-xs text-secondary-text hover:underline cursor-pointer">
                            {showFile ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {showFile ? "Hide the invoice" : "Show the invoice"}
                        </button>
                    )}
                </DialogHeader>

                <div className={`flex-1 min-h-0 grid gap-4 ${file && showFile ? "lg:grid-cols-2" : ""} overflow-y-auto lg:overflow-hidden`}>
                {file && showFile && <InvoiceViewer file={file} />}
                <div className="min-h-0 lg:overflow-y-auto space-y-4 pr-1 text-sm">
                    {result.warnings?.length > 0 && (
                        <ul className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                            {result.warnings.map((w, i) => (
                                <li key={i} className="flex gap-2 text-foreground">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" /> {w}
                                </li>
                            ))}
                        </ul>
                    )}

                    {result.date_fix && values.issue_date !== result.date_fix.issue_date && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border p-3">
                            <span className="flex-1">
                                The year may be misread. Same day and month in a recent year:{" "}
                                <b>{formatDate(result.date_fix.issue_date)}</b>
                                {result.date_fix.due_date && <> (due <b>{formatDate(result.date_fix.due_date)}</b>)</>}.
                            </span>
                            <Button
                                type="button" size="sm" variant="outline"
                                onClick={() => {
                                    const fix = result.date_fix;
                                    setValues((v) => ({ ...v, issue_date: fix.issue_date, ...(fix.due_date && { due_date: fix.due_date }) }));
                                    setChecked((c) => ({ ...c, issue_date: true, ...(fix.due_date && { due_date: true }) }));
                                }}
                            >
                                Use {formatDate(result.date_fix.issue_date)}
                            </Button>
                        </div>
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
                        {result.supplier_matches?.length > 0 && !suggested && (
                            <p className="text-xs text-muted-foreground">
                                {result.supplier_matches.length > 1
                                    ? "Several suppliers look similar (listed first) — choose the right one."
                                    : "One supplier looks similar (listed first), but not closely enough to choose it for you."}
                            </p>
                        )}
                        {suggested && (
                            <p className="text-xs text-secondary-text">
                                Suggested because of {MATCH_REASON[result.supplier_matches?.[0]?.reason] || "a similar name"}. Check it is right.
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
                                            {type === "date" ? (
                                                <DateInput
                                                    value={values[key] ?? ""}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setValues((p) => ({ ...p, [key]: v }));
                                                        setChecked((p) => ({ ...p, [key]: Boolean(v) }));
                                                    }}
                                                />
                                            ) : (
                                                <Input
                                                    type={type === "number" ? "number" : "text"}
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
                                            )}
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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Discard</Button>
                    <Button onClick={apply}>Apply to the bill</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
