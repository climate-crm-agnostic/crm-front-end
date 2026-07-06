import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    createAsset, updateAsset, getAssetById,
    getAssetAttributes
} from "../services/assetService";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { DateInput } from "../components/ui/date-input";

export const AssetDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    // Static fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [boughtDate, setBoughtDate] = useState("");
    const [price, setPrice] = useState("0.00");
    const [quantity, setQuantity] = useState("1");

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
            const data = await getAssetAttributes();
            const processedData = data.map(attr => {
                let options = attr.options;
                if (!options && attr.list_values) {
                    try {
                        options = typeof attr.list_values === 'string'
                            ? JSON.parse(attr.list_values)
                            : attr.list_values;
                    } catch (e) {
                        options = [];
                    }
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

    const fetchItemData = async (itemId) => {
        try {
            const data = await getAssetById(itemId);
            populateForm(data);
        } catch (err) {
            console.error("Error fetching item", err);
            setError("Failed to load asset details.");
        }
    };

    const populateForm = (data) => {
        setName(data.name || "");
        setDescription(data.description || "");
        setBoughtDate(data.bought_date || "");
        setPrice(data.price || "0.00");
        setQuantity(data.quantity || "1");

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
                    if (attr.type === 'number' && formatted[attr.name]) {
                        formatted[attr.name] = Number(formatted[attr.name]);
                    }
                });
                return formatted;
            };

            const formattedAttributes = formatAttributes(dynamicData, attributes);

            const payload = {
                name,
                description,
                bought_date: boughtDate || null,
                price: price || "0.00",
                quantity: quantity || 1,
                attributes: formattedAttributes
            };

            if (isNew) {
                await createAsset(payload);
                navigate(-1);
            } else {
                await updateAsset(id, payload);
                navigate(-1);
            }

        } catch (err) {
            console.error("Error saving asset", err);
            setError(`Failed to save asset. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-10 flex justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">
                            {isNew ? "New Asset" : "Edit Asset"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Add physical equipment tracking" : `Managing details for ${name}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Asset"}
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
                                <Label htmlFor="name">Asset Name <span className="text-red-500">*</span></Label>
                                <Input id="name" placeholder="MacBook Pro 16''" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bought_date">Purchase Date</Label>
                                <DateInput id="bought_date" value={boughtDate} onChange={(e) => setBoughtDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qty">Total Stock Quantity</Label>
                                <Input id="qty" type="number" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                                <p className="text-xs text-muted-foreground mt-1">Total physical copies purchased.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Unit Price</Label>
                                <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" placeholder="Optional details, serial numbers..." value={description} onChange={(e) => setDescription(e.target.value)} />
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
                                        {attr.type === 'list' ? (
                                            <Select
                                                onValueChange={(val) => handleDynamicChange(attr.name, val)}
                                                value={dynamicData[attr.name] || ""}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={`Select ${attr.label}`} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {attr.options?.map((opt) => (
                                                        <SelectItem key={opt.value || opt} value={opt.value || opt}>
                                                            {opt.label || opt}
                                                        </SelectItem>
                                                    )) || <SelectItem value="no-options">No options available</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        ) : attr.type === 'boolean' ? (
                                            <div className="flex items-center space-x-2 h-10">
                                                <Switch
                                                    id={attr.name}
                                                    checked={!!dynamicData[attr.name]}
                                                    onCheckedChange={(checked) => handleDynamicChange(attr.name, checked)}
                                                />
                                                <Label htmlFor={attr.name} className="cursor-pointer font-normal text-muted-foreground">
                                                    {dynamicData[attr.name] ? 'Yes' : 'No'}
                                                </Label>
                                            </div>
                                        ) : attr.type === 'date' ? (
                                            <DateInput
                                                id={attr.name}
                                                value={dynamicData[attr.name] || ""}
                                                onChange={(e) => handleDynamicChange(attr.name, e.target.value)}
                                            />
                                        ) : (
                                            <Input
                                                id={attr.name}
                                                type={attr.type === 'number' ? 'number' : 'text'}
                                                placeholder={attr.label}
                                                value={dynamicData[attr.name] || ""}
                                                onChange={(e) => handleDynamicChange(attr.name, e.target.value)}
                                            />
                                        )}
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
