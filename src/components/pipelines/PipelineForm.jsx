import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { createPipeline, updatePipeline } from "../../services/pipelineService";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";

export const PipelineForm = ({ onPipelineSaved, initialData = null }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            name: "",
            stages: [
                { name: "Prospecting", color: "#6c6f73", order: 1 },
                { name: "Negotiation", color: "#007bff", order: 2 }
            ]
        }
    });

    useEffect(() => {
        if (initialData) {
            reset({
                name: initialData.name,
                stages: initialData.stages || []
            });
        }
    }, [initialData, reset]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "stages"
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError(null);
        try {
            // Ensure orders are correct 
            const formattedData = {
                ...data,
                stages: data.stages.map(({ id, ...stage }, index) => ({
                    ...stage,
                    order: index + 1
                }))
            };

            if (initialData && initialData.id) {
                await updatePipeline(initialData.id, formattedData);
            } else {
                await createPipeline(formattedData);
            }

            if (onPipelineSaved) onPipelineSaved();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to save pipeline");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            <h2 className="text-xl font-bold mb-4 text-foreground">{initialData ? "Edit Pipeline" : "Create New Pipeline"}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Pipeline Name</label>
                    <input
                        {...register("name", { required: "Pipeline name is required" })}
                        className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                        placeholder="e.g. B2B Sales"
                    />
                    {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-muted-foreground">Stages</label>
                        <button
                            type="button"
                            onClick={() => append({ name: "", color: "#000000", order: fields.length + 1 })}
                            className="flex items-center text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-md hover:bg-secondary/80 transition-colors"
                        >
                            <Plus size={14} className="mr-1" /> Add Stage
                        </button>
                    </div>

                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border group">
                                <GripVertical size={16} className="text-muted-foreground cursor-move" />

                                <div className="flex-1">
                                    <input
                                        {...register(`stages.${index}.name`, {
                                            required: "Stage name is required",
                                            validate: (value) => {
                                                const lower = value.toLowerCase();
                                                if (lower === 'won' || lower === 'lost') {
                                                    return "Stage name cannot be 'Won' or 'Lost'";
                                                }
                                                return true;
                                            }
                                        })}
                                        placeholder="Stage Name"
                                        className="w-full p-1.5 text-sm bg-transparent border-b border-transparent focus:border-primary-text focus:outline-none transition-colors"
                                    />
                                    {errors.stages?.[index]?.name && <span className="text-red-500 text-[10px]">{errors.stages[index].name.message}</span>}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        {...register(`stages.${index}.color`)}
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                        title="Stage Color"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                        title="Remove Stage"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isLoading ? "Creating..." : <><Save size={18} /> Create Pipeline</>}
                    </button>
                </div>
            </form>
        </div>
    );
};
