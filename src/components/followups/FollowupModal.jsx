import React, { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { createFollowup, updateFollowup, getFollowupAttributes } from "../../services/followupService";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { DateInput } from "../ui/date-input";

export const FollowupModal = ({ isOpen, onClose, onFollowupSaved, followupToEdit = null, serviceId }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Model fields: type, follow_up_date, comment
    // Model fields: follow_up_date, comment, attributes
    // Type is removed
    const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
    const [comment, setComment] = useState("");

    // Dynamic attributes
    const [attributes, setAttributes] = useState([]);
    const [formData, setFormData] = useState({});

    // Fetch attributes instructions
    const fetchAttributes = async () => {
        try {
            const data = await getFollowupAttributes();
            // Map list_values to options if options is missing (similar to LeadModal logic if needed)
            const processedData = data.map(attr => {
                let options = attr.options;
                if (!options && attr.list_values) {
                    options = typeof attr.list_values === 'string'
                        ? JSON.parse(attr.list_values)
                        : attr.list_values;
                }
                return { ...attr, options };
            });
            setAttributes(processedData);

            // Initialize form data based on attributes
            const initialData = {};
            if (followupToEdit) {
                processedData.forEach(attr => {
                    // Check if attribute is at root or in attributes object
                    const val = followupToEdit[attr.name] !== undefined
                        ? followupToEdit[attr.name]
                        : (followupToEdit.attributes?.[attr.name]);
                    if (val === undefined || val === null) {
                        initialData[attr.name] = attr.type === 'boolean' ? false : "";
                    } else {
                        initialData[attr.name] = val;
                    }
                });
            } else {
                processedData.forEach(attr => {
                    initialData[attr.name] = attr.type === 'boolean' ? false : "";
                });
            }
            setFormData(initialData);

        } catch (err) {
            console.error("Error fetching attributes", err);
            // Non-blocking error, but good to know
        }
    };

    useEffect(() => {
        if (isOpen) {
            setError(null);
            fetchAttributes(); // Fetch attributes on open

            if (followupToEdit) {
                // Handle extraction of YYYY-MM-DD from DateTime string if necessary
                const dateVal = followupToEdit.follow_up_date ? followupToEdit.follow_up_date.split('T')[0] : new Date().toISOString().split('T')[0];
                setFollowUpDate(dateVal);
                setComment(followupToEdit.comment || "");
            } else {
                setFollowUpDate(new Date().toISOString().split('T')[0]);
                setComment("");
                setFormData({});
            }
        }
    }, [isOpen, followupToEdit]);

    const handleAttributeChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (!followUpDate || !comment.trim()) {
            setError("Date and Comment are required.");
            return;
        }

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

            const payload = {
                follow_up_date: followUpDate,
                comment,
                attributes: formattedAttributes,
                service: serviceId,
                user: user.id
            };

            if (followupToEdit) {
                await updateFollowup(serviceId, followupToEdit.id, payload);
            } else {
                await createFollowup(serviceId, payload);
            }
            onFollowupSaved();
            onClose();
        } catch (err) {
            console.error("Error saving follow-up", err);
            setError(`Failed to save follow-up. ${err.message || ""}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={followupToEdit ? "Edit Follow Up" : "New Follow Up"}
            showFooter={false}
        >
            <div className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                        {error}
                    </div>
                )}

                {/* Dynamic Attributes */}
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

                <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <DateInput
                        id="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea
                        id="comment"
                        placeholder="Details about the follow-up..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>

                <div className="flex justify-end pt-4 gap-2 border-t mt-4">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : followupToEdit ? "Update" : "Create"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
