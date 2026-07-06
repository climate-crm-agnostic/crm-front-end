import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    createCatalogueItem, updateCatalogueItem, getCatalogueItemById,
    getCatalogueItemAttributes, uploadCatalogueItemImage,
    getPriceTiers, createPriceTier, deletePriceTier
} from "../services/catalogueService";
import { getCategories } from "../services/categoryService";
import { getInventoryItems } from "../services/inventoryService";
import { Table } from "../components/Table";
import Swal from "sweetalert2";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, Plus } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { DateInput } from "../components/ui/date-input";

export const CatalogueitemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    // Static fields
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("service");
    const [basePrice, setBasePrice] = useState("0.00");
    const [currency, setCurrency] = useState("USD");
    const [unit, setUnit] = useState("unit");
    const [taxRate, setTaxRate] = useState("0.00");
    const [isActive, setIsActive] = useState(true);
    const [categoryId, setCategoryId] = useState("");
    const [inventoryId, setInventoryId] = useState("");
    const [inventoryItems, setInventoryItems] = useState([]);

    // Files
    const [images, setImages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Price Tiers
    const [priceTiers, setPriceTiers] = useState([]);
    const [newTierName, setNewTierName] = useState("");
    const [newTierQty, setNewTierQty] = useState("");
    const [newTierPrice, setNewTierPrice] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                await Promise.all([fetchAttributes(), fetchCategories(), fetchInventory()]);

                if (!isNew) {
                    await fetchItemData(id);
                    await fetchTiers(id);
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
            const data = await getCatalogueItemAttributes();
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

    const fetchCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            console.error("Error fetching categories", err);
        }
    };

    const fetchInventory = async () => {
        try {
            const data = await getInventoryItems();
            setInventoryItems(data);
        } catch (err) {
            console.error("Error fetching inventory", err);
        }
    };

    const fetchItemData = async (itemId) => {
        try {
            const data = await getCatalogueItemById(itemId);
            populateForm(data);
        } catch (err) {
            console.error("Error fetching item", err);
            setError("Failed to load item details.");
        }
    };

    const fetchTiers = async (itemId) => {
        try {
            const data = await getPriceTiers(itemId);
            setPriceTiers(data);
        } catch (err) {
            console.error("Error fetching price tiers", err);
        }
    };

    const populateForm = (data) => {
        setName(data.name || "");
        setSku(data.sku || "");
        setDescription(data.description || "");
        setType(data.type || "service");
        setBasePrice(data.base_price || "0.00");
        setCurrency(data.currency || "USD");
        setUnit(data.unit || "unit");
        setTaxRate(data.tax_rate || "0.00");
        setIsActive(data.is_active !== undefined ? data.is_active : true);
        setCategoryId(data.category ? (typeof data.category === 'object' ? String(data.category.id) : String(data.category)) : "none");
        setInventoryId(data.inventory ? (typeof data.inventory === 'object' ? String(data.inventory.id) : String(data.inventory)) : "none");

        setImages(data.list_of_images || []);

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

    // --- File Management ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || isNew) return;
        setUploading(true);
        try {
            const res = await uploadCatalogueItemImage(id, selectedFile);
            setImages(res.list_of_images || []);
            setSelectedFile(null);
            const fileInput = document.getElementById("file-upload");
            if (fileInput) fileInput.value = "";
        } catch (err) {
            setError(`Failed to upload image. ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // --- Price Tier Management ---
    const handleAddTier = async () => {
        if (!newTierName || !newTierQty || !newTierPrice) return;

        const payload = {
            catalogue_item: id,
            name: newTierName,
            min_quantity: parseInt(newTierQty),
            price: newTierPrice,
            attributes: {}
        };

        try {
            await createPriceTier(id, payload);
            setNewTierName("");
            setNewTierQty("");
            setNewTierPrice("");
            fetchTiers(id);
        } catch (err) {
            console.error("Error adding tier", err);
            setError("Failed to add price tier.");
        }
    };

    const handleDeleteTier = async (tier) => {
        const result = await Swal.fire({
            title: 'Delete Tier?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deletePriceTier(id, tier.id);
                fetchTiers(id);
                Swal.fire('Deleted!', 'Tier has been deleted.', 'success');
            } catch (error) {
                console.error("Error deleting tier", error);
                Swal.fire('Error!', 'Failed to delete tier.', 'error');
            }
        }
    };

    const tierColumns = [
        { key: "name", label: "Tier Name" },
        { key: "min_quantity", label: "Min Quantity" },
        {
            key: "price",
            label: "Price",
            render: (value) => `${currency} ${Number(value).toFixed(2)}`
        }
    ];

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
                sku,
                description,
                type,
                base_price: basePrice,
                currency,
                unit,
                tax_rate: taxRate,
                is_active: isActive,
                category: categoryId === "none" ? null : categoryId,
                inventory: inventoryId === "none" ? null : inventoryId,
                attributes: formattedAttributes
            };

            if (isNew) {
                const newItem = await createCatalogueItem(payload);
                if (selectedFile && newItem && newItem.id) {
                    await uploadCatalogueItemImage(newItem.id, selectedFile);
                }
                navigate(-1);
            } else {
                await updateCatalogueItem(id, payload);
                if (selectedFile) {
                    await uploadCatalogueItemImage(id, selectedFile);
                }
                navigate(-1);
            }

        } catch (err) {
            console.error("Error saving item", err);
            setError(`Failed to save catalogue item. ${err.message || ""}`);
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
                            {isNew ? "New Catalogue Item" : "Edit Item"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Add a new product, service, or subscription" : `Managing details for ${name}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || uploading}>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" placeholder="Web Development" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU Code</Label>
                                <Input id="sku" placeholder="DEV-001" value={sku} onChange={(e) => setSku(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="product">Product</SelectItem>
                                        <SelectItem value="service">Service</SelectItem>
                                        <SelectItem value="subscription">Subscription</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Uncategorized --</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="inventory">Linked Inventory</Label>
                                <Select value={inventoryId} onValueChange={setInventoryId}>
                                    <SelectTrigger><SelectValue placeholder="Link to Inventory..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- No Inventory Link --</SelectItem>
                                        {inventoryItems.map(inv => (
                                            <SelectItem key={inv.id} value={String(inv.id)}>{inv.sku}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex flex-col justify-end pb-2">
                                <div className="flex items-center space-x-2">
                                    <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
                                    <Label htmlFor="is_active">Active (Available for sale)</Label>
                                </div>
                            </div>

                            <div className="space-y-2 col-span-full">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Pricing & Taxation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="base_price">Base Price</Label>
                                <Input id="base_price" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit (e.g. hour, item)</Label>
                                <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                                <Input id="tax_rate" type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Price Tiers List - Only show if not new */}
                    {!isNew && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Volume Price Tiers</h3>

                            <div className="flex gap-2 items-end bg-muted/30 p-4 rounded-md border">
                                <div className="space-y-1 flex-1">
                                    <Label className="text-xs">Tier Name</Label>
                                    <Input placeholder="e.g. Wholesale" value={newTierName} onChange={(e) => setNewTierName(e.target.value)} />
                                </div>
                                <div className="space-y-1 w-32">
                                    <Label className="text-xs">Min Quantity</Label>
                                    <Input type="number" placeholder="10" value={newTierQty} onChange={(e) => setNewTierQty(e.target.value)} />
                                </div>
                                <div className="space-y-1 w-32">
                                    <Label className="text-xs">Override Price</Label>
                                    <Input type="number" step="0.01" placeholder="90.00" value={newTierPrice} onChange={(e) => setNewTierPrice(e.target.value)} />
                                </div>
                                <Button onClick={handleAddTier} disabled={!newTierName || !newTierQty || !newTierPrice}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Tier
                                </Button>
                            </div>

                            <div className="border rounded-md">
                                <Table
                                    data={priceTiers}
                                    columns={tierColumns}
                                    onAskDelete={handleDeleteTier}
                                    searchable={false}
                                />
                                {priceTiers.length === 0 && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No price tiers defined. Uses base price for all quantities.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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

                    {/* Files & Images */}
                    {!isNew && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Item Images</h3>
                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {images.map((imgUrl, idx) => (
                                        <div key={idx} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden border">
                                            <img src={imgUrl} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground italic">No images.</p>}

                            <div className="flex items-end gap-4 max-w-md">
                                <div className="w-full space-y-2">
                                    <Label>Upload New Image</Label>
                                    <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} />
                                </div>
                                <Button type="button" onClick={handleUpload} disabled={!selectedFile || uploading} variant="secondary">
                                    {uploading ? "..." : "Upload"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
