import React, { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { createContact, updateContact } from "../../services/contactService";
import { getClients } from "../../services/clientService";

// UI Components
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { DateInput } from "../ui/date-input";
import { Textarea } from "../ui/textarea";

export const ContactModal = ({ isOpen, onClose, onContactSaved, contactToEdit = null, attributes = [], preSelectedClient = null }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Static fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [isPrimary, setIsPrimary] = useState(false);
    const [clientId, setClientId] = useState("");
    const [clients, setClients] = useState([]);
    const [dynamicData, setDynamicData] = useState({});

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
            loadClients();
        }
    }, [isOpen]);

    const loadClients = async () => {
        try {
            const data = await getClients();
            setClients(data);
        } catch (err) {
            console.error("Error loading clients", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (contactToEdit) {
                setFirstName(contactToEdit.first_name || "");
                setLastName(contactToEdit.last_name || "");
                setEmail(contactToEdit.email || "");
                setPhone(contactToEdit.phone || "");
                setJobTitle(contactToEdit.job_title || "");
                setIsPrimary(contactToEdit.is_primary || false);
                setClientId(contactToEdit.client ? (typeof contactToEdit.client === 'object' ? contactToEdit.client.id : contactToEdit.client) : (preSelectedClient || ""));

                const newDynamicData = {};
                attributes.forEach(attr => {
                    const val = contactToEdit[attr.name] !== undefined ? contactToEdit[attr.name] : (contactToEdit.attributes?.[attr.name] || "");
                    newDynamicData[attr.name] = val;
                });
                setDynamicData(newDynamicData);

                setTasks(contactToEdit.list_of_tasks || []);
                setNotes(contactToEdit.list_of_notes || []);
            } else {
                setFirstName("");
                setLastName("");
                setEmail("");
                setPhone("");
                setJobTitle("");
                setIsPrimary(false);
                setClientId(preSelectedClient || "");
                const newDynamicData = {};
                attributes.forEach(attr => {
                    newDynamicData[attr.name] = "";
                });
                setDynamicData(newDynamicData);
                setTasks([]);
                setNotes([]);
                setNewNote("");
            }
        }
    }, [isOpen, contactToEdit, attributes, preSelectedClient]);

    const handleDynamicChange = (name, value) => {
        setDynamicData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // --- Task Management (Edit Mode) ---
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

        try {
            await updateContact(contactToEdit.id, { list_of_tasks: updatedTasks });
        } catch (err) {
            console.error("Error adding task", err);
            setError("Failed to add task. " + err.message);
        }
    };

    const removeTask = async (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
        try {
            await updateContact(contactToEdit.id, { list_of_tasks: newTasks });
        } catch (err) {
            console.error("Error removing task", err);
            setError("Failed to remove task. " + err.message);
        }
    };

    const toggleTask = async (index) => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
        try {
            await updateContact(contactToEdit.id, { list_of_tasks: newTasks });
        } catch (err) {
            console.error("Error toggling task", err);
            setError("Failed to update task. " + err.message);
        }
    };

    // --- Note Management ---
    const addNote = async () => {
        if (!newNote.trim()) return;

        const newEntry = {
            date: new Date().toISOString(),
            note: newNote,
        };

        const updatedNotes = [...notes, newEntry];
        setNotes(updatedNotes);
        setNewNote("");

        try {
            await updateContact(contactToEdit.id, { list_of_notes: updatedNotes });
        } catch (err) {
            console.error("Error adding note", err);
            setError("Failed to save note immediately.");
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = {
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                job_title: jobTitle,
                is_primary: isPrimary,
                client: clientId,
                attributes: dynamicData,
            };

            if (contactToEdit) {
                payload.list_of_tasks = tasks;
                payload.list_of_notes = notes;
                await updateContact(contactToEdit.id, payload);
            } else {
                await createContact(payload);
            }
            onContactSaved();
            onClose();
        } catch (err) {
            console.error("Error saving contact", err);
            setError(`Failed to save contact. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={contactToEdit ? "Edit Contact" : "New Contact"}
            showFooter={false}
            widthClass="sm:w-[700px]"
        >
            <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                            id="first_name"
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                            id="last_name"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            placeholder="+1 555-0192"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="job_title">Job Title</Label>
                        <Input
                            id="job_title"
                            placeholder="CTO"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end pb-2">
                        <div className="flex items-center space-x-2">
                            <Switch id="is_primary" checked={isPrimary} onCheckedChange={setIsPrimary} />
                            <Label htmlFor="is_primary">Primary Contact for Client</Label>
                        </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="client">Client</Label>
                        {preSelectedClient ? (
                            <div className="p-2 border rounded-md bg-muted/50 text-sm font-medium">
                                {clients.find(c => String(c.id) === String(preSelectedClient))?.name || "Client Selected"}
                            </div>
                        ) : (
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
                        )}
                    </div>
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
                                        <div className="flex items-center space-x-2 h-9">
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

                {/* --- EDIT MODE ONLY SECTIONS --- */}
                {contactToEdit && (
                    <>
                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm text-muted-foreground">Tasks</h4>

                            <div className="bg-muted/30 p-3 rounded-md space-y-2">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs">Description</Label>
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
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end pt-4 gap-2 border-t mt-4">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : contactToEdit ? "Update Contact" : "Create Contact"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
