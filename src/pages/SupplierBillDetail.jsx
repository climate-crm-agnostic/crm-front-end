import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Swal } from "../components/payables/payablesUi";
import { HelpNote } from "../components/payables/HelpNote";
import { BillScanReview } from "../components/payables/BillScanReview";
import { ArrowLeft, Ban, FileText, HandCoins, Plus, ScanText, Trash2, Upload, X } from "lucide-react";

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
import { getInventoryItems } from "../services/inventoryService";
import { getAssets } from "../services/assetService";
import { useAuth } from "@/context/AuthContext";
import {
    createBillLineItem, createSupplierBill, deleteBillFile, deleteBillLineItem, deleteSupplierBill,
    getBillLineItems, getBillPayments, getSupplierBill, getSupplierBillAttributes, updateSupplierBill,
    scanSupplierBill, uploadBillFile, voidSupplierBill,
} from "../services/payablesService";

const CURRENCY_OPTIONS = CURRENCY_LIST.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}`, keywords: c.code }));

const emptyLine = { description: "", item: "", quantity: "1", unit_price: "0.00", tax_rate: "0" };

// Inventory has no name column; use a name-like custom field when there is one.
const inventoryLabel = (inv) => {
    const a = inv.attributes || {};
    const name = a.name || a.product_name || a.item_name || a.description;
    return name ? `${inv.sku} — ${name}` : inv.sku;
};

export const SupplierBillDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const can = useCan();
    const isNew = id === "new";

    const [suppliers, setSuppliers] = useState([]);
    // What a bill line can point to: stock items and fixed assets, each only
    // when the plan includes that module.
    const { isFeatureEnabled } = useAuth();
    const [inventoryItems, setInventoryItems] = useState([]);
    const [assets, setAssets] = useState([]);
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

    // New bill: the supplier's invoice can be attached before saving (it is
    // uploaded right after the bill is created) and read with AI to prefill
    // the form, always through the review dialog.
    const [pendingFile, setPendingFile] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [pendingLines, setPendingLines] = useState(null);
    const fileInputRef = React.useRef(null);
    const errorRef = React.useRef(null);
    // Bring a save error into view: the form is long and the banner is at the top.
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [error]);
    const [previewUrl, setPreviewUrl] = useState(null);
    useEffect(() => {
        if (!pendingFile || !pendingFile.type.startsWith("image/")) { setPreviewUrl(null); return undefined; }
        const objectUrl = URL.createObjectURL(pendingFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [pendingFile]);

    const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                const [supplierData, attrData, inventoryData, assetData] = await Promise.all([
                    getSuppliers(),
                    getSupplierBillAttributes().catch(() => []),
                    isFeatureEnabled("inventory") ? getInventoryItems().catch(() => []) : [],
                    isFeatureEnabled("assets") ? getAssets().catch(() => []) : [],
                ]);
                setSuppliers(supplierData);
                setInventoryItems(inventoryData);
                setAssets(assetData);
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
                // The bill exists now; the follow-ups below must not lose it if they fail.
                const problems = [];
                if (pendingFile) {
                    try { await uploadBillFile(created.id, pendingFile); }
                    catch (err) { problems.push(`The invoice file was not attached: ${err.message}`); }
                }
                if (pendingLines) {
                    const rows = pendingLines.lines.map((l) => ({
                        description: l.description, quantity: l.quantity || "1",
                        unit_price: l.unit_price, tax_rate: String(pendingLines.rate),
                    }));
                    if (Number(pendingLines.shipping) > 0) {
                        rows.push({ description: "Shipping & handling", quantity: "1", unit_price: String(pendingLines.shipping), tax_rate: "0" });
                    }
                    try {
                        for (const row of rows) await createBillLineItem(created.id, row);
                    } catch (err) {
                        problems.push(`Not all line items were added: ${err.message}`);
                    }
                }
                if (problems.length) await Swal.fire("Bill created, with issues", problems.join("\n"), "warning");
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

    const pickFile = (file) => {
        if (!file) return;
        setPendingFile(file);
        setPendingLines(null);
    };

    const handleScan = async () => {
        if (!pendingFile) return;
        setScanning(true);
        try {
            setScanResult(await scanSupplierBill(pendingFile));
        } catch (err) {
            Swal.fire("Could not read the invoice", err.message, "warning");
        } finally {
            setScanning(false);
        }
    };

    const applyScan = (patch, lines) => {
        // Values from the review are amounts: leave % entry mode.
        setPctMode({ discount: false, tax_amount: false });
        setForm((prev) => ({ ...prev, ...patch }));
        setPendingLines(lines);
        setScanResult(null);
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

    // One picker for both sources; values are "inventory:<id>" / "asset:<id>".
    // Items already linked to this bill's supplier are listed first.
    const itemOptions = useMemo(() => {
        const ofSupplier = (x) => form.supplier && String(x.supplier || "") === String(form.supplier);
        const options = [
            ...inventoryItems.map((inv) => ({
                value: `inventory:${inv.id}`, label: `Inventory · ${inventoryLabel(inv)}`,
                keywords: inv.location || "", mine: ofSupplier(inv),
            })),
            ...assets.map((a) => ({
                value: `asset:${a.id}`, label: `Asset · ${a.name}`, keywords: a.description || "", mine: ofSupplier(a),
            })),
        ];
        return options
            .sort((a, b) => Number(b.mine) - Number(a.mine))
            .map(({ mine, ...o }) => (mine ? { ...o, label: `${o.label} (this supplier)` } : o));
    }, [inventoryItems, assets, form.supplier]);

    const handleItemSelect = (value) => {
        const [kind, itemId] = (value || "").split(":");
        const inv = kind === "inventory" && inventoryItems.find((i) => String(i.id) === itemId);
        const asset = kind === "asset" && assets.find((a) => String(a.id) === itemId);
        setNewLine((prev) => ({
            ...prev,
            item: value || "",
            description: inv ? inventoryLabel(inv) : asset ? asset.name : prev.description,
            unit_price: asset && Number(asset.price) ? String(asset.price) : prev.unit_price,
        }));
    };

    const handleAddLine = async () => {
        try {
            const { item, ...line } = newLine;
            const [kind, itemId] = (item || "").split(":");
            await createBillLineItem(id, {
                ...line,
                inventory_item: kind === "inventory" ? itemId : null,
                asset: kind === "asset" ? itemId : null,
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
                    <div ref={errorRef} className="p-4 text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive">
                        {error}
                    </div>
                )}
                {isNew && (
                    <div
                        className="bg-card p-6 rounded-lg border shadow-sm space-y-3"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
                    >
                        <div>
                            <h3 className="font-medium text-lg">Supplier invoice <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
                            <p className="text-sm text-muted-foreground">
                                Attach the invoice now (PDF or image) — it is saved with the bill.
                                {isFeatureEnabled("ai") && " Use “Read with AI” to prefill the form; you check every value before it is used."}
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                            onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
                        />
                        {!pendingFile ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-md border border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:bg-muted/40 cursor-pointer flex flex-col items-center gap-2"
                            >
                                <Upload className="h-5 w-5 text-secondary-text" />
                                Drop the invoice here or click to choose a file
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border bg-background p-3">
                                {previewUrl
                                    ? <img src={previewUrl} alt="Invoice preview" className="h-20 w-16 object-cover rounded border" />
                                    : <FileText className="h-8 w-8 text-muted-foreground" />}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(pendingFile.size / 1024).toFixed(0)} KB · attached when the bill is created
                                        {pendingLines && ` · ${pendingLines.lines.length} line item(s) will be added`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {isFeatureEnabled("ai") && (
                                        <Button size="sm" onClick={handleScan} disabled={scanning}>
                                            <ScanText className="h-4 w-4 mr-1" /> {scanning ? "Reading..." : "Read with AI"}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => { setPendingFile(null); setPendingLines(null); }} title="Remove file">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {scanResult && (
                    <BillScanReview
                        result={scanResult}
                        form={form}
                        suppliers={suppliers}
                        file={pendingFile}
                        onApply={applyScan}
                        onClose={() => setScanResult(null)}
                    />
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
                                Save the bill to add line items and payments.
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
                                {itemOptions.length > 0 && (
                                    <div className="space-y-1 w-full md:w-64">
                                        <Label className="text-xs">Inventory / asset (optional)</Label>
                                        <SearchableSelect
                                            value={newLine.item}
                                            onChange={handleItemSelect}
                                            options={itemOptions}
                                            placeholder="None — free text"
                                        />
                                    </div>
                                )}
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
                                                <td className="py-2 pr-2">
                                                    {line.description}
                                                    {(line.inventory_sku || line.asset_name) && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {line.inventory_sku ? `Inventory · ${line.inventory_sku}` : `Asset · ${line.asset_name}`}
                                                        </p>
                                                    )}
                                                </td>
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
