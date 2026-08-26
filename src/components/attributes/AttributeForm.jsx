import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { ATTRIBUTE_TYPES } from '../../utils/attributeTypes';
import { COUNTRY_LIST, guessDefaultCountry } from '../../utils/phoneCountries';

const inputClass = {
    backgroundColor: "#fff",
    border: "1px solid #D8D2C4",
    color: "#2E2A26",
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
    color: "#6b6560",
    marginBottom: "5px",
    fontFamily: '"Source Sans 3", Arial, sans-serif',
};

export const AttributeForm = ({ entity, onSubmit, onCancel, isLoading, initialData = null, defaultOrder = 1, supportsUnique = false }) => {
    const isEdit = !!initialData;

    const getDefaultValues = () => {
        if (!initialData) return { order: defaultOrder, format_symbol: '$', format_decimals: 2, format_default_country: '' };
        const formatConfig = initialData.format_config || {};
        return {
            ...initialData,
            list_values: Array.isArray(initialData.list_values)
                ? initialData.list_values.join(', ')
                : initialData.list_values,
            format_symbol: formatConfig.symbol ?? '$',
            format_decimals: formatConfig.decimals ?? 2,
            format_default_country: formatConfig.default_country ?? '',
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
        if (data.type === 'currency') {
            payload.format_config = { symbol: data.format_symbol || '$', decimals: Number(data.format_decimals) || 0 };
        } else if (data.type === 'phone') {
            payload.format_config = data.format_default_country ? { default_country: data.format_default_country } : {};
        } else {
            payload.format_config = {};
        }
        delete payload.format_symbol;
        delete payload.format_decimals;
        delete payload.format_default_country;
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
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#2E2A26" }}>
                    {isEdit ? 'Edit Attribute' : `Add Attribute — ${entity}`}
                </p>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer"
                    style={{ color: "#9b948e", backgroundColor: "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
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
                    onFocus={e => !isEdit && (e.target.style.borderColor = "#5E6A43")}
                    onBlur={e => e.target.style.borderColor = "#D8D2C4"}
                />
                {errors.name && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.name.message}</span>}
                <p style={{ fontSize: "11px", color: "#9b948e", marginTop: "3px" }}>
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
                    onFocus={e => e.target.style.borderColor = "#5E6A43"}
                    onBlur={e => e.target.style.borderColor = "#D8D2C4"}
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
                    onFocus={e => e.target.style.borderColor = "#5E6A43"}
                    onBlur={e => e.target.style.borderColor = "#D8D2C4"}
                />
                {errors.order && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.order.message}</span>}
                <p style={{ fontSize: "11px", color: "#9b948e", marginTop: "3px" }}>
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
                    {ATTRIBUTE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
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
                        onFocus={e => e.target.style.borderColor = "#5E6A43"}
                        onBlur={e => e.target.style.borderColor = "#D8D2C4"}
                    />
                    {errors.list_values && <span style={{ color: "#c0392b", fontSize: "11px" }}>{errors.list_values.message}</span>}
                </div>
            )}

            {/* Currency format */}
            {selectedType === 'currency' && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label style={labelClass}>Symbol</label>
                        <input
                            {...register("format_symbol")}
                            style={inputClass}
                            placeholder="$"
                            onFocus={e => e.target.style.borderColor = "#5E6A43"}
                            onBlur={e => e.target.style.borderColor = "#D8D2C4"}
                        />
                    </div>
                    <div>
                        <label style={labelClass}>Decimals</label>
                        <input
                            type="number"
                            min="0"
                            max="4"
                            {...register("format_decimals", { valueAsNumber: true })}
                            style={inputClass}
                            onFocus={e => e.target.style.borderColor = "#5E6A43"}
                            onBlur={e => e.target.style.borderColor = "#D8D2C4"}
                        />
                    </div>
                </div>
            )}

            {/* Phone default country */}
            {selectedType === 'phone' && (
                <div>
                    <label style={labelClass}>Default Country</label>
                    <select
                        {...register("format_default_country")}
                        style={{ ...inputClass, appearance: "auto" }}
                    >
                        <option value="">Guess from browser ({guessDefaultCountry()})</option>
                        {COUNTRY_LIST.map(c => (
                            <option key={c.code} value={c.code}>{c.flag} {c.name} (+{c.callingCode})</option>
                        ))}
                    </select>
                    <p style={{ fontSize: "11px", color: "#9b948e", marginTop: "3px" }}>
                        The country the phone input starts on. The person filling in a value can always switch it — the mask is applied automatically per country, no pattern to configure.
                    </p>
                </div>
            )}

            {/* Description */}
            <div>
                <label style={labelClass}>Description</label>
                <textarea
                    {...register("description")}
                    style={{ ...inputClass, height: "72px", resize: "vertical" }}
                    placeholder="Describe what this attribute is for..."
                    onFocus={e => e.target.style.borderColor = "#5E6A43"}
                    onBlur={e => e.target.style.borderColor = "#D8D2C4"}
                />
            </div>

            {/* Required checkbox */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is_required"
                    {...register("is_required")}
                    style={{ accentColor: "#5E6A43", width: "14px", height: "14px", cursor: "pointer" }}
                />
                <label htmlFor="is_required" style={{ fontSize: "13px", fontWeight: 500, color: "#2E2A26", cursor: "pointer" }}>
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
                        style={{ accentColor: "#5E6A43", width: "14px", height: "14px", cursor: "pointer" }}
                    />
                    <label htmlFor="is_unique" style={{ fontSize: "13px", fontWeight: 500, color: "#2E2A26", cursor: "pointer" }}>
                        Unique — no two leads can share this value
                    </label>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid #D8D2C4" }}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ border: "1px solid #D8D2C4", backgroundColor: "transparent", color: "#6b6560" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: isLoading ? "#4a5535" : "#5E6A43", color: "#FBF7EF", opacity: isLoading ? 0.7 : 1 }}
                    onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = "#4a5535")}
                    onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = "#5E6A43")}
                >
                    {isLoading ? 'Saving...' : 'Save Attribute'}
                </button>
            </div>
        </form>
    );
};
