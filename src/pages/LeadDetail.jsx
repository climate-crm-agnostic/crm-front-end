import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getLeadClientAttributes, createLead, updateLead, uploadLeadImage, getLead } from "../services/leadService";
import { getPipelineAttributes } from "../services/pipelineAttributeService";
import { getPipelines } from "../services/pipelineService";
import { getCatalogueItems } from "../services/catalogueService";
import { getSales } from "../services/salesService";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Switch } from "../components/ui/switch";
import { DateInput } from "../components/ui/date-input";
import Swal from "sweetalert2";

export const LeadDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const isNew = id === "new";
    // Check if we passed state via navigation (e.g. pipelineId for new lead)
    const pipelineId = location.state?.pipelineId;

    const [attributes, setAttributes] = useState([]);
    const [clientAttributes, setClientAttributes] = useState([]);
    const [activePipelineId, setActivePipelineId] = useState(pipelineId || null);
    const [pipelines, setPipelines] = useState([]);
    const [catalogueOptions, setCatalogueOptions] = useState([]);
    const [salesUsers, setSalesUsers] = useState([]);
    const [formData, setFormData] = useState({});
    const [clientInfoData, setClientInfoData] = useState({});
    const [itemsList, setItemsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);
    const [error, setError] = useState(null);

    // Standard static fields for a Lead
    const [name, setName] = useState("");
    const [selectedResponsible, setSelectedResponsible] = useState("");
    const [possibleClient, setPossibleClient] = useState("");
    const [clients, setClients] = useState([]);
    const [currentStage, setCurrentStage] = useState("");
    const [changingStage, setChangingStage] = useState(false);
    const [showLostModal, setShowLostModal] = useState(false);
    const [lostReason, setLostReason] = useState("");
    const [movingToLost, setMovingToLost] = useState(false);

    // File upload state
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    // Task state
    const [tasks, setTasks] = useState([]);
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskCompleted, setNewTaskCompleted] = useState(false);

    // Notes state
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState("");

    // Detect first/last name dynamic attributes (case-insensitive label match)
    const firstNameAttr = attributes.find(a => a.label?.toLowerCase() === 'first name');
    const lastNameAttr = attributes.find(a => a.label?.toLowerCase() === 'last name');
    const isAutoName = !!(firstNameAttr || lastNameAttr);

    // Auto-populate name from first/last name dynamic attributes
    useEffect(() => {
        if (!isAutoName) return;
        const first = firstNameAttr ? (formData[firstNameAttr.name] || "").trim() : "";
        const last = lastNameAttr ? (formData[lastNameAttr.name] || "").trim() : "";
        setName([first, last].filter(Boolean).join(" "));
    }, [formData, attributes]);

    useEffect(() => {
        const init = async () => {
            setFetching(true);
            try {
                fetchSalesUsers().catch(e => console.error(e));
                fetchClients().catch(e => console.error(e));
                fetchPipelines().catch(e => console.error(e));

                if (!isNew) {
                    // Load lead first so we know its pipeline
                    const data = await getLead(id);
                    const pid = data.pipeline?.id || data.pipeline || null;
                    if (pid) setActivePipelineId(String(pid));
                    // fetchAttributes will be triggered by useEffect on activePipelineId
                    populateForm(data);
                } else {
                    // For new leads pipelineId comes from navigation state
                    if (pipelineId) {
                        setActivePipelineId(String(pipelineId));
                    }
                    setName("");
                    setPossibleClient("");
                    if (user?.id) setSelectedResponsible(String(user.id));
                }
            } catch (err) {
                console.error("Initialization error", err);
                setError("Failed to load page data.");
                setClientInfoData({});
                setItemsList([]);
            } finally {
                setFetching(false);
            }
        };
        init();
    }, [id, isNew]);

    // Reactive attribute fetching
    useEffect(() => {
        if (activePipelineId) {
            fetchAttributes(activePipelineId);
        } else {
            // Fetch at least client attributes and catalogue even if no pipeline
            fetchAttributes(null);
        }
    }, [activePipelineId]);

    const populateForm = (leadData) => {
        setName(leadData.name || "");
        setCurrentStage(leadData.stage || "");

        // Capture pipeline so attributes can be fetched from the right pipeline
        const pid = leadData.pipeline?.id || leadData.pipeline || null;
        if (pid) setActivePipelineId(String(pid));

        // Handle responsible
        const respId = leadData.responsible?.id || leadData.responsible || "";
        setSelectedResponsible(String(respId));

        // Handle possible client
        const clientId = leadData.possible_client?.id || leadData.possible_client || "";
        setPossibleClient(String(clientId));

        // Populate dynamic attributes
        // formData state is initialized in fetchAttributes, but we update it here
        setFormData(prev => {
            const updated = { ...prev };
            // We need attributes loaded to know keys, but generally keys match attribute names
            // If attributes aren't loaded yet, this might be partial. 
            // In init(), we await fetchAttributes() first, providing the structure.

            // Map leadData values to formData
            if (leadData.attributes) {
                Object.keys(leadData.attributes).forEach(key => {
                    updated[key] = leadData.attributes[key];
                });
            }
            // Also check root level for attribute keys if needed, dependent on backend response structure
            return updated;
        });

        setClientInfoData(leadData.client_attributes || leadData.client_info || {});
        
        const existingItems = leadData.items || [];
        const formattedItems = existingItems.map(item => ({
            catalogue_item: item.catalogue_item?.id || item.catalogue_item || "",
            quantity: item.quantity || 1,
            custom_price: item.custom_price || ""
        }));
        setItemsList(formattedItems);

        setImages(leadData.list_of_images || []);
        setTasks(leadData.list_of_tasks || []);
        setNotes(leadData.list_of_notes || leadData.list_of_follow_ups || []);
    };

    const fetchSalesUsers = async () => {
        try {
            const data = await getSales();
            setSalesUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching sales users", err);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await getClients();
            console.log("Fetched clients:", data);
            setClients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching clients", err);
        }
    };

    const fetchPipelines = async () => {
        try {
            const data = await getPipelines();
            setPipelines(Array.isArray(data) ? data : (data.results || []));
        } catch (err) {
            console.error("Error fetching pipelines", err);
        }
    };



    const fetchAttributes = async (resolvedPipelineId) => {
        try {
            const pid = resolvedPipelineId || activePipelineId;
            const [leadAttrs, clientAttrs, catalogueRes] = await Promise.all([
                pid ? getPipelineAttributes(pid) : Promise.resolve([]),
                getLeadClientAttributes(),
                getCatalogueItems({ is_active: true })
            ]);

            // Helper to process options
            const processAttrs = (attrs) => attrs.map(attr => {
                let options = attr.options;
                if (!options && attr.list_values) {
                    options = typeof attr.list_values === 'string'
                        ? JSON.parse(attr.list_values)
                        : attr.list_values;
                }
                return { ...attr, options };
            });

            const processedLeadAttrs = processAttrs(leadAttrs);
            const processedClientAttrs = processAttrs(clientAttrs);

            setAttributes(processedLeadAttrs);
            setClientAttributes(processedClientAttrs);

            const catalog = Array.isArray(catalogueRes) ? catalogueRes : (catalogueRes.results || []);
            
            // Sort catalog by type, then by name
            catalog.sort((a, b) => {
                const typeA = a.type || '';
                const typeB = b.type || '';
                if (typeA !== typeB) return typeA.localeCompare(typeB);
                const nameA = a.name || '';
                const nameB = b.name || '';
                return nameA.localeCompare(nameB);
            });

            setCatalogueOptions(catalog);

            // Initialize form data keys
            const initialData = {};
            processedLeadAttrs.forEach(attr => {
                initialData[attr.name] = attr.type === 'boolean' ? false : "";
            });

            setFormData(prev => {
                const merged = { ...initialData };
                // Merge existing values from 'prev' (the lead data already loaded)
                Object.keys(prev).forEach(key => {
                    if (prev[key] !== undefined && prev[key] !== "" && prev[key] !== false) {
                        merged[key] = prev[key];
                    }
                });
                return merged;
            });

            // Initialize client info keys if needed, but normally populated from lead data or empty
            // We can ensure keys exist
            setClientInfoData(prev => {
                const updated = { ...prev };
                processedClientAttrs.forEach(attr => {
                    if (updated[attr.name] === undefined) {
                        updated[attr.name] = attr.type === 'boolean' ? false : "";
                    }
                });
                return updated;
            });

        } catch (err) {
            console.error("Error fetching attributes", err);
            setError("Failed to load form attributes.");
        }
    };

    const handleAttributeChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleClientAttributeChange = (name, value) => {
        setClientInfoData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Items list management
    const addItem = () => {
        setItemsList([...itemsList, { catalogue_item: "", quantity: 1, custom_price: "" }]);
    };

    const removeItem = (index) => {
        setItemsList(itemsList.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updatedList = [...itemsList];
        updatedList[index] = { ...updatedList[index], [field]: value };
        setItemsList(updatedList);
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
            const res = await uploadLeadImage(id, selectedFile);
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
                await updateLead(id, { list_of_tasks: updatedTasks });
            } catch (err) {
                console.error("Error adding task", err);
                setError("Failed to save task immediately.");
            }
        }
    };

    const removeTask = async (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        if (!isNew) {
            await updateLead(id, { list_of_tasks: newTasks });
        }
    };

    const toggleTask = async (index) => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
        if (!isNew) {
            await updateLead(id, { list_of_tasks: newTasks });
        }
    };

    // --- Note Management ---
    const addNote = async () => {
        if (!newNote.trim()) return;

        const newEntry = {
            date: new Date().toISOString(),
            note: newNote,
            // user_id and user_name are handled by backend
        };

        const updatedNotes = [...notes, newEntry];
        setNotes(updatedNotes);
        setNewNote("");

        if (!isNew) {
            try {
                await updateLead(id, { list_of_notes: updatedNotes });
            } catch (err) {
                console.error("Error adding note", err);
                setError("Failed to save note immediately.");
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
                    if (attr.type === 'number' && formatted[attr.name]) {
                        formatted[attr.name] = Number(formatted[attr.name]);
                    }
                });
                return formatted;
            };

            const formattedAttributes = formatAttributes(formData, attributes);
            const formattedClientAttributes = formatAttributes(clientInfoData, clientAttributes);

            const finalItems = itemsList
                .filter(item => item.catalogue_item)
                .map(item => ({
                    catalogue_item: item.catalogue_item,
                    quantity: Number(item.quantity) || 1,
                    custom_price: item.custom_price ? Number(item.custom_price) : null,
                    attributes: {}
                }));

            const payload = {
                name,
                attributes: formattedAttributes,
                client_attributes: formattedClientAttributes,
                items: finalItems,
                responsible: selectedResponsible,
                possible_client: (possibleClient === "new_client" || !possibleClient) ? null : possibleClient,
            };

            console.log("LEAD DETAIL PAYLOAD:", payload);

            if (isNew) {
                payload.pipeline = activePipelineId;
                // Include initial tasks/notes for creation if needed, typically backend handles empty lists
                // But generally users add tasks/notes AFTER getting an ID.
                // If we want to support adding them during creation, we pass them in payload:
                if (tasks.length) payload.list_of_tasks = tasks;
                if (notes.length) payload.list_of_notes = notes;

                const newLead = await createLead(payload);
                if (selectedFile && newLead && newLead.id) {
                    await uploadLeadImage(newLead.id, selectedFile);
                }
                navigate(-1); // Go back
            } else {
                payload.list_of_tasks = tasks;
                payload.list_of_notes = notes;
                await updateLead(id, payload);
                if (selectedFile) {
                    await uploadLeadImage(id, selectedFile);
                }
                navigate(-1); // Go back
            }
        } catch (err) {
            console.error("Error saving lead", err);
            setError(`Failed to save opportunity. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMoveToLost = async () => {
        if (!lostReason.trim()) return;
        setMovingToLost(true);
        try {
            await updateLead(id, { stage: "Lost", lost_reason: lostReason.trim() });
            navigate(-1);
        } catch (err) {
            console.error("Error moving lead to lost", err);
        } finally {
            setMovingToLost(false);
        }
    };

    const handleStageChange = async (newStage) => {
        if (!newStage || newStage === currentStage) return;
        const previousStage = currentStage;
        setCurrentStage(newStage);
        setChangingStage(true);
        try {
            await updateLead(id, { stage: newStage });
        } catch (err) {
            console.error("Failed to update stage", err);
            setCurrentStage(previousStage);
            Swal.fire('Cannot move lead', err.message || 'The stage change was rejected.', 'error');
        } finally {
            setChangingStage(false);
        }
    };

    if (fetching) {
        return <div className="p-10 flex justify-center">Loading...</div>;
    }

    const activePipeline = pipelines.find(p => String(p.id) === String(activePipelineId));
    const availableStages = (activePipeline?.stages || [])
        .filter(s => (s.name || '').toLowerCase() !== 'lost')
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">
                            {isNew ? "New Opportunity" : "Edit Opportunity"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isNew ? "Create a new sales opportunity" : `Managing details for ${name}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && availableStages.length > 0 && (
                        <Select
                            value={currentStage}
                            onValueChange={handleStageChange}
                            disabled={changingStage}
                        >
                            <SelectTrigger className="h-9 w-[180px]" style={{ backgroundColor: "#fff", borderColor: "#D8D2C4", color: "#2E2A26" }}>
                                <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {currentStage && !availableStages.some(s => s.name === currentStage) && (
                                    <SelectItem value={currentStage}>{currentStage}</SelectItem>
                                )}
                                {availableStages.map(s => (
                                    <SelectItem key={s.id || s.name} value={s.name}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {!isNew && (
                        <button
                            type="button"
                            onClick={() => { setLostReason(""); setShowLostModal(true); }}
                            style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", borderRadius: "6px", border: "1px solid #f9a8a8", backgroundColor: "transparent", color: "#b91c1c", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
                            Move to Lost
                        </button>
                    )}
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || uploading}>
                        {loading ? "Saving..." : "Save Opportunity"}
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {error && (
                    <div className="p-4 mb-6 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Main Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-lg border shadow-sm">
                        {/* Responsible Field */}
                        <div className="space-y-2">
                            <Label htmlFor="responsible">Responsible</Label>
                            <Select
                                value={selectedResponsible}
                                onValueChange={setSelectedResponsible}
                            >
                                <SelectTrigger id="responsible" className="w-full">
                                    <SelectValue placeholder="Select a responsible person" />
                                </SelectTrigger>
                                <SelectContent>
                                    {salesUsers.map(user => (
                                        <SelectItem key={user.id} value={String(user.id)}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Possible Client Field */}
                        <div className="space-y-2">
                            <Label htmlFor="possible-client">Possible Client</Label>
                            <Select
                                value={possibleClient}
                                onValueChange={setPossibleClient}
                            >
                                <SelectTrigger id="possible-client" className="w-full">
                                    <SelectValue placeholder="Select a client (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new_client">+ New Client</SelectItem>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={String(client.id)}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Static Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="lead-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                Opportunity Name
                                {isAutoName && (
                                    <span style={{ fontSize: "11px", color: "#9b948e", fontWeight: 400 }}>
                                        (auto from First / Last Name)
                                    </span>
                                )}
                            </Label>
                            <input
                                id="lead-name"
                                placeholder={isAutoName ? "Auto-filled from First / Last Name" : "e.g. Acme Corp Deal"}
                                value={name}
                                onChange={isAutoName ? undefined : (e) => setName(e.target.value)}
                                readOnly={isAutoName}
                                style={{
                                    width: "100%", height: "36px", padding: "0 12px",
                                    borderRadius: "6px", border: "1px solid #D8D2C4",
                                    backgroundColor: isAutoName ? "#F2EBDD" : "#fff",
                                    color: isAutoName ? "#9b948e" : "#2E2A26",
                                    fontSize: "14px", cursor: isAutoName ? "default" : "text",
                                    outline: "none", boxSizing: "border-box",
                                }}
                            />
                        </div>

                        {/* Pipeline Selection (Only for New Leads) */}
                        {isNew && (
                            <div className="space-y-2">
                                <Label htmlFor="pipeline-select">Pipeline *</Label>
                                <Select
                                    value={activePipelineId}
                                    onValueChange={setActivePipelineId}
                                >
                                    <SelectTrigger id="pipeline-select" className="w-full">
                                        <SelectValue placeholder="Select a pipeline" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pipelines.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Dynamic Attributes */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {attributes.map((attr) => (
                                <div key={attr.name} className="space-y-2">
                                    <Label htmlFor={attr.name}>{attr.label}</Label>
                                    {attr.type === 'list' ? (
                                        <Select
                                            onValueChange={(val) => handleAttributeChange(attr.name, val)}
                                            value={formData[attr.name]}
                                        >
                                            <SelectTrigger className="w-full">
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
                                                checked={!!formData[attr.name]}
                                                onCheckedChange={(checked) => handleAttributeChange(attr.name, checked)}
                                            />
                                            <Label htmlFor={attr.name} className="cursor-pointer font-normal text-muted-foreground">
                                                {formData[attr.name] ? 'Yes' : 'No'}
                                            </Label>
                                        </div>
                                    ) : attr.type === 'date' ? (
                                        <DateInput
                                            id={attr.name}
                                            value={formData[attr.name] || ""}
                                            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                                        />
                                    ) : (
                                        <Input
                                            id={attr.name}
                                            type={attr.type === 'number' ? 'number' : 'text'}
                                            placeholder={attr.label}
                                            value={formData[attr.name] || ""}
                                            onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Client Info */}
                    {clientAttributes.length > 0 && (!possibleClient || possibleClient === 'new_client') && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Client Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {clientAttributes.map((attr) => (
                                    <div key={attr.name} className="space-y-2">
                                        <Label htmlFor={`client-${attr.name}`}>{attr.label}</Label>
                                        {attr.type === 'list' ? (
                                            <Select
                                                onValueChange={(val) => handleClientAttributeChange(attr.name, val)}
                                                value={clientInfoData[attr.name]}
                                            >
                                                <SelectTrigger className="w-full">
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
                                                    id={`client-${attr.name}`}
                                                    checked={!!clientInfoData[attr.name]}
                                                    onCheckedChange={(checked) => handleClientAttributeChange(attr.name, checked)}
                                                />
                                                <Label htmlFor={`client-${attr.name}`} className="cursor-pointer font-normal text-muted-foreground">
                                                    {clientInfoData[attr.name] ? 'Yes' : 'No'}
                                                </Label>
                                            </div>
                                        ) : attr.type === 'date' ? (
                                            <DateInput
                                                id={`client-${attr.name}`}
                                                value={clientInfoData[attr.name] || ""}
                                                onChange={(e) => handleClientAttributeChange(attr.name, e.target.value)}
                                            />
                                        ) : (
                                            <Input
                                                id={`client-${attr.name}`}
                                                type={attr.type === 'number' ? 'number' : 'text'}
                                                placeholder={attr.label}
                                                value={clientInfoData[attr.name] || ""}
                                                onChange={(e) => handleClientAttributeChange(attr.name, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Items Info */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-medium text-lg">Products & Services</h3>
                            <Button size="sm" type="button" onClick={addItem} variant="outline">
                                + Add Item
                            </Button>
                        </div>

                        {itemsList.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No items added.</p>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="w-[120px]">Quantity</TableHead>
                                            <TableHead className="w-[150px]">Custom Price</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemsList.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="p-2">
                                                    <Select
                                                        value={String(item.catalogue_item)}
                                                        onValueChange={(val) => handleItemChange(index, "catalogue_item", val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-full min-w-[200px]">
                                                            <SelectValue placeholder="Select from Catalogue" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {catalogueOptions.map((opt) => (
                                                                <SelectItem key={opt.id} value={String(opt.id)}>
                                                                    {opt.name} ({opt.type})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Default"
                                                        value={item.custom_price || ""}
                                                        onChange={(e) => handleItemChange(index, "custom_price", e.target.value)}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        &times;
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

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
                                            <DateInput
                                                value={newTaskDate}
                                                onChange={(e) => setNewTaskDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full flex items-center justify-end gap-2 pt-6">
                                            <Checkbox
                                                id="new-completed"
                                                checked={newTaskCompleted}
                                                onCheckedChange={setNewTaskCompleted}
                                            />
                                            <Label htmlFor="new-completed" className="text-sm">Done</Label>
                                            <Button size="sm" onClick={addTask} disabled={!newTaskDesc}>Add</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {tasks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No tasks added.</p>
                                ) : (
                                    tasks.map((task, idx) => (
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
                                                <Button variant="ghost" size="sm" onClick={() => removeTask(idx)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                                                    &times;
                                                </Button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Notes</h3>
                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">New Note</Label>
                                    <Textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Add a note..."
                                        className="min-h-[80px]"
                                    />
                                    <div className="flex justify-end">
                                        <Button size="sm" onClick={addNote} disabled={!newNote}>Add Note</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {notes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No notes added.</p>
                                ) : (
                                    notes.slice().reverse().map((item, idx) => (
                                        <div key={idx} className="p-3 bg-muted/20 border rounded-md space-y-1">
                                            <p className="text-sm whitespace-pre-wrap">{item.note}</p>
                                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                <span>{new Date(item.date).toLocaleString()}</span>
                                                {item.user_name && <span>{item.user_name}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Files Section */}
                    {!isNew && (
                        <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">Files & Images</h3>

                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {images.map((imgUrl, idx) => (
                                        <div key={idx} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden border group">
                                            <img src={imgUrl} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                                            <a href={imgUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                                View
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No images uploaded yet.</p>
                            )}

                            <div className="flex items-end gap-4 max-w-md">
                                <div className="w-full space-y-2">
                                    <Label htmlFor="file-upload">Upload New Image</Label>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploading}
                                    variant="secondary"
                                >
                                    {uploading ? "..." : "Upload"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Move to Lost modal */}
            {showLostModal && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: 32, width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Move to Lost</p>
                        <p style={{ fontSize: 13, color: "#6b6560", marginBottom: 20 }}>
                            Please provide a reason for marking <strong>{name}</strong> as lost.
                        </p>
                        <textarea
                            autoFocus
                            rows={4}
                            placeholder="e.g. Not interested, budget constraints, chose a competitor…"
                            value={lostReason}
                            onChange={(e) => setLostReason(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #D8D2C4", borderRadius: 4, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", outline: "none" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                            <button
                                type="button"
                                onClick={() => setShowLostModal(false)}
                                style={{ height: 36, padding: "0 16px", borderRadius: 6, border: "1px solid #D8D2C4", background: "transparent", color: "#6b6560", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleMoveToLost}
                                disabled={!lostReason.trim() || movingToLost}
                                style={{ height: 36, padding: "0 16px", borderRadius: 6, border: "none", backgroundColor: !lostReason.trim() || movingToLost ? "#f5a0a0" : "#b91c1c", color: "#fff", fontSize: 13, fontWeight: 600, cursor: !lostReason.trim() || movingToLost ? "not-allowed" : "pointer" }}>
                                {movingToLost ? "Saving…" : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
