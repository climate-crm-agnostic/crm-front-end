import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    createAssetAssignment, updateAssetAssignment, getAssetAssignmentById,
    getAssetAssignmentAttributes
} from "../services/assetAssignmentService";
import { getAssets } from "../services/assetService";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { DateInput } from "../components/ui/date-input";

export const AssetAssignmentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [attributes, setAttributes] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

    // Available assets for selection
    const [assets, setAssets] = useState([]);

    // Static fields
    const [assetId, setAssetId] = useState("");
    const [borrowDate, setBorrowDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [lendingAmount, setLendingAmount] = useState("1");
    const [borrowerName, setBorrowerName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [stateLocation, setStateLocation] = useState("");
    const [country, setCountry] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                const [attrsData, assetsData] = await Promise.all([
                    getAssetAssignmentAttributes(),
                    getAssets()
                ]);

                // Process Attributes
                const processedData = attrsData.map(attr => {
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

                // Set Assets
                setAssets(assetsData);

                // Default borrow date for new
                if (isNew) {
                    setBorrowDate(new Date().toISOString().split('T')[0]);
                } else {
                    await fetchItemData(id, processedData);
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

    const fetchItemData = async (itemId, attrs) => {
        try {
            const data = await getAssetAssignmentById(itemId);
            populateForm(data, attrs);
        } catch (err) {
            console.error("Error fetching assignment", err);
            setError("Failed to load assignment details.");
        }
    };

    const populateForm = (data, attrs) => {
        setAssetId(data.asset?.id || data.asset || "");
        setBorrowDate(data.borrow_date || "");
        setReturnDate(data.return_date || "");
        setLendingAmount(data.lending_amount || "1");
        setBorrowerName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setStateLocation(data.state || "");
        setCountry(data.country || "");

        setDynamicData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
                let val = data[key] !== undefined ? data[key] : (data.attributes?.[key]);
                if (val === undefined || val === null) {
                    const attrDef = attrs.find(a => a.name === key);
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
        if (!assetId) {
            setError("An asset must be selected.");
            return;
        }

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
                asset: assetId,
                borrow_date: borrowDate || null,
                return_date: returnDate || null,
                lending_amount: lendingAmount || 1,
                name: borrowerName,
                email,
                phone,
                address,
                state: stateLocation,
                country,
                attributes: formattedAttributes
            };

            if (isNew) {
                await createAssetAssignment(payload);
                navigate(-1);
            } else {
                await updateAssetAssignment(id, payload);
                navigate(-1);
            }

        } catch (err) {
            console.error("Error saving assignment", err);
            setError(`Failed to save asset assignment. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkReturned = () => {
        setReturnDate(new Date().toISOString().split('T')[0]);
    };

    if (fetching) return <div className="p-10 flex justify-center">Loading...</div>;

    // Filter to only show assets that have stock left or current asset to prevent unselection
    const availableAssets = assets.filter(a => a.quantity > 0 || a.id === assetId);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">
                            {isNew ? "New Asset Assignment" : "Edit Assignment"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Loan out equipment to personnel" : `Managing loan details`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Assignment"}
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
                    {/* Return Action Panel (Only show in edit mode if not returned) */}
                    {!isNew && !returnDate && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-5 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-amber-800 dark:text-amber-500">Asset is currently out</h4>
                                <p className="text-sm text-amber-700/80 dark:text-amber-500/80">Marking it returned will restore the system quantity automatically.</p>
                            </div>
                            <Button variant="outline" className="border-amber-300 hover:bg-amber-100" onClick={handleMarkReturned}>
                                Mark as Returned
                            </Button>
                        </div>
                    )}

                    {/* Return Info Box */}
                    {!isNew && returnDate && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-5 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-emerald-800 dark:text-emerald-500">Asset has been returned</h4>
                                <p className="text-sm text-emerald-700/80 dark:text-emerald-500/80">Returned on: {returnDate}</p>
                            </div>
                        </div>
                    )}

                    {/* Main Info */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="asset">Asset to Loan <span className="text-red-500">*</span></Label>
                                <Select onValueChange={setAssetId} value={assetId} disabled={!isNew}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select an available asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableAssets.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name} ({a.quantity} left in stock)
                                            </SelectItem>
                                        ))}
                                        {availableAssets.length === 0 && <SelectItem value="none" disabled>No assets available</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="borrow_date">Borrow Date <span className="text-red-500">*</span></Label>
                                <DateInput id="borrow_date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="return_date">Return Date</Label>
                                <DateInput id="return_date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="amount">Lending Amount</Label>
                                <Input id="amount" type="number" step="1" min="1" value={lendingAmount} onChange={(e) => setLendingAmount(e.target.value)} disabled={!isNew} />
                            </div>

                            <div className="space-y-2 md:mt-4 md:col-span-2 border-t pt-4">
                                <h4 className="font-medium text-sm text-muted-foreground pb-2 uppercase tracking-tight">Borrower Information</h4>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="borrower_name">Full Name <span className="text-red-500">*</span></Label>
                                <Input id="borrower_name" placeholder="John Doe" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="john@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" placeholder="+1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State/Region</Label>
                                <Input id="state" placeholder="California" value={stateLocation} onChange={(e) => setStateLocation(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" placeholder="USA" value={country} onChange={(e) => setCountry(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Attributes */}
                    {attributes.length > 0 && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Additional Specifications</h3>
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
