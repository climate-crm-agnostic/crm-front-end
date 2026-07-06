import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createCategory, updateCategory, getCategoryById, getCategoryAttributes, getCategories } from "../services/categoryService";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { DateInput } from "../components/ui/date-input";

export const CategoryDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    // Static fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [parentId, setParentId] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                await Promise.all([fetchAttributes(), fetchCategories()]);

                if (!isNew) {
                    await fetchCategoryData(id);
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
            const data = await getCategoryAttributes();
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
            // Don't allow a category to be its own parent
            setCategories(data.filter(c => c.id !== id));
        } catch (err) {
            console.error("Error fetching categories", err);
        }
    };

    const fetchCategoryData = async (categoryId) => {
        try {
            const data = await getCategoryById(categoryId);
            populateForm(data);
        } catch (err) {
            console.error("Error fetching category", err);
            setError("Failed to load category details.");
        }
    };

    const populateForm = (data) => {
        setName(data.name || "");
        setDescription(data.description || "");
        setParentId(data.parent ? (typeof data.parent === 'object' ? String(data.parent.id) : String(data.parent)) : "none");

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
                parent: parentId === "none" ? null : parentId,
                attributes: formattedAttributes
            };

            if (isNew) {
                await createCategory(payload);
                navigate(-1);
            } else {
                await updateCategory(id, payload);
                navigate(-1);
            }

        } catch (err) {
            console.error("Error saving category", err);
            setError(`Failed to save category. ${err.message || ""}`);
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
                            {isNew ? "New Category" : "Edit Category"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Add a new catalogue category" : `Managing details for ${name}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Category"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
                {error && (
                    <div className="p-4 mb-6 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Main Info */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Category Name</Label>
                                <Input id="name" placeholder="Software" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="parent">Parent Category</Label>
                                <Select value={parentId} onValueChange={setParentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Parent Category (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None (Root Category) --</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" placeholder="Short description of this category..." value={description} onChange={(e) => setDescription(e.target.value)} />
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
