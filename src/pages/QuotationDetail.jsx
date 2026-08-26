import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { ArrowLeft, Download, Mail, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DateInput } from "../components/ui/date-input";
import { QuotationPDF } from "../components/QuotationPDF";
import { SendEmailModal } from "../components/SendEmailModal";

import { getLead } from "../services/leadService";
import { getCatalogueItems } from "../services/catalogueService";
import {
    getQuotationById, createQuotation, updateQuotation, recalculateQuotation,
    getQuotationLineItems, createQuotationLineItem, deleteQuotationLineItem,
} from "../services/quotationService";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "expired"];

const todayISO = () => new Date().toISOString().split("T")[0];

export const QuotationDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isNew = id === "new";
    const leadIdFromQuery = searchParams.get("lead");

    const [fetching, setFetching] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [lead, setLead] = useState(null);
    const [quotationNumber, setQuotationNumber] = useState("");
    const [status, setStatus] = useState("draft");
    const [recipientName, setRecipientName] = useState("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [issueDate, setIssueDate] = useState(todayISO());
    const [validUntil, setValidUntil] = useState("");
    const [notesText, setNotesText] = useState("");

    const [subtotal, setSubtotal] = useState("0.00");
    const [taxAmount, setTaxAmount] = useState("0.00");
    const [discount, setDiscount] = useState("0.00");
    const [total, setTotal] = useState("0.00");

    const [lineItems, setLineItems] = useState([]);
    const [catalogueItems, setCatalogueItems] = useState([]);

    const [newLineType, setNewLineType] = useState("catalogue");
    const [newLineCatalogueId, setNewLineCatalogueId] = useState("");
    const [newLineDesc, setNewLineDesc] = useState("");
    const [newLinePrice, setNewLinePrice] = useState("0.00");
    const [newLineQty, setNewLineQty] = useState("1.00");
    const [newLineTax, setNewLineTax] = useState("0.00");

    const [showSendModal, setShowSendModal] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                const items = await getCatalogueItems();
                setCatalogueItems(Array.isArray(items) ? items : []);

                if (isNew) {
                    if (leadIdFromQuery) {
                        const leadData = await getLead(leadIdFromQuery);
                        setLead(leadData);
                        setRecipientName(leadData?.name || "");
                        setRecipientEmail(leadData?.client_attributes?.email || "");
                    }
                } else {
                    await fetchQuotation(id);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load quotation data.");
            } finally {
                setFetching(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchQuotation = async (quotationId) => {
        const [q, lines] = await Promise.all([
            getQuotationById(quotationId),
            getQuotationLineItems(quotationId),
        ]);
        setQuotationNumber(q.quotation_number);
        setStatus(q.status);
        setRecipientName(q.recipient_name || "");
        setRecipientEmail(q.recipient_email || "");
        setIssueDate(q.issue_date || todayISO());
        setValidUntil(q.valid_until || "");
        setNotesText(q.notes || "");
        setSubtotal(q.subtotal);
        setTaxAmount(q.tax_amount);
        setDiscount(q.discount);
        setTotal(q.total);
        setLineItems(lines);

        const leadData = await getLead(q.lead);
        setLead(leadData);
    };

    const handleSave = async () => {
        if (!lead) {
            setError("A quotation must be tied to a lead.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                lead: lead.id,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                issue_date: issueDate,
                valid_until: validUntil || null,
                notes: notesText,
                discount,
            };
            if (isNew) {
                const created = await createQuotation(payload);
                navigate(`/quotation/${created.id}`, { replace: true });
            } else {
                payload.status = status;
                await updateQuotation(id, payload);
                await fetchQuotation(id);
                Swal.fire({ icon: "success", title: "Saved", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
            }
        } catch (err) {
            setError(`Failed to save quotation. ${err.message || ""}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCatalogueSelect = (val) => {
        setNewLineCatalogueId(val);
        if (val !== "none") {
            const item = catalogueItems.find(c => String(c.id) === String(val));
            if (item) {
                setNewLinePrice(item.base_price || "0.00");
                setNewLineTax(item.tax_rate || "0.00");
            }
        }
    };

    const handleAddLineItem = async () => {
        const payload = {
            quantity: newLineQty,
            unit_price: newLinePrice,
            tax_rate: newLineTax,
        };
        if (newLineType === "catalogue") {
            if (!newLineCatalogueId || newLineCatalogueId === "none") return;
            const item = catalogueItems.find(c => String(c.id) === String(newLineCatalogueId));
            payload.catalogue_item = newLineCatalogueId;
            payload.description = item ? item.name : "Catalogue Item";
        } else {
            if (!newLineDesc) return;
            payload.description = newLineDesc;
        }

        try {
            await createQuotationLineItem(id, payload);
            await recalculateQuotation(id);
            setNewLineType("catalogue");
            setNewLineCatalogueId("");
            setNewLineDesc("");
            setNewLineQty("1.00");
            setNewLinePrice("0.00");
            setNewLineTax("0.00");
            await fetchQuotation(id);
        } catch (err) {
            setError(`Failed to add line item. ${err.message || ""}`);
        }
    };

    const handleDeleteLineItem = async (lineId) => {
        try {
            await deleteQuotationLineItem(id, lineId);
            await recalculateQuotation(id);
            await fetchQuotation(id);
        } catch {
            Swal.fire("Error", "Failed to delete line item.", "error");
        }
    };

    const buildPdfFile = async () => {
        const blob = await pdf(
            <QuotationPDF
                quotation={{ quotation_number: quotationNumber, status, recipient_name: recipientName, recipient_email: recipientEmail, issue_date: issueDate, valid_until: validUntil, notes: notesText, discount, subtotal, tax_amount: taxAmount, total }}
                leadName={lead?.name}
                lineItems={lineItems}
            />
        ).toBlob();
        return new File([blob], `${quotationNumber || "quotation"}.pdf`, { type: "application/pdf" });
    };

    const handleDownloadPDF = async () => {
        const file = await buildPdfFile();
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleOpenSendModal = async () => {
        const file = await buildPdfFile();
        setPendingAttachment(file);
        setShowSendModal(true);
    };

    if (fetching) {
        return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold truncate">
                            {isNew ? "New Quotation" : quotationNumber}
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {lead ? `For lead: ${lead.name}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!isNew && (
                        <>
                            <Button variant="outline" onClick={handleDownloadPDF}>
                                <Download className="h-4 w-4 mr-1.5" /> PDF
                            </Button>
                            <Button variant="outline" onClick={handleOpenSendModal}>
                                <Mail className="h-4 w-4 mr-1.5" /> Send Email
                            </Button>
                        </>
                    )}
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Quotation"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
                {error && (
                    <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">{error}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-lg border shadow-sm">
                    <div className="space-y-2">
                        <Label>Recipient Name</Label>
                        <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Recipient Email</Label>
                        <Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Issue Date</Label>
                        <DateInput value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Valid Until</Label>
                        <DateInput value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                    </div>
                    {!isNew && (
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Discount</Label>
                        <Input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Notes / Terms</Label>
                        <Textarea value={notesText} onChange={e => setNotesText(e.target.value)} rows={3} />
                    </div>
                </div>

                {!isNew && (
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Line Items</h3>

                        <div className="flex flex-col md:flex-row gap-2 items-start md:items-end bg-muted/30 p-4 rounded-md border">
                            <div className="space-y-1 w-full md:w-40">
                                <Label className="text-xs">Source Type</Label>
                                <Select value={newLineType} onValueChange={setNewLineType}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="catalogue">Catalogue Item</SelectItem>
                                        <SelectItem value="custom">Custom Line</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {newLineType === "catalogue" ? (
                                <div className="space-y-1 flex-1 w-full">
                                    <Label className="text-xs">Item</Label>
                                    <Select value={newLineCatalogueId} onValueChange={handleCatalogueSelect}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Catalogue Item" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Select Item --</SelectItem>
                                            {catalogueItems.map(c => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-1 flex-1 w-full">
                                    <Label className="text-xs">Description</Label>
                                    <Input className="h-9" value={newLineDesc} onChange={e => setNewLineDesc(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-1 w-24">
                                <Label className="text-xs">Price</Label>
                                <Input className="h-9" type="number" step="0.01" value={newLinePrice} onChange={e => setNewLinePrice(e.target.value)} />
                            </div>
                            <div className="space-y-1 w-20">
                                <Label className="text-xs">Qty</Label>
                                <Input className="h-9" type="number" step="0.01" value={newLineQty} onChange={e => setNewLineQty(e.target.value)} />
                            </div>
                            <div className="space-y-1 w-24">
                                <Label className="text-xs">Tax %</Label>
                                <Input className="h-9" type="number" step="0.01" value={newLineTax} onChange={e => setNewLineTax(e.target.value)} />
                            </div>
                            <Button onClick={handleAddLineItem} className="h-9 mt-2 md:mt-0" disabled={(newLineType === "catalogue" && (!newLineCatalogueId || newLineCatalogueId === "none")) || (newLineType === "custom" && !newLineDesc)}>
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </div>

                        {lineItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No items added. The quotation subtotal is zero.</p>
                        ) : (
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/40">
                                            <th className="text-left px-3 py-2 font-medium">Description</th>
                                            <th className="text-right px-3 py-2 font-medium">Qty</th>
                                            <th className="text-right px-3 py-2 font-medium">Unit Price</th>
                                            <th className="text-right px-3 py-2 font-medium">Tax %</th>
                                            <th className="text-right px-3 py-2 font-medium">Amount</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.map(line => (
                                            <tr key={line.id} className="border-t">
                                                <td className="px-3 py-2">{line.description}</td>
                                                <td className="px-3 py-2 text-right">{Number(line.quantity).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right">{Number(line.unit_price).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right">{Number(line.tax_rate).toFixed(2)}%</td>
                                                <td className="px-3 py-2 text-right">{Number(line.subtotal).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLineItem(line.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <div className="w-56 space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{Number(subtotal).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{Number(taxAmount).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>- {Number(discount).toFixed(2)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{Number(total).toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <SendEmailModal
                open={showSendModal}
                onClose={() => setShowSendModal(false)}
                to={recipientEmail}
                subject={`Quotation ${quotationNumber} from Climate by CodeX`}
                lead={lead?.id}
                quotation={id !== "new" ? id : null}
                attachment={pendingAttachment}
                onSent={() => fetchQuotation(id)}
            />
        </div>
    );
};
