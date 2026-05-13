import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    createInvoice, updateInvoice, getInvoiceById, getInvoiceAttributes,
    recalculateInvoice, updateInvoiceTask, deleteInvoiceNote,
    getLineItems, createLineItem, deleteLineItem,
    getPayments, createPayment, deletePayment,
    sendInvoiceToStripe,
} from "../services/invoiceService";
import { getSettings } from "../services/settingsService";
import { getClients } from "../services/clientService";
import { getContacts } from "../services/contactService";
import { getCatalogueItems } from "../services/catalogueService";
import { Table } from "../components/Table";
import Swal from "sweetalert2";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, Download, Plus, RefreshCw, ExternalLink, CreditCard } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "../components/InvoicePDF";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";

export const InvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [clients, setClients] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [catalogueItems, setCatalogueItems] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    // Static fields
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [clientId, setClientId] = useState("");
    const [contactId, setContactId] = useState("");
    const [status, setStatus] = useState("draft");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [currency, setCurrency] = useState("USD");
    const [notesText, setNotesText] = useState("");
    const [discount, setDiscount] = useState("0.00");

    // Read-only Totals
    const [subtotal, setSubtotal] = useState("0.00");
    const [taxAmount, setTaxAmount] = useState("0.00");
    const [total, setTotal] = useState("0.00");
    const [amountPaid, setAmountPaid] = useState("0.00");
    const [balanceDue, setBalanceDue] = useState("0.00");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    // Stripe state
    const [stripeEnabled, setStripeEnabled] = useState(false);
    const [stripeInvoiceId, setStripeInvoiceId] = useState('');
    const [stripeHostedUrl, setStripeHostedUrl] = useState('');
    const [stripeSending, setStripeSending] = useState(false);
    const [stripeEmailPrompt, setStripeEmailPrompt] = useState(false);
    const [stripeEmail, setStripeEmail] = useState('');

    // Tasks & Notes List
    const [tasks, setTasks] = useState([]);
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskCompleted, setNewTaskCompleted] = useState(false);
    const [notesList, setNotesList] = useState([]);
    const [newNote, setNewNote] = useState("");

    // Line Items State
    const [lineItems, setLineItems] = useState([]);
    const [newLineType, setNewLineType] = useState("catalogue"); // catalogue or custom
    const [newLineCatalogueId, setNewLineCatalogueId] = useState("");
    const [newLineDesc, setNewLineDesc] = useState("");
    const [newLineQty, setNewLineQty] = useState("1.00");
    const [newLinePrice, setNewLinePrice] = useState("0.00");
    const [newLineTax, setNewLineTax] = useState("0.00");

    // Payments State
    const [payments, setPayments] = useState([]);
    const [newPaymentAmount, setNewPaymentAmount] = useState("");
    const [newPaymentMethod, setNewPaymentMethod] = useState("bank_transfer");
    const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
    const [newPaymentRef, setNewPaymentRef] = useState("");
    const [newPaymentNotes, setNewPaymentNotes] = useState("");

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                await Promise.all([
                    fetchAttributes(),
                    fetchClients(),
                    fetchCatalogueItems(),
                    getSettings().then(s => setStripeEnabled(!!s.stripe_enabled)).catch(() => {}),
                ]);

                if (!isNew) {
                    await fetchInvoiceData(id);
                    await fetchNestedData(id);
                } else {
                    setDynamicData({});
                }
            } catch (err) {
                console.error("Initialization error", err);
                setError("Failed to load page data.");
            } finally {
                setFetching(false);
            }
        };
        init();
    }, [id, isNew]);

    // When client changes, fetch their contacts
    useEffect(() => {
        if (clientId && clientId !== "none") {
            const loadContacts = async () => {
                try {
                    const data = await getContacts({ client: clientId });
                    setContacts(data);
                } catch (err) {
                    console.error("Failed to load contacts for client");
                }
            };
            loadContacts();
        } else {
            setContacts([]);
            setContactId("none");
        }
    }, [clientId]);

    const fetchAttributes = async () => {
        try {
            const data = await getInvoiceAttributes();
            const processedData = data.map(attr => {
                let options = attr.options;
                if (!options && attr.list_values) {
                    try {
                        options = typeof attr.list_values === 'string'
                            ? JSON.parse(attr.list_values)
                            : attr.list_values;
                    } catch (e) { options = []; }
                }
                return { ...attr, options };
            });
            setAttributes(processedData);

            const initialDynamic = {};
            processedData.forEach(attr => {
                initialDynamic[attr.name] = attr.type === 'boolean' ? false : "";
            });
            setDynamicData(initialDynamic);
        } catch (err) {
            console.error("Error fetching attributes", err);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await getClients();
            setClients(data);
        } catch (err) { }
    };

    const fetchCatalogueItems = async () => {
        try {
            const data = await getCatalogueItems({ is_active: true });
            setCatalogueItems(data);
        } catch (err) { }
    };

    const fetchInvoiceData = async (invoiceId, refreshOnly = false) => {
        try {
            const data = await getInvoiceById(invoiceId);
            if (refreshOnly) {
                // Only update totals/status if just refreshing calculations
                setSubtotal(data.subtotal || "0.00");
                setTaxAmount(data.tax_amount || "0.00");
                setTotal(data.total || "0.00");
                setAmountPaid(data.amount_paid || "0.00");
                setBalanceDue(data.balance_due || "0.00");
                setStatus(data.status || "draft");
            } else {
                populateForm(data);
            }
        } catch (err) {
            console.error("Error fetching invoice", err);
            if (!refreshOnly) setError("Failed to load invoice details.");
        }
    };

    const fetchNestedData = async (invoiceId) => {
        try {
            const [linesData, paymentsData] = await Promise.all([
                getLineItems(invoiceId),
                getPayments(invoiceId)
            ]);
            setLineItems(linesData);
            setPayments(paymentsData);
        } catch (err) {
            console.error("Error fetching nested data", err);
        }
    };

    const populateForm = (data) => {
        setInvoiceNumber(data.invoice_number || "");
        setClientId(data.client ? (typeof data.client === 'object' ? String(data.client.id) : String(data.client)) : "none");
        setContactId(data.contact ? (typeof data.contact === 'object' ? String(data.contact.id) : String(data.contact)) : "none");
        setStatus(data.status || "draft");
        setIssueDate(data.issue_date || new Date().toISOString().split('T')[0]);
        setDueDate(data.due_date || new Date().toISOString().split('T')[0]);
        setCurrency(data.currency || "USD");
        setNotesText(data.notes || "");
        setDiscount(data.discount || "0.00");

        setSubtotal(data.subtotal || "0.00");
        setTaxAmount(data.tax_amount || "0.00");
        setTotal(data.total || "0.00");
        setAmountPaid(data.amount_paid || "0.00");
        setBalanceDue(data.balance_due || "0.00");

        setTasks(data.list_of_tasks || []);
        setNotesList(data.list_of_notes || []);

        setStripeInvoiceId(data.stripe_invoice_id || '');
        setStripeHostedUrl(data.stripe_hosted_url || '');

        setDynamicData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
                let val = data[key] !== undefined ? data[key] : (data.attributes?.[key]);
                if (val === undefined || val === null) {
                    const attrDef = attributes.find(a => a.name === key);
                    val = (attrDef && attrDef.type === 'boolean') ? false : "";
                }
                updated[key] = val;
            });
            return updated;
        });
    };

    const handleDynamicChange = (name, value) => {
        setDynamicData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // --- Line Items Management ---
    const handleAddLineItem = async () => {
        let payload = {
            invoice: id,
            quantity: newLineQty,
            unit_price: newLinePrice,
            tax_rate: newLineTax,
            attributes: {}
        };

        if (newLineType === 'catalogue') {
            if (!newLineCatalogueId || newLineCatalogueId === 'none') return;
            // Get item description from catalogue
            const item = catalogueItems.find(c => String(c.id) === String(newLineCatalogueId));
            payload.catalogue_item = newLineCatalogueId;
            payload.description = item ? item.name : "Catalogue Item";
        } else {
            if (!newLineDesc) return;
            payload.description = newLineDesc;
        }

        try {
            await createLineItem(id, payload);
            await recalculateInvoice(id);
            // Reset form
            setNewLineType("catalogue");
            setNewLineCatalogueId("");
            setNewLineDesc("");
            setNewLineQty("1.00");
            setNewLinePrice("0.00");
            setNewLineTax("0.00");
            // Refresh
            fetchNestedData(id);
            fetchInvoiceData(id, true);
        } catch (err) {
            console.error("Error adding line item", err);
            setError("Failed to add line item.");
        }
    };

    const handleDeleteLineItem = async (line) => {
        try {
            await deleteLineItem(id, line.id);
            await recalculateInvoice(id);
            fetchNestedData(id);
            fetchInvoiceData(id, true);
        } catch (error) {
            console.error("Error deleting line item", error);
            Swal.fire('Error!', 'Failed to delete line item.', 'error');
        }
    };

    const handleCatalogueSelect = (val) => {
        setNewLineCatalogueId(val);
        if (val !== 'none') {
            const item = catalogueItems.find(c => String(c.id) === String(val));
            if (item) {
                setNewLinePrice(item.base_price || "0.00");
                setNewLineTax(item.tax_rate || "0.00");
            }
        }
    };

    const lineColumns = [
        { key: "description", label: "Description" },
        {
            key: "unit_price",
            label: "Unit Price",
            render: (value) => `${currency} ${Number(value).toFixed(2)}`
        },
        { key: "quantity", label: "Qty" },
        {
            key: "tax_rate",
            label: "Tax %",
            render: (value) => `${Number(value).toFixed(2)}%`
        },
        {
            key: "subtotal",
            label: "Amount",
            render: (value) => `${currency} ${Number(value).toFixed(2)}`
        }
    ];

    // --- Payments Management ---
    const handleAddPayment = async () => {
        if (!newPaymentAmount) return;

        const payload = {
            invoice: id,
            amount: newPaymentAmount,
            method: newPaymentMethod,
            paid_at: newPaymentDate,
            reference: newPaymentRef,
            notes: newPaymentNotes,
            attributes: {}
        };

        try {
            await createPayment(id, payload);
            // Reset form
            setNewPaymentAmount("");
            setNewPaymentRef("");
            setNewPaymentNotes("");
            // Refresh
            fetchNestedData(id);
            fetchInvoiceData(id, true);
        } catch (err) {
            console.error("Error adding payment", err);
            setError("Failed to record payment.");
        }
    };

    const handleDeletePayment = async (payment) => {
        try {
            await deletePayment(id, payment.id);
            fetchNestedData(id);
            fetchInvoiceData(id, true);
        } catch (error) {
            console.error("Error deleting payment", error);
            Swal.fire('Error!', 'Failed to delete payment.', 'error');
        }
    };

    const paymentColumns = [
        {
            key: "paid_at",
            label: "Date",
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            key: "method",
            label: "Method",
            render: (value) => <span className="capitalize">{value.replace('_', ' ')}</span>
        },
        { key: "reference", label: "Reference" },
        {
            key: "amount",
            label: "Amount paid",
            render: (value) => `${currency} ${Number(value).toFixed(2)}`
        }
    ];

    // --- Regular Submit (Main Invoice Form) ---
    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                client: clientId === "none" ? null : clientId,
                contact: contactId === "none" ? null : contactId,
                status,
                issue_date: issueDate,
                due_date: dueDate,
                currency,
                notes: notesText,
                discount,
                attributes: dynamicData
            };

            if (isNew) {
                if (tasks.length) payload.list_of_tasks = tasks;
                if (notesList.length) payload.list_of_notes = notesList;
                const newInv = await createInvoice(payload);
                navigate(`/invoice/${newInv.id}`, { replace: true });
            } else {
                payload.list_of_tasks = tasks;
                payload.list_of_notes = notesList;
                await updateInvoice(id, payload);
                fetchInvoiceData(id);
                Swal.fire({ title: 'Success', text: 'Invoice updated.', icon: 'success', timer: 1500, showConfirmButton: false });
            }
        } catch (err) {
            console.error("Error saving invoice", err);
            setError(`Failed to save invoice. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Tasks & Notes ---
    const addTask = async () => {
        if (!newTaskDesc.trim()) return;
        const newTask = { date: newTaskDate, task: newTaskDesc, completed: newTaskCompleted };
        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        setNewTaskDesc("");
        setNewTaskCompleted(false);
        if (!isNew) updateInvoice(id, { list_of_tasks: updatedTasks });
    };

    const removeTask = async (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        if (!isNew) updateInvoice(id, { list_of_tasks: newTasks });
    };

    const toggleTask = async (index) => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
        if (!isNew) updateInvoice(id, { list_of_tasks: newTasks });
    };

    const addNote = async () => {
        if (!newNote.trim()) return;
        const newEntry = { date: new Date().toISOString(), note: newNote };
        const updatedNotes = [...notesList, newEntry];
        setNotesList(updatedNotes);
        setNewNote("");
        if (!isNew) updateInvoice(id, { list_of_notes: updatedNotes });
    };

    const handleSendToStripe = async (emailOverride) => {
        setStripeSending(true);
        try {
            const updated = await sendInvoiceToStripe(id, emailOverride || stripeEmail);
            setStripeInvoiceId(updated.stripe_invoice_id || '');
            setStripeHostedUrl(updated.stripe_hosted_url || '');
            setStatus(updated.status);
            setStripeEmailPrompt(false);
            setStripeEmail('');
            Swal.fire({ title: 'Sent to Stripe!', text: 'The payment link is ready.', icon: 'success', timer: 2000, showConfirmButton: false });
        } catch (err) {
            if (err.requires_email) {
                setStripeEmailPrompt(true);
            } else {
                Swal.fire('Error', err.detail || 'Failed to send to Stripe.', 'error');
            }
        } finally {
            setStripeSending(false);
        }
    };

    const handleDownloadPDF = async () => {
        const client = clients.find(c => String(c.id) === String(clientId)) || null;
        const contact = contacts.find(c => String(c.id) === String(contactId)) || null;
        const invoiceData = {
            invoice_number: invoiceNumber, issue_date: issueDate, due_date: dueDate,
            currency, notes: notesText, discount, subtotal, tax_amount: taxAmount,
            total, amount_paid: amountPaid, balance_due: balanceDue, status,
        };
        const blob = await pdf(
            <InvoicePDF
                invoice={invoiceData}
                client={client}
                contact={contact}
                lineItems={lineItems}
                payments={payments}
            />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoiceNumber || id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleForceRecalculate = async () => {
        if (isNew) return;
        try {
            await recalculateInvoice(id);
            fetchInvoiceData(id, true);
            Swal.fire({ title: 'Recalculated', text: 'Totals have been successfully recalculated.', icon: 'success', timer: 1500, showConfirmButton: false });
        } catch (e) {
            console.error(e);
        }
    };

    if (fetching) return <div className="p-10 flex justify-center">Loading...</div>;

    const getStatusColor = (s) => {
        switch (s) {
            case 'paid': return 'default';
            case 'sent': return 'secondary';
            case 'overdue': return 'destructive';
            case 'draft': return 'outline';
            case 'void': return 'destructive';
            default: return 'secondary';
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-semibold">
                                {isNew ? "New Invoice" : `Invoice ${invoiceNumber}`}
                            </h1>
                            {!isNew && (
                                <Badge variant={getStatusColor(status)} className="capitalize px-2 py-0.5 text-xs">
                                    {status}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Create a new invoice draft" : "Manage billing and payments"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    {!isNew && (
                        <>
                            <Button variant="outline" onClick={handleDownloadPDF} title="Download PDF">
                                <Download className="h-4 w-4 mr-2" /> PDF
                            </Button>
                            <Button variant="secondary" onClick={handleForceRecalculate} title="Recalculate Line Items">
                                <RefreshCw className="h-4 w-4 mr-2" /> Recalc
                            </Button>
                            {stripeEnabled && !stripeInvoiceId && ['draft', 'sent'].includes(status) && (
                                <Button
                                    variant="outline"
                                    className="border-purple-400 text-purple-700 hover:bg-purple-50"
                                    onClick={() => handleSendToStripe()}
                                    disabled={stripeSending}
                                >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    {stripeSending ? 'Sending...' : 'Send via Stripe'}
                                </Button>
                            )}
                            {stripeHostedUrl && (
                                <a
                                    href={stripeHostedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700"
                                >
                                    <ExternalLink className="h-4 w-4" /> Pay Now
                                </a>
                            )}
                        </>
                    )}
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : (isNew ? "Create Invoice" : "Save Changes")}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {error && (
                    <div className="p-4 mb-6 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                        {error}
                    </div>
                )}

                {stripeEmailPrompt && (
                    <div className="p-4 mb-6 bg-purple-50 border border-purple-200 rounded-md flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <CreditCard className="h-5 w-5 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-purple-800 mb-1">Customer email required</p>
                            <p className="text-xs text-purple-600 mb-2">No email found on this invoice's contact. Enter one to send via Stripe.</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    className="flex-1 h-9 px-3 text-sm border rounded-md border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    placeholder="customer@example.com"
                                    value={stripeEmail}
                                    onChange={e => setStripeEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && stripeEmail && handleSendToStripe(stripeEmail)}
                                />
                                <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    disabled={!stripeEmail || stripeSending}
                                    onClick={() => handleSendToStripe(stripeEmail)}
                                >
                                    {stripeSending ? 'Sending...' : 'Send'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setStripeEmailPrompt(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Main Settings Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Header Info */}
                        <div className="lg:col-span-2 bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Invoice Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="client">Client</Label>
                                    <Select value={clientId} onValueChange={setClientId}>
                                        <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- None --</SelectItem>
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact">Contact Person (Optional)</Label>
                                    <Select value={contactId} onValueChange={setContactId} disabled={!clientId || clientId === 'none'}>
                                        <SelectTrigger><SelectValue placeholder="Select Contact" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- None --</SelectItem>
                                            {contacts.map(c => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.first_name} {c.last_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="issue_date">Issue Date</Label>
                                    <Input id="issue_date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="sent">Sent</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="overdue">Overdue</SelectItem>
                                            <SelectItem value="void">Void</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency Code</Label>
                                    <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="notes">Notes / Terms</Label>
                                    <Textarea id="notes" placeholder="e.g. Net 30, Thank you for your business..." value={notesText} onChange={(e) => setNotesText(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Totals Summary */}
                        <div className="bg-muted p-6 rounded-lg border shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="font-medium text-lg border-b pb-2 mb-4">Summary</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="font-medium">{currency} {Number(subtotal).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tax:</span>
                                        <span className="font-medium">{currency} {Number(taxAmount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between pb-3 border-b">
                                        <span className="text-muted-foreground">Discount:</span>
                                        <Input type="number" step="0.01" className="w-24 h-8 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="flex justify-between text-base font-bold pt-2">
                                        <span>Total:</span>
                                        <span>{currency} {Number(total).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {!isNew && (
                                <div className="mt-6 pt-4 border-t space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Amount Paid:</span>
                                        <span className="text-green-600 font-medium">{currency} {Number(amountPaid).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-destructive">
                                        <span>Balance Due:</span>
                                        <span>{currency} {Number(balanceDue).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {isNew && (
                                <div className="mt-8 text-sm text-center text-muted-foreground italic">
                                    Save the invoice first to add line items and apply payments.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Line Items Section - Only available after creation */}
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

                                {newLineType === 'catalogue' ? (
                                    <div className="space-y-1 flex-1 w-full">
                                        <Label className="text-xs">Item</Label>
                                        <Select value={newLineCatalogueId} onValueChange={handleCatalogueSelect}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Select Catalogue Item" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- Select Item --</SelectItem>
                                                {catalogueItems.map(c => (
                                                    <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.sku || 'No SKU'})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-1 flex-1 w-full">
                                        <Label className="text-xs">Description</Label>
                                        <Input className="h-9" placeholder="Consulting hours..." value={newLineDesc} onChange={(e) => setNewLineDesc(e.target.value)} />
                                    </div>
                                )}

                                <div className="space-y-1 w-24">
                                    <Label className="text-xs">Price</Label>
                                    <Input className="h-9" type="number" step="0.01" value={newLinePrice} onChange={(e) => setNewLinePrice(e.target.value)} />
                                </div>
                                <div className="space-y-1 w-20">
                                    <Label className="text-xs">Qty</Label>
                                    <Input className="h-9" type="number" step="0.01" value={newLineQty} onChange={(e) => setNewLineQty(e.target.value)} />
                                </div>
                                <div className="space-y-1 w-24">
                                    <Label className="text-xs">Tax %</Label>
                                    <Input className="h-9" type="number" step="0.01" value={newLineTax} onChange={(e) => setNewLineTax(e.target.value)} />
                                </div>
                                <Button onClick={handleAddLineItem} className="h-9 mt-2 md:mt-0" disabled={(newLineType === 'catalogue' && (!newLineCatalogueId || newLineCatalogueId === 'none')) || (newLineType === 'custom' && !newLineDesc)}>
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <Table
                                    data={lineItems}
                                    columns={lineColumns}
                                    onAskDelete={handleDeleteLineItem}
                                    searchable={false}
                                />
                                {lineItems.length === 0 && (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        No items added. The invoice subtotal is zero.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payments Section - Only available after creation */}
                    {!isNew && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Payments</h3>

                            <div className="flex flex-col md:flex-row gap-2 items-start md:items-end bg-muted/30 p-4 rounded-md border">
                                <div className="space-y-1 w-full md:w-32">
                                    <Label className="text-xs">Date</Label>
                                    <Input className="h-9" type="datetime-local" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} />
                                </div>
                                <div className="space-y-1 w-full md:w-40">
                                    <Label className="text-xs">Method</Label>
                                    <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="stripe">Stripe / Card</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="check">Check</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 w-full md:w-32">
                                    <Label className="text-xs">Amount ({currency})</Label>
                                    <Input className="h-9" type="number" step="0.01" placeholder={balanceDue} value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} />
                                </div>
                                <div className="space-y-1 flex-1 w-full">
                                    <Label className="text-xs">Reference Number</Label>
                                    <Input className="h-9" placeholder="Wire #1234..." value={newPaymentRef} onChange={(e) => setNewPaymentRef(e.target.value)} />
                                </div>
                                <Button onClick={handleAddPayment} className="h-9 mt-2 md:mt-0 bg-green-600 hover:bg-green-700 text-white" disabled={!newPaymentAmount || Number(newPaymentAmount) <= 0}>
                                    <Plus className="h-4 w-4 mr-1" /> Record Payment
                                </Button>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <Table
                                    data={payments}
                                    columns={paymentColumns}
                                    onAskDelete={handleDeletePayment}
                                    searchable={false}
                                />
                                {payments.length === 0 && (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        No payments recorded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Tasks & Notes Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tasks */}
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Tasks</h3>
                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="flex flex-col gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Description</Label>
                                        <Input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder="Task description..." />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/2 space-y-1">
                                            <Label className="text-xs">Date</Label>
                                            <Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} />
                                        </div>
                                        <div className="w-full flex items-center justify-end gap-2 pt-6">
                                            <Checkbox id="new-completed" checked={newTaskCompleted} onCheckedChange={setNewTaskCompleted} />
                                            <Label htmlFor="new-completed" className="text-sm">Done</Label>
                                            <Button size="sm" onClick={addTask} disabled={!newTaskDesc}>Add</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {tasks.length === 0 ? <p className="text-sm text-muted-foreground italic">No tasks.</p> : tasks.map((task, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                                        <div className="flex items-center gap-3">
                                            <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(idx)} />
                                            <div className={task.completed ? "line-through text-muted-foreground" : ""}>
                                                <p className="text-sm font-medium">{task.task || task.description}</p>
                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <span>{task.date}</span>
                                                    {task.user_name && <span>• {task.user_name}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => removeTask(idx)} className="h-6 w-6 p-0 text-red-500">&times;</Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Notes</h3>
                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">New Note</Label>
                                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="min-h-[80px]" />
                                    <div className="flex justify-end">
                                        <Button size="sm" onClick={addNote} disabled={!newNote}>Add Note</Button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {notesList.length === 0 ? <p className="text-sm text-muted-foreground italic">No notes.</p> : notesList.slice().reverse().map((item, idx) => (
                                    <div key={idx} className="p-3 bg-muted/20 border rounded-md space-y-1">
                                        <p className="text-sm whitespace-pre-wrap">{item.note}</p>
                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                            <span>{new Date(item.date).toLocaleString()}</span>
                                            {item.user_name && <span>{item.user_name}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
