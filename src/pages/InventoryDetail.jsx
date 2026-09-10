import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    createInventoryItem, updateInventoryItem, getInventoryItemById,
    getInventoryItemAttributes
} from "../services/inventoryService";
import { getSuppliers } from "../services/supplierService";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DynamicAttributeField } from "../components/attributes/DynamicAttributeField";
import { coerceAttributeValue, emptyValueFor, normalizeOptions } from "../utils/attributeTypes";

export const InventoryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [dynamicData, setDynamicData] = useState({});
    const [suppliers, setSuppliers] = useState([]);

    // Static fields
    const [sku, setSku] = useState("");
    const [quantityOnHand, setQuantityOnHand] = useState("0.00");
    const [reorderLevel, setReorderLevel] = useState("0.00");
    const [location, setLocation] = useState("");
    const [supplierId, setSupplierId] = useState("none");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                await Promise.all([fetchAttributes(), fetchSuppliers()]);

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
            const data = await getInventoryItemAttributes();
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

    const fetchSuppliers = async () => {
        try {
            const data = await getSuppliers();
            setSuppliers(data);
        } catch (err) {
            console.error("Error fetching suppliers", err);
        }
    };

    const fetchItemData = async (itemId) => {
        try {
            const data = await getInventoryItemById(itemId);
            populateForm(data);
        } catch (err) {
            console.error("Error fetching item", err);
            setError("Failed to load inventory details.");
        }
    };

    const populateForm = (data) => {
        setSku(data.sku || "");
        setQuantityOnHand(data.quantity_on_hand || "0.00");
        setReorderLevel(data.reorder_level || "0.00");
        setLocation(data.location || "");
        setSupplierId(data.supplier ? String(data.supplier) : "none");

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
                sku,
                quantity_on_hand: quantityOnHand,
                reorder_level: reorderLevel,
                location,
                supplier: supplierId === "none" ? null : supplierId,
                attributes: formattedAttributes
            };

            if (isNew) {
                await createInventoryItem(payload);
                navigate(-1);
            } else {
                await updateInventoryItem(id, payload);
                navigate(-1);
            }

        } catch (err) {
            console.error("Error saving inventory", err);
            setError(`Failed to save inventory item. ${err.message || ""}`);
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
                            {isNew ? "New Inventory Item" : "Edit Inventory"}
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {isNew ? "Add physical stock tracking" : `Managing details for ${sku}`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Item"}
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
                                <Label htmlFor="sku">SKU Code</Label>
                                <Input id="sku" placeholder="PHYSICAL-PROD-001" value={sku} onChange={(e) => setSku(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" placeholder="Aisle 4, Bin B" value={location} onChange={(e) => setLocation(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qty">Quantity On Hand</Label>
                                <Input id="qty" type="number" step="0.01" value={quantityOnHand} onChange={(e) => setQuantityOnHand(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reorder">Reorder Level</Label>
                                <Input id="reorder" type="number" step="0.01" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier">Supplier</Label>
                                <Select value={supplierId} onValueChange={setSupplierId}>
                                    <SelectTrigger><SelectValue placeholder="Select Supplier..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- No Supplier --</SelectItem>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
