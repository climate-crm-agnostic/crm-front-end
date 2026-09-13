import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';

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

    const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
        defaultValues: getDefaultValues()
    });

    React.useEffect(() => { reset(getDefaultValues()); }, [initialData, reset]);

    const selectedType = watch("type");
    const isRequired = watch("is_required");
    const isUnique = watch("is_unique");

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
                <p className="text-lg font-semibold" style={{ color: "var(--secondary)" }}>
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
            <div className="space-y-2">
                <Label htmlFor="name">Name (Key)</Label>
                <Input
                    id="name"
                    {...register("name", { required: "Name is required" })}
                    placeholder="e.g. industry_sector"
                    disabled={isEdit}
                />
                {errors.name && <span className="text-sm" style={{ color: "var(--destructive)" }}>{errors.name.message}</span>}
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    Internal identifier (unique, no spaces). Cannot be changed after creation.
                </p>
            </div>

            {/* Label */}
            <div className="space-y-2">
                <Label htmlFor="label">Label (Display Name)</Label>
                <Input
                    id="label"
                    {...register("label", { required: "Label is required" })}
                    placeholder="e.g. Industry Sector"
                />
                {errors.label && <span className="text-sm" style={{ color: "var(--destructive)" }}>{errors.label.message}</span>}
            </div>

            {/* Order */}
            <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                    id="order"
                    type="number"
                    min="1"
                    {...register("order", { required: "Order is required", valueAsNumber: true, min: { value: 1, message: "Minimum value is 1" } })}
                />
                {errors.order && <span className="text-sm" style={{ color: "var(--destructive)" }}>{errors.order.message}</span>}
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    Controls the position of this field in forms. Lower numbers appear first.
                </p>
            </div>

            {/* Type */}
            <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                    id="type"
                    {...register("type", { required: "Type is required" })}
                    disabled={isEdit}
                    className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
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
                <div className="space-y-2">
                    <Label htmlFor="list_values">List Options (comma separated)</Label>
                    <Textarea
                        id="list_values"
                        {...register("list_values", { required: "List options are required" })}
                        className="h-20 min-h-[80px]"
                        placeholder="Option 1, Option 2, Option 3"
                    />
                    {errors.list_values && <span className="text-sm" style={{ color: "var(--destructive)" }}>{errors.list_values.message}</span>}
                </div>
            )}

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    {...register("description")}
                    className="h-18 min-h-[72px]"
                    placeholder="Describe what this attribute is for..."
                />
            </div>

            {/* Required checkbox */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="is_required"
                    checked={!!isRequired}
                    onCheckedChange={(checked) => setValue("is_required", checked === true)}
                />
                <Label htmlFor="is_required" className="cursor-pointer">
                    Required Field
                </Label>
            </div>

            {/* Unique checkbox */}
            {supportsUnique && (
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="is_unique"
                        checked={!!isUnique}
                        onCheckedChange={(checked) => setValue("is_unique", checked === true)}
                    />
                    <Label htmlFor="is_unique" className="cursor-pointer">
                        Unique — no two leads can share this value
                    </Label>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Attribute'}
                </Button>
            </div>
        </form>
    );
};
