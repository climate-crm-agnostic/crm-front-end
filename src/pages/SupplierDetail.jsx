import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    createSupplier, updateSupplier, getSupplierById,
    getSupplierAttributes
} from "../services/supplierService";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { DynamicAttributeField } from "../components/attributes/DynamicAttributeField";
import { coerceAttributeValue, emptyValueFor, normalizeOptions } from "../utils/attributeTypes";

export const SupplierDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    // Static fields
    const [name, setName] = useState("");
    const [legalName, setLegalName] = useState("");
    const [taxId, setTaxId] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [website, setWebsite] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [isActive, setIsActive] = useState(true);
    const [notes, setNotes] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                await fetchAttributes();

                if (!isNew) {
                    await fetchItemData(id);
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

    const fetchAttributes = async () => {
        try {
            const data = await getSupplierAttributes();
            const processedData = data.map(attr => {
                const options = normalizeOptions(attr.options || attr.list_values);
                return { ...attr, options };
            });
            setAttributes(processedData);

            const initialDynamic = {};
            processedData.forEach(attr => {
                initialDynamic[attr.name] = emptyValueFor(attr);
            });
            setDynamicData(initialDynamic);
        } catch (err) {
            console.error("Error fetching attributes", err);
        }
    };

    const fetchItemData = async (itemId) => {
        try {
            const data = await getSupplierById(itemId);
            populateForm(data);
        } catch (err) {
            console.error("Error fetching item", err);
            setError("Failed to load supplier details.");
        }
    };

    const populateForm = (data) => {
        setName(data.name || "");
        setLegalName(data.legal_name || "");
        setTaxId(data.tax_id || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setWebsite(data.website || "");
        setPaymentTerms(data.payment_terms ?? "");
        setCurrency(data.currency || "USD");
        setIsActive(data.is_active !== false);
        setNotes(data.notes || "");

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

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const formatAttributes = (data, attrs) => {
                const formatted = { ...data };
                attrs.forEach(attr => {
                    formatted[attr.name] = coerceAttributeValue(attr, formatted[attr.name]);
                });
                return formatted;
            };

            const formattedAttributes = formatAttributes(dynamicData, attributes);

            const payload = {
                name,
                legal_name: legalName || null,
                tax_id: taxId || null,
                email: email || null,
                phone: phone || null,
                address: address || null,
                website: website || null,
                payment_terms: paymentTerms === "" ? null : paymentTerms,
                currency,
                is_active: isActive,
                notes: notes || null,
                attributes: formattedAttributes
            };

            if (isNew) {
                await createSupplier(payload);
                navigate(-1);
            } else {
                await updateSupplier(id, payload);
                navigate(-1);
            }

        } catch (err) {
            console.error("Error saving supplier", err);
            setError(`Failed to save supplier. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-10 flex justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold truncate">
                            {isNew ? "New Supplier" : "Edit Supplier"}
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {isNew ? "Add a vendor your company buys from" : `Managing details for ${name}`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Supplier"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {error && (
                    <div className="p-4 mb-6 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Main Info */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Supplier Name <span className="text-red-500">*</span></Label>
                                <Input id="name" placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_name">Legal Name</Label>
                                <Input id="legal_name" placeholder="Acme Corporation Inc." value={legalName} onChange={(e) => setLegalName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tax_id">Tax ID</Label>
                                <Input id="tax_id" placeholder="3-101-123456" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="orders@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" placeholder="+1 555-123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input id="website" type="url" placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" placeholder="123 Main St, San José" value={address} onChange={(e) => setAddress(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment_terms">Payment Terms (days)</Label>
                                <Input id="payment_terms" type="number" step="1" placeholder="30" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input id="currency" placeholder="USD" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
                            </div>
                            <div className="space-y-2 flex flex-col justify-end pb-2">
                                <div className="flex items-center space-x-2">
                                    <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
                                    <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea id="notes" placeholder="Optional details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Attributes */}
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
                                            onChange={(val) => handleDynamicChange(attr.name, val)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
