import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Info, Plus, Filter, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getWebhook, createWebhook, updateWebhook, deleteWebhook } from "@/services/webhookService";
import { getAttributes } from "@/services/attributeService";
import Swal from 'sweetalert2';
import { KeyValueEditor } from "@/components/webhook/KeyValueEditor";

export const WebhookDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isNew = id === "new";
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        model: searchParams.get("model") || "Lead",
        event: "UPDATE",
        url: "",
        method: "POST",
        headers: "{}",
        is_active: true,
        conditions: [],
        condition_logic: "AND"
    });

    const [availableAttributes, setAvailableAttributes] = useState([]);

    // Postman-style state
    const [queryParams, setQueryParams] = useState([]);
    const [headerParams, setHeaderParams] = useState([]);
    const [bodyParams, setBodyParams] = useState([]); // Custom JSON body editor state
    // Wait, the webhook system sends the SERIALIZED OBJECT. User can't usually customize the body structure unless we add that feature. 
    // The current 'Request Configuration' only showed URL + Method + Headers. 
    // The user request said "section for params, headers and body just those 3".
    // If the system currently forces the body to be the object, then "Body" tab might be read-only or allow custom JSON payload if supported.
    // Looking at original code: "Request Configuration... Configure the HTTP request... Template Substitution...". 
    // It doesn't seem to allow body customization in the original code, only URL and Headers. 
    // However, the user explicitly asked for "section for params, headers and body". 
    // I will add a Body tab. If the backend doesn't support custom body yet, maybe it's just a placeholder or I should treat it as 'Additional Payload' merge?
    // Use Case: Maybe they want to send a fixed JSON body? 
    // For now, I'll assume they want to be able to define a custom body template OR just see that it sends the object.
    // Let's check `createWebhook` payload. It just takes `url`, `method`, `headers`. No body field. The backend likely sends the object.
    // BUT, maybe they mean "URL Params", "Headers", and "Body" (where Body is just a view or maybe they want to add static data?).
    // Providing a "Body" tab that says "The payload will be the JSON representation of the {Model}" is safe.
    // OR, I can add a `body_template` field to formData if I want to support it, but I shouldn't change backend schema without permission.
    // I will add the Body tab but make it clear it's the model data, or maybe allow them to add extra JSON if the backend supports mixing?
    // Safest bet: The user said "section for params, headers and body". I'll add the Body tab. It might be empty or show "Standard Payload".
    // Wait, if I look at the "Template Substitution" hint in original code: "You can use {field_name} placeholders in URL and Headers."
    // It implies Body is not customizable.
    // I will implement a Body tab that allows "Custom JSON" but knowing it might not be used yet, or better, 
    // I will assume for this task I should just show the Body tab as requested, maybe with a note or just no op if not supported.
    // Actually, I'll stick to URL Params and Headers being the main editable things. 
    // I'll add a Body tab that is a Textarea, maybe for `custom_body` if I were to add it?
    // Let's look at the instruction again: "Here we need a section to add curly parameters... section for params, headers and body".
    // I will add a dummy Body tab or one that edits `formData.body` (if I add it to state), but since I can't change backend, I might just leave it as a "Payload Preview" or similar?
    // Let's stick to what is there: URL (Params) and Headers. I will add a Body tab but maybe just put a message "The body will contain the JSON data of the event" or similar, 
    // UNLESS the user implies they want to CUSTOMIZE the body. "the values should display the attributes based on the entity".
    // I will treat it as if they might want to send a custom body. I'll add `body` to local state, but if it's not saved to backend it won't persist.
    // I'll check `getWebhook` response structure in original code... it had `...data` spread.
    // I will just add the UI for now.

    // Actually, I'll allow editing a "Custom Body" but since I don't know if backend accepts it, I'll just add it to the logical UI and maybe warning if it's not saved?
    // No, better: The user wants to SEE the curly params and use them.
    // I will implement Params (Query Strings), Headers, and Body (maybe just for visual consistency or read-only).
    // Let's assume Body is not editable for now unless I see a field. I'll make Body tab show "Standard JSON Payload" message or similar.

    useEffect(() => {
        const fetchAttributes = async () => {
            if (!formData.model) return;
            try {
                // Map model name to entity name expected by API (lowercase)
                const entityMap = {
                    'Lead': 'lead',
                    'Client': 'client',
                    'Service': 'service',
                    'FollowUp': 'followup'
                };
                const entity = entityMap[formData.model];
                if (entity) {
                    const attrs = await getAttributes(entity);
                    const standardFields = {
                        'Lead': ['name', 'stage', 'source', 'lost_reason', 'possible_client', 'responsible', 'pipeline'],
                        'Client': ['name'],
                        'Service': ['name'],
                        'FollowUp': ['follow_up_date', 'comment']
                    };

                    const attrOptions = (attrs || []).map(a => `self.attributes.${a.name}`);
                    let stdOptions = (standardFields[formData.model] || []).map(f => `self.${f}`);

                    // Fetch extra attributes for Lead
                    if (formData.model === 'Lead') {
                        try {
                            const [clientAttrs, serviceAttrs] = await Promise.all([
                                getAttributes('lead_client_info'),
                                getAttributes('lead_service_info')
                            ]);

                            const clientOptions = (clientAttrs || []).map(a => `self.client_attributes.${a.name}`);
                            const serviceOptions = (serviceAttrs || []).map(a => `self.service_attributes.${a.name}`); // Note: service_attributes is a list in model, but for params sometimes we want the key. 
                            // However, since service_attributes is a list of objects, accessing `self.service_attributes.Price` might imply the Price of the *first* service or mapping logic.
                            // But usually template substitution handles lists poorly unless it's a specific syntax. 
                            // Given the user request "detail of those attributes", providing the keys is the best we can do for now.

                            stdOptions = [...stdOptions, ...clientOptions, ...serviceOptions];

                        } catch (err) {
                            console.error("Failed to fetch extra lead attributes", err);
                        }
                    }

                    // Combine and dedupe
                    const unique = [...new Set([...stdOptions, ...attrOptions])];
                    setAvailableAttributes(unique);
                }
            } catch (error) {
                console.error("Failed to fetch attributes", error);
            }
        };
        fetchAttributes();
    }, [formData.model]);

    useEffect(() => {
        if (!isNew) {
            loadWebhook();
        } else {
            // For new webhooks, init params from empty URL
            // If url has something ??
        }
    }, [id]);

    const loadWebhook = async () => {
        try {
            const data = await getWebhook(id);
            setFormData({
                ...data,
                headers: typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers, null, 2),
            });
            // Init Headers
            try {
                const headersObj = typeof data.headers === 'string' ? JSON.parse(data.headers) : data.headers;
                const headerPairs = Object.entries(headersObj || {}).map(([key, value]) => ({
                    key, value: String(value), active: true
                }));
                setHeaderParams(headerPairs);
            } catch (e) {
                console.error("Failed to parse headers", e);
                setHeaderParams([]);
            }

            // Init Body Params (Payload)
            if (data.payload && typeof data.payload === 'object') {
                const bodyPairs = Object.entries(data.payload).map(([key, value]) => ({
                    key, value: typeof value === 'string' ? value : JSON.stringify(value), active: true
                }));
                setBodyParams(bodyPairs);
            } else {
                setBodyParams([]);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load webhook details',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            navigate("/webhook");
        } finally {
            setLoading(false);
        }
    };

    // Sync URL to Query Params
    useEffect(() => {
        try {
            // Only if URL is valid-ish
            if (!formData.url) {
                if (queryParams.length > 0) setQueryParams([]);
                return;
            }

            // We use a dummy base to parse relative URLs if needed, though webhooks usually absolute
            const urlObj = new URL(formData.url, "http://dummy.com");
            const params = [];
            urlObj.searchParams.forEach((value, key) => {
                params.push({ key, value, active: true });
            });

            // We only update if length differs or content differs to avoid loop? 
            // Actually, we should only update from URL if the URL *changed outside of param editing*?
            // This is hard to detect. 
            // Simplified approach: Two-way binding. 
            // To prevent cursor jumping, we usually separate "Internal Edit" from "External Update".
            // Since we don't have a complex store, let's just parse.
            // BUT, if I type fast in URL, this runs. If I type in Params, the inverse runs.
            // I'll try to rely on the fact that they render different things.

            // Actually, let's just parse initially or when loaded?
            // If I type in URL bar, params table should update. 

            const currentParamsStr = JSON.stringify(queryParams.map(p => `${p.key}=${p.value}`));
            const newParamsStr = JSON.stringify(params.map(p => `${p.key}=${p.value}`));

            if (currentParamsStr !== newParamsStr) {
                // If the URL has NO params but we have some empty rows? 
                // We shouldn't clear empty rows if user is typing?
                // This is tricky. Let's ONLY update params from URL if the user is editing the URL input.
                // We can't know that here easily.
                // Better strategy: "URL" is the source of truth for the Input. 
                // "Params" state is source of truth for the Table.
                // We sync them on BLUR or Debounce?
                // Or:
                // We update `queryParams` ONLY when `formData.url` changes AND it wasn't triggered by `queryParams` change.
                setQueryParams(params);
            }
        } catch (e) {
            // Invalid URL, maybe user is typing
        }
    }, [formData.url]);

    const updateUrlFromParams = (newParams) => {
        try {
            const currentUrl = formData.url || "";
            // separate base from search
            const [base] = currentUrl.split('?');

            if (newParams.length === 0) {
                if (currentUrl.includes('?')) handleChange("url", base);
                return;
            }

            const qs = new URLSearchParams();
            newParams.forEach(p => {
                if (p.key && p.active) qs.append(p.key, p.value);
            });
            const qsStr = qs.toString();
            // Decode curly braces for backend format string compatibility
            const newUrl = qsStr ? `${base}?${qsStr}`.replace(/%7B/g, '{').replace(/%7D/g, '}') : base;

            if (newUrl !== currentUrl) {
                // We update URL but we need to signal that this update SHOULD NOT re-trigger param parsing if possible?
                // Actually if newUrl is exactly what params represent, re-parsing produces same params, so no loop (useEffect check handles it).
                handleChange("url", newUrl);
            }
        } catch (e) { console.error(e) }
    };

    // Sync Headers
    useEffect(() => {
        // Headers change in formData -> update Table
        // But headers in formData is string. 
        try {
            const headersObj = JSON.parse(formData.headers || "{}");
            // Compare with current headerParams
            // This is also loop-prone.
            // Let's assume headerParams is the driver when using the UI. 
            // We only parse if we loaded data or externally changed it?
            // Actually, we can just sync one way: Table -> JSON. 
            // Parsing JSON -> Table only on text blur?
            // Let's leave it manual or loose.
            // I'll parse on init (loadWebhook) and that's it unless we add a "Raw" view.
        } catch (e) { }
    }, []); // Empty dep array? No, strict sync is hard. 
    // Let's rely on init. And if user edits Textarea in Raw mode?
    // I'll just update headers JSON when Table changes. 
    // And update Table if JSON changes? 
    // Let's stick to Table -> JSON primarily.

    const handleHeaderParamsChange = (newParams) => {
        setHeaderParams(newParams);
        const obj = {};
        newParams.forEach(p => {
            if (p.key && p.active) obj[p.key] = p.value;
        });
        handleChange("headers", JSON.stringify(obj, null, 2));
    }

    const handleQueryParamsChange = (newParams) => {
        setQueryParams(newParams);
        updateUrlFromParams(newParams);
    }

    const handleBodyParamsChange = (newParams) => {
        setBodyParams(newParams);
        // We don't construct the final body string here immediately since we construct it on save,
        // or we could keep a synced JSON string in formData.body if backend supported it.
        // For now, local state drives the preview and save.
    }

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleModelChange = async (newModel) => {
        if (newModel === formData.model) return;

        const result = await Swal.fire({
            title: 'Change Data Model?',
            text: "Changing the model will clear existing conditions. Are you sure?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, change it!'
        });

        if (result.isConfirmed) {
            setFormData(prev => ({
                ...prev,
                model: newModel,
                conditions: []
            }));
        }
    };

    // Helper to insert into focused inputs?
    // The KeyValueEditor handles its own insertions.
    // Body needs insertion.



    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: `${text} copied to clipboard`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });
    };

    const handleAddCondition = () => {
        setFormData(prev => ({
            ...prev,
            conditions: [...(prev.conditions || []), { field: '', operator: '=', value: '' }]
        }));
    };

    const handleRemoveCondition = (index) => {
        setFormData(prev => ({
            ...prev,
            conditions: prev.conditions.filter((_, i) => i !== index)
        }));
    };

    const handleConditionChange = (index, field, value) => {
        setFormData(prev => {
            const newConditions = [...prev.conditions];
            newConditions[index] = { ...newConditions[index], [field]: value };
            return { ...prev, conditions: newConditions };
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            let parsedHeaders = {};
            try {
                parsedHeaders = JSON.parse(formData.headers);
            } catch (e) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid JSON',
                    text: 'Please check your Headers JSON',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                setSaving(false);
                return;
            }

            // Construct payload from bodyParams
            // Only include if there are active keys, otherwise send null/omitted? 
            // The doc implies optional. If we send empty object, it might be treated as empty body.
            // Let's send it if bodyParams has active items.
            let customPayload = null;
            const activeBodyParams = bodyParams.filter(p => p.key && p.active);

            if (activeBodyParams.length > 0) {
                customPayload = activeBodyParams.reduce((acc, curr) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {});
            }

            const payload = {
                ...formData,
                headers: parsedHeaders,
                payload: customPayload // Send null if empty to possibly trigger default behavior, or backend might expect specific handling
            };

            // If backend expects the field to be absent for default behavior, we might need to delete it if null?
            // "If payload is defined, it will be used... Otherwise full object".
            // So if we send null, is it "defined"? JSON null is defined.
            // Let's assume sending it only if not null is safer OR backend handles null.
            // Given "Optional: Custom body template", omitting it is safest if empty.
            if (!customPayload) {
                delete payload.payload;
            }

            if (isNew) {
                await createWebhook(payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Created!',
                    text: 'Webhook created successfully',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                await updateWebhook(id, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Webhook updated successfully',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
            navigate("/webhook");
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save webhook',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (!result.isConfirmed) return;

        try {
            await deleteWebhook(id);
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Webhook has been deleted',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            navigate("/webhook");
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to delete webhook',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/webhook")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isNew ? "New Webhook" : "Edit Webhook"}
                        </h1>
                        <p className="text-muted-foreground mr-2">
                            Configure how your webhook requests are sent.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Webhook"}
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Top Settings Bar */}
                <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label htmlFor="name">Friendly Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. New Lead Notification"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        </div>
                        <div className="w-[200px] space-y-2">
                            <Label>Data Model</Label>
                            <Select
                                value={formData.model}
                                onValueChange={handleModelChange}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                    <SelectItem value="Client">Client</SelectItem>
                                    <SelectItem value="Service">Service</SelectItem>
                                    <SelectItem value="FollowUp">FollowUp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[150px] space-y-2">
                            <Label>Trigger Event</Label>
                            <Select
                                value={formData.event}
                                onValueChange={(val) => handleChange("event", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CREATE">On Create</SelectItem>
                                    <SelectItem value="UPDATE">On Update</SelectItem>
                                    <SelectItem value="DELETE">On Delete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center pb-2.5 space-x-2">
                            <Checkbox
                                id="active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => handleChange("is_active", checked)}
                            />
                            <Label htmlFor="active" className="cursor-pointer">
                                Enable
                            </Label>
                        </div>
                    </div>
                </Card>

                {/* Main Editor Area */}
                <div className="space-y-6">
                    {/* URL Bar */}
                    <Card className="p-4 flex gap-2 items-center bg-slate-50 dark:bg-slate-900/50">
                        <Select
                            value={formData.method}
                            onValueChange={(val) => handleChange("method", val)}
                        >
                            <SelectTrigger className="w-[100px] font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="PATCH">PATCH</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                                <SelectItem value="GET">GET</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            className="font-mono flex-1 bg-background"
                            placeholder="Enter request URL"
                            value={formData.url}
                            onChange={(e) => handleChange("url", e.target.value)}
                        />

                    </Card>

                    {/* Tabs Area */}
                    <Tabs defaultValue="params" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                            <TabsTrigger value="params" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                                Params
                                {queryParams.length > 0 && <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">{queryParams.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="headers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                                Headers
                                {headerParams.length > 0 && <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">{headerParams.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="body" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                                Body
                            </TabsTrigger>
                            <TabsTrigger value="conditions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                                Conditions
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-4">
                            <TabsContent value="params">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Query Parameters</CardTitle>
                                        <CardDescription className="text-xs">
                                            These parameters will be appended to the URL.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <KeyValueEditor
                                            pairs={queryParams}
                                            onChange={handleQueryParamsChange}
                                            availableAttributes={availableAttributes}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="headers">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Request Headers</CardTitle>
                                        <CardDescription className="text-xs">
                                            Manage your HTTP headers.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <KeyValueEditor
                                            pairs={headerParams}
                                            onChange={handleHeaderParamsChange}
                                            availableAttributes={availableAttributes}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="body">
                                <Card>
                                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm">Request Body</CardTitle>
                                            <CardDescription className="text-xs">
                                                Define custom JSON properties. Leave empty to use standard payload.
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <KeyValueEditor
                                            pairs={bodyParams}
                                            onChange={handleBodyParamsChange}
                                            availableAttributes={availableAttributes}
                                        />

                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground">JSON Preview</Label>
                                            <div className="bg-slate-950 text-slate-50 p-4 rounded-md text-xs font-mono overflow-x-auto">
                                                <pre>{JSON.stringify(bodyParams.reduce((acc, curr) => {
                                                    if (curr.key && curr.active) acc[curr.key] = curr.value;
                                                    return acc;
                                                }, {}), null, 2)}</pre>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="conditions">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Conditional Logic</CardTitle>
                                        <CardDescription className="text-xs">
                                            Filter when this webhook triggers.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border">
                                            <Label className="whitespace-nowrap">Logic:</Label>
                                            <Select
                                                value={formData.condition_logic}
                                                onValueChange={(val) => handleChange("condition_logic", val)}
                                            >
                                                <SelectTrigger className="w-32">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="AND">Match ALL</SelectItem>
                                                    <SelectItem value="OR">Match ANY</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            {(formData.conditions || []).map((condition, index) => (
                                                <div key={index} className="flex gap-2 items-start">
                                                    <div className="flex-1">
                                                        <Select
                                                            value={condition.field}
                                                            onValueChange={(val) => handleConditionChange(index, 'field', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Field" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableAttributes.map((attr) => (
                                                                    <SelectItem key={attr} value={attr}>
                                                                        {attr}
                                                                    </SelectItem>
                                                                ))}
                                                                <SelectItem value="custom">Custom...</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {!availableAttributes.includes(condition.field) && condition.field !== '' && (
                                                            <div className="mt-1">
                                                                <Input
                                                                    placeholder="Custom field name"
                                                                    value={condition.field}
                                                                    onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                                                                    className="h-8 text-xs"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-32">
                                                        <Select
                                                            value={condition.operator}
                                                            onValueChange={(val) => handleConditionChange(index, 'operator', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="=">=</SelectItem>
                                                                <SelectItem value="!=">!=</SelectItem>
                                                                <SelectItem value=">">&gt;</SelectItem>
                                                                <SelectItem value="<">&lt;</SelectItem>
                                                                <SelectItem value=">=">&gt;=</SelectItem>
                                                                <SelectItem value="<=">&lt;=</SelectItem>
                                                                <SelectItem value="in">in</SelectItem>
                                                                <SelectItem value="contains">contains</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex-1">
                                                        <Input
                                                            placeholder="Value"
                                                            value={condition.value}
                                                            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-red-500"
                                                        onClick={() => handleRemoveCondition(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-dashed"
                                            onClick={handleAddCondition}
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Add Condition
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};
