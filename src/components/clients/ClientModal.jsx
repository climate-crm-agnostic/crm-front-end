import React, { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { createClient, updateClient, uploadClientImage } from "../../services/clientService";
import { useAuth } from "../../context/AuthContext";

// UI Components
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"; // Import Select components
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { DateInput } from "../ui/date-input";

export const ClientModal = ({ isOpen, onClose, onClientSaved, clientToEdit = null, attributes = [] }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [name, setName] = useState("");
    const [dynamicData, setDynamicData] = useState({});
    const { user } = useAuth();

    // File upload state
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    // Task state (Edit Mode Only)
    const [tasks, setTasks] = useState([]);
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskCompleted, setNewTaskCompleted] = useState(false);

    // Notes state
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState("");

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (clientToEdit) {
                // Static fields
                setName(clientToEdit.name || "");

                // Dynamic fields - attributes are usually stored in a JSON field 'attributes' or flat on the object?
                // Based on LeadModal pattern, it sends "attributes" object. 
                // However, Table displays them as flat keys (row[col.key]). 
                // This implies the backend serializer might flatten them or we need to handle it.
                // If the backend returns them flat, we just look for the key. 
                // If it returns an 'attributes' object, we look there.
                // Let's assume for now they might be on the root object or in 'attributes'.
                // LeadService: getLeads returns whatever backend sends. 
                // clientService: getClients returns whatever backend sends.
                // Safest bet: Check if clientToEdit[attr.name] exists, or clientToEdit.attributes?.[attr.name]

                const newDynamicData = {};
                attributes.forEach(attr => {
                    // Try to find the value in root or in attributes dict
                    let val = clientToEdit[attr.name] !== undefined ? clientToEdit[attr.name] : (clientToEdit.attributes?.[attr.name]);
                    if (val === undefined || val === null) {
                        val = attr.type === 'boolean' ? false : "";
                    }
                    newDynamicData[attr.name] = val;
                });
                setDynamicData(newDynamicData);

                // Images
                setImages(clientToEdit.list_of_images || []);

                // Tasks & Notes
                setTasks(clientToEdit.list_of_tasks || []);
                setNotes(clientToEdit.list_of_notes || []);

            } else {
                setName("");
                // Initialize dynamic data
                const newDynamicData = {};
                attributes.forEach(attr => {
                    newDynamicData[attr.name] = attr.type === 'boolean' ? false : "";
                });
                setDynamicData(newDynamicData);
                setImages([]);
                setTasks([]);
                setNewTaskDate(new Date().toISOString().split('T')[0]);
                setNewTaskDesc("");
                setNewTaskCompleted(false);
                setNotes([]);
                setNewNote("");
            }
        }
    }, [isOpen, clientToEdit, attributes]);

    const handleDynamicChange = (name, value) => {
        setDynamicData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !clientToEdit) return;
        setUploading(true);
        console.log("Uploading file:", selectedFile.name, "for client:", clientToEdit.id);
        try {
            const res = await uploadClientImage(clientToEdit.id, selectedFile);
            console.log("Upload response:", res);
            setImages(res.list_of_images || []); // Update list from response
            setSelectedFile(null);
            // Clear input
            const fileInput = document.getElementById("file-upload");
            if (fileInput) fileInput.value = "";
            onClientSaved(); // Trigger refresh on parent
        } catch (err) {
            console.error("Upload error details:", err);
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

        if (clientToEdit) {
            try {
                await updateClient(clientToEdit.id, { list_of_tasks: updatedTasks });
            } catch (err) {
                console.error("Error adding task", err);
                setError("Failed to save task immediately.");
            }
        }
    };

    const removeTask = async (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        if (clientToEdit) {
            await updateClient(clientToEdit.id, { list_of_tasks: newTasks });
        }
    };

    const toggleTask = async (index) => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
        if (clientToEdit) {
            await updateClient(clientToEdit.id, { list_of_tasks: newTasks });
        }
    };

    // --- Note Management ---
    const addNote = async () => {
        if (!newNote.trim()) return;

        const newEntry = {
            date: new Date().toISOString(),
            note: newNote,
            user_id: user?.id
        };

        const updatedNotes = [...notes, newEntry];
        setNotes(updatedNotes);
        setNewNote("");

        if (clientToEdit) {
            try {
                await updateClient(clientToEdit.id, { list_of_notes: updatedNotes });
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

            const formattedAttributes = formatAttributes(dynamicData, attributes);

            const payload = {
                name,
                attributes: formattedAttributes
            };

            if (clientToEdit) {
                payload.list_of_tasks = tasks;
                payload.list_of_notes = notes;
            }

            let savedClient;
            if (clientToEdit) {
                savedClient = await updateClient(clientToEdit.id, payload);
                // If we have a file selected, upload it now
                if (selectedFile) {
                    console.log("Uploading pending file for existing client...");
                    await uploadClientImage(clientToEdit.id, selectedFile);
                }
            } else {
                savedClient = await createClient(payload);
                // If we have a file selected, upload it now using the new ID
                if (selectedFile && savedClient && savedClient.id) {
                    console.log("Uploading pending file for new client...");
                    await uploadClientImage(savedClient.id, selectedFile);
                }
            }
            onClientSaved();
            onClose();
        } catch (err) {
            console.error("Error saving client", err);
            setError(`Failed to save client. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={clientToEdit ? "Edit Client" : "New Client"}
            showFooter={false}
            widthClass="sm:w-[600px]"
        >
            <div className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name">Client Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Acme Corp"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Dynamic Attributes */}
                {attributes.length > 0 && (
                    <div className="border-t pt-4 space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Additional Information</h4>
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

                {/* File Upload Section (Only in Edit Mode) */}
                {clientToEdit && (
                    <div className="border-t pt-4 space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Files & Images</h4>

                        {/* Image Gallery */}
                        {images.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {images.map((imgUrl, idx) => (
                                    <div key={idx} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden border">
                                        <img src={imgUrl} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No images uploaded yet.</p>
                        )}

                        {/* Upload Input */}
                        <div className="flex gap-2 items-end">
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
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tasks & Notes (Only in Edit Mode) */}
                {clientToEdit && (
                    <>
                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm text-muted-foreground">Tasks</h4>
                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs">Task</Label>
                                        <Input
                                            value={newTaskDesc}
                                            onChange={(e) => setNewTaskDesc(e.target.value)}
                                            placeholder="Task description..."
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <Label className="text-xs">Date</Label>
                                        <DateInput
                                            value={newTaskDate}
                                            onChange={(e) => setNewTaskDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 pb-2">
                                        <Checkbox
                                            id="new-completed"
                                            checked={newTaskCompleted}
                                            onCheckedChange={setNewTaskCompleted}
                                        />
                                        <label htmlFor="new-completed" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Done
                                        </label>
                                    </div>
                                    <Button size="sm" type="button" onClick={addTask} disabled={!newTaskDesc}>Add</Button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {tasks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No tasks added.</p>
                                ) : (
                                    tasks.map((task, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-card border rounded-md">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={task.completed}
                                                    onCheckedChange={() => toggleTask(idx)}
                                                />
                                                <div className={task.completed ? "line-through text-muted-foreground" : ""}>
                                                    <p className="text-sm font-medium">{task.task || task.description}</p>
                                                    <p className="text-xs text-muted-foreground">{task.date}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" type="button" onClick={() => removeTask(idx)} className="h-6 w-6 p-0 text-red-500">
                                                &times;
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>

                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs">Note</Label>
                                        <Textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Add a new note..."
                                            className="h-20 min-h-[80px] text-sm"
                                        />
                                    </div>
                                    <Button size="sm" type="button" onClick={addNote} disabled={!newNote}>Add Note</Button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {notes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No notes added.</p>
                                ) : (
                                    notes.slice().reverse().map((item, idx) => (
                                        <div key={idx} className="p-3 bg-card border rounded-md space-y-1">
                                            <p className="text-sm">{item.note}</p>
                                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                <span>{new Date(item.date).toLocaleString()}</span>
                                                {item.user_id && <span>User ID: {item.user_id}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end pt-4 gap-2 border-t mt-4">
                    <Button variant="outline" onClick={onClose} disabled={loading || uploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || uploading}>
                        {loading ? "Saving..." : clientToEdit ? "Update Client" : "Create Client"}
                    </Button>
                </div>
            </div>
        </Modal >
    );
};
