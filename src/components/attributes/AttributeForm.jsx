import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

const inputClass = {
    backgroundColor: "var(--background)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    borderRadius: "6px",
    padding: "8px 10px",
    fontSize: "14px",
    width: "100%",
    fontFamily: '"Source Sans 3", Arial, sans-serif',
    outline: "none",
};

const labelClass = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted-foreground)",
    marginBottom: "5px",
    fontFamily: '"Source Sans 3", Arial, sans-serif',
};

export const AttributeForm = ({ entity, onSubmit, onCancel, isLoading, initialData = null, defaultOrder = 1, supportsUnique = false }) => {
    const isEdit = !!initialData;

    const getDefaultValues = () => {
        if (!initialData) return { order: defaultOrder };
        return {
            ...initialData,
            list_values: Array.isArray(initialData.list_values)
                ? initialData.list_values.join(', ')
                : initialData.list_values
        };
    };

    const { register, handleSubmit, watch, formState: { errors }, reset } = useForm({
        defaultValues: getDefaultValues()
    });

    React.useEffect(() => { reset(getDefaultValues()); }, [initialData, reset]);

    const selectedType = watch("type");

    const handleFormSubmit = (data) => {
        let payload = { ...data, is_required: data.is_required === true };
        if (supportsUnique) {
            payload.is_unique = data.is_unique === true;
        }
        if (data.type === 'list' && typeof data.list_values === 'string') {
            payload.list_values = data.list_values.split(',').map(s => s.trim()).filter(s => s);
        } else {
            payload.list_values = [];
        }
        onSubmit(payload);
    };

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4"
            style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>
                    {isEdit ? 'Edit Attribute' : `Add Attribute — ${entity}`}
                </p>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer"
                    style={{ color: "var(--muted-foreground)", backgroundColor: "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--card)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Name */}
            <div>
                <label style={labelClass}>Name (Key)</label>
                <input
                    {...register("name", { required: "Name is required" })}
                    style={{ ...inputClass, opacity: isEdit ? 0.6 : 1, cursor: isEdit ? "not-allowed" : "text" }}
                    placeholder="e.g. industry_sector"
                    disabled={isEdit}
                    onFocus={e => !isEdit && (e.target.style.borderColor = "#1A3A30")}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                {errors.name && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.name.message}</span>}
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>
                    Internal identifier (unique, no spaces). Cannot be changed after creation.
                </p>
            </div>

            {/* Label */}
            <div>
                <label style={labelClass}>Label (Display Name)</label>
                <input
                    {...register("label", { required: "Label is required" })}
                    style={inputClass}
                    placeholder="e.g. Industry Sector"
                    onFocus={e => e.target.style.borderColor = "#1A3A30"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                {errors.label && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.label.message}</span>}
            </div>

            {/* Order */}
            <div>
                <label style={labelClass}>Display Order</label>
                <input
                    type="number"
                    min="1"
                    {...register("order", { required: "Order is required", valueAsNumber: true, min: { value: 1, message: "Minimum value is 1" } })}
                    style={inputClass}
                    onFocus={e => e.target.style.borderColor = "#1A3A30"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                {errors.order && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.order.message}</span>}
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>
                    Controls the position of this field in forms. Lower numbers appear first.
                </p>
            </div>

            {/* Type */}
            <div>
                <label style={labelClass}>Type</label>
                <select
                    {...register("type", { required: "Type is required" })}
                    style={{ ...inputClass, opacity: isEdit ? 0.6 : 1, cursor: isEdit ? "not-allowed" : "pointer", appearance: "auto" }}
                    disabled={isEdit}
                >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                    <option value="list">Select List</option>
                    <option value="textarea">Text Area</option>
                    <option value="file">File</option>
                </select>
            </div>

            {/* List options */}
            {selectedType === 'list' && (
                <div>
                    <label style={labelClass}>List Options (comma separated)</label>
                    <textarea
                        {...register("list_values", { required: "List options are required" })}
                        style={{ ...inputClass, height: "80px", resize: "vertical" }}
                        placeholder="Option 1, Option 2, Option 3"
                        onFocus={e => e.target.style.borderColor = "#1A3A30"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                    {errors.list_values && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.list_values.message}</span>}
                </div>
            )}

            {/* Description */}
            <div>
                <label style={labelClass}>Description</label>
                <textarea
                    {...register("description")}
                    style={{ ...inputClass, height: "72px", resize: "vertical" }}
                    placeholder="Describe what this attribute is for..."
                    onFocus={e => e.target.style.borderColor = "#1A3A30"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
            </div>

            {/* Required checkbox */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is_required"
                    {...register("is_required")}
                    style={{ accentColor: "#1A3A30", width: "14px", height: "14px", cursor: "pointer" }}
                />
                <label htmlFor="is_required" style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", cursor: "pointer" }}>
                    Required Field
                </label>
            </div>

            {/* Unique checkbox */}
            {supportsUnique && (
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_unique"
                        {...register("is_unique")}
                        style={{ accentColor: "#1A3A30", width: "14px", height: "14px", cursor: "pointer" }}
                    />
                    <label htmlFor="is_unique" style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", cursor: "pointer" }}>
                        Unique — no two leads can share this value
                    </label>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--muted-foreground)" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--card)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: isLoading ? "#14302A" : "#1A3A30", color: "var(--background)", opacity: isLoading ? 0.7 : 1 }}
                    onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = "#14302A")}
                    onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = "#1A3A30")}
                >
                    {isLoading ? 'Saving...' : 'Save Attribute'}
                </button>
            </div>
        </form>
    );
};
