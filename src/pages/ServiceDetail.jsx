import React, { useEffect, useState } from "react";
import { formatDateTime } from "../utils/tz";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createService, updateService, uploadServiceImage, deleteServiceImage, getServiceById, getServiceAttributes } from "../services/serviceService";
import { getClients } from "../services/clientService";
import { useAuth } from "../context/AuthContext";

// UI Components
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { DateInput } from "../components/ui/date-input";
import { DynamicAttributeField } from "../components/attributes/DynamicAttributeField";
import { coerceAttributeValue, emptyValueFor, normalizeOptions } from "../utils/attributeTypes";

export const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isNew = id === 'new';

    // Check if client was pre-selected (e.g. from Client page logic, though less common here, mostly from Service page)
    // Or if we need to support ?client_id=...
    const preSelectedClientId = location.state?.clientId;

    const [attributes, setAttributes] = useState([]);
    const [clients, setClients] = useState([]);
    const [name, setName] = useState("");
    const [clientId, setClientId] = useState("");
    const [dynamicData, setDynamicData] = useState({});

    // Billing schedule — recurring services are invoiced automatically by the daily job
    const [status, setStatus] = useState("active");
    const [billingType, setBillingType] = useState("one_time");
    const [billingCycle, setBillingCycle] = useState("monthly");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [nextBillingDate, setNextBillingDate] = useState("");
    const [lastBilledAt, setLastBilledAt] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    // File upload state
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    // Task & Note state
    const [tasks, setTasks] = useState([]);
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskCompleted, setNewTaskCompleted] = useState(false);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState("");

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                await Promise.all([fetchAttributes(), fetchClients()]);

                if (!isNew) {
                    await fetchServiceData(id);
                } else {
                    setName("");
                    setClientId(preSelectedClientId ? String(preSelectedClientId) : "");
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
    }, [id, isNew, preSelectedClientId]);

    const fetchAttributes = async () => {
        try {
            const data = await getServiceAttributes();

            // Parse options for list types
            const processedAttributes = data.map(attr => {
                const options = normalizeOptions(attr.options || attr.list_values);
                return { ...attr, options };
            });

            setAttributes(processedAttributes);
            // Init default dynamic data
            const initialDynamic = {};
            processedAttributes.forEach(attr => {
                initialDynamic[attr.name] = emptyValueFor(attr);
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
        } catch (err) {
            console.error("Error fetching clients", err);
        }
    };

    const fetchServiceData = async (serviceId) => {
        try {
            const data = await getServiceById(serviceId);
            populateForm(data);
        } catch (err) {
            console.error("Error fetching service", err);
            setError("Failed to load service details.");
        }
    };

    const populateForm = (data) => {
        setName(data.name || "");
        setClientId(data.client ? (typeof data.client === 'object' ? String(data.client.id) : String(data.client)) : "");
        setStatus(data.status || "active");
        setBillingType(data.billing_type || "one_time");
        setBillingCycle(data.billing_cycle || "monthly");
        setAmount(data.amount ?? "");
        setCurrency(data.currency || "USD");
        setNextBillingDate(data.next_billing_date || "");
        setLastBilledAt(data.last_billed_at || "");

        setDynamicData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
                let val = data[key] !== undefined ? data[key] : (data.attributes?.[key]);
                if (val === undefined || val === null) {
                    // Check attribute type if available in attributes state, otherwise default string
                    // Ideally we should find the attr definition
                    const attrDef = attributes.find(a => a.name === key);
                    val = (attrDef && attrDef.type === 'boolean') ? false : "";
                }
                updated[key] = val;
            });
            return updated;
        });

        setImages(data.list_of_images || []);
        setTasks(data.list_of_tasks || []);
        setNotes(data.list_of_notes || []);
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
            const res = await uploadServiceImage(id, selectedFile);
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

    const handleDeleteImage = async (path) => {
        if (isNew) return;
        try {
            const res = await deleteServiceImage(id, path);
            setImages(res.list_of_images || []);
        } catch (err) {
            setError(`Failed to delete image. ${err.message}`);
        }
    };

    // --- Task Management ---
    const addTask = async () => {
        if (!newTaskDesc.trim()) return;
        const newTask = {
            date: newTaskDate,
            task: newTaskDesc,
            completed: newTaskCompleted
        };
        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        setNewTaskDesc("");
        setNewTaskCompleted(false);

        if (!isNew) {
            try {
                await updateService(id, { list_of_tasks: updatedTasks });
            } catch (err) {
                console.error("Error saving task", err);
                setError("Tick.");
            }
        }
    };

    const removeTask = async (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        if (!isNew) {
            await updateService(id, { list_of_tasks: newTasks });
        }
    };

    const toggleTask = async (index) => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
        if (!isNew) {
            await updateService(id, { list_of_tasks: newTasks });
        }
    };

    // --- Note Management ---
    const addNote = async () => {
        if (!newNote.trim()) return;

        const newEntry = {
            date: new Date().toISOString(),
            note: newNote,
            // user_id handled by backend
        };

        const updatedNotes = [...notes, newEntry];
        setNotes(updatedNotes);
        setNewNote("");

        if (!isNew) {
            try {
                await updateService(id, { list_of_notes: updatedNotes });
            } catch (err) {
                console.error("Error saving note", err);
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            // Helper to format values based on attribute type
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
                client: clientId,
                status,
                billing_type: billingType,
                attributes: formattedAttributes
            };
            if (billingType === 'recurring') {
                payload.billing_cycle = billingCycle;
                payload.amount = amount;
                payload.currency = currency;
                payload.next_billing_date = nextBillingDate || null;
            }

            if (isNew) {
                if (tasks.length) payload.list_of_tasks = tasks;
                if (notes.length) payload.list_of_notes = notes;

                const newSvc = await createService(payload);
                if (selectedFile && newSvc && newSvc.id) {
                    await uploadServiceImage(newSvc.id, selectedFile);
                }
                navigate(-1);
            } else {
                payload.list_of_tasks = tasks;
                payload.list_of_notes = notes;
                await updateService(id, payload);
                if (selectedFile) {
                    await uploadServiceImage(id, selectedFile);
                }
                navigate(-1);
            }
        } catch (err) {
            console.error("Error saving service", err);
            setError(`Failed to save service. ${err.message || ""}`);
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
                            {isNew ? "New Service" : "Edit Service"}
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {isNew ? "Add a new service" : `Managing details for ${name}`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || uploading}>
                        {loading ? "Saving..." : "Save Service"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {error && (
                    <div className="p-4 mb-6 text-sm text-red-500 bg-red-50 dark:bg-red-500/15 rounded-md border border-red-200 dark:border-red-500/30">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Main Info */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Service Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="client">Client</Label>
                                <Select value={clientId} onValueChange={setClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Billing */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Billing</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Billing</Label>
                                <Select value={billingType} onValueChange={setBillingType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one_time">One time</SelectItem>
                                        <SelectItem value="recurring">Recurring</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                {billingType === 'recurring' && status !== 'active' && (
                                    <p className="text-xs text-muted-foreground">Only active services are invoiced.</p>
                                )}
                            </div>
                        </div>
                        {billingType === 'recurring' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount per cycle</Label>
                                    <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cycle</Label>
                                    <Select value={billingCycle} onValueChange={setBillingCycle}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Next billing date</Label>
                                    <DateInput value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} />
                                    {lastBilledAt && <p className="text-xs text-muted-foreground">Last billed: {lastBilledAt}</p>}
                                </div>
                            </div>
                        )}
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

                    {/* Tasks & Notes Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tasks */}
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Tasks</h3>
                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="flex flex-col gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Description</Label>
                                        <Input
                                            value={newTaskDesc}
                                            onChange={(e) => setNewTaskDesc(e.target.value)}
                                            placeholder="Task description..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/2 space-y-1">
                                            <Label className="text-xs">Date</Label>
                                            <DateInput value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} />
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
                                            <Checkbox
                                                checked={task.completed}
                                                onCheckedChange={() => toggleTask(idx)}
                                                disabled={task.user_id && user?.id && String(task.user_id) !== String(user.id)}
                                            />
                                            <div className={task.completed ? "line-through text-muted-foreground" : ""}>
                                                <p className="text-sm font-medium">{task.task || task.description}</p>
                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <span>{task.date}</span>
                                                    {task.user_name && <span>• {task.user_name}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {(!task.user_id || !user?.id || String(task.user_id) === String(user.id)) && (
                                            <Button variant="ghost" size="sm" onClick={() => removeTask(idx)} className="h-6 w-6 p-0 text-red-500">&times;</Button>
                                        )}
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
                                {notes.length === 0 ? <p className="text-sm text-muted-foreground italic">No notes.</p> : notes.slice().reverse().map((item, idx) => (
                                    <div key={idx} className="p-3 bg-muted/20 border rounded-md space-y-1">
                                        <p className="text-sm whitespace-pre-wrap">{item.note}</p>
                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                            <span>{formatDateTime(item.date)}</span>
                                            {item.user_name && <span>{item.user_name}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Files & Images */}
                    {!isNew && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Files & Images</h3>
                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {images.map((img, idx) => (
                                        <div key={img.path || idx} className="relative aspect-square bg-muted rounded-md overflow-hidden border group">
                                            <img src={img.url} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                                            <a href={img.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                                View
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteImage(img.path)}
                                                className="absolute top-1 right-1 z-10 h-5 w-5 flex items-center justify-center rounded-full bg-black/60 text-white text-xs leading-none hover:bg-red-600"
                                                title="Delete image"
                                            >
                                                &times;
                                            </button>
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
