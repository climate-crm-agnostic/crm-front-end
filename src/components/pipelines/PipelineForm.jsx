import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { createPipeline, updatePipeline } from "../../services/pipelineService";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

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
                stages: data.stages.map(({ id: _id, ...stage }, index) => ({
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="pipeline_name">Pipeline Name</Label>
                <Input
                    id="pipeline_name"
                    {...register("name", { required: "Pipeline name is required" })}
                    placeholder="e.g. B2B Sales"
                />
                {errors.name && <span className="text-sm" style={{ color: "var(--destructive)" }}>{errors.name.message}</span>}
            </div>

            <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm text-muted-foreground">Stages</h4>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => append({ name: "", color: "#000000", order: fields.length + 1 })}
                    >
                        <Plus size={14} /> Add Stage
                    </Button>
                </div>

                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border group">
                            <GripVertical size={16} className="text-muted-foreground cursor-move" />

                            <div className="flex-1">
                                <Input
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
                                    className="h-8"
                                />
                                {errors.stages?.[index]?.name && <span className="text-xs" style={{ color: "var(--destructive)" }}>{errors.stages[index].name.message}</span>}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    {...register(`stages.${index}.color`)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                    title="Stage Color"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => remove(index)}
                                    title="Remove Stage"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isLoading}>
                    <Save size={16} /> {isLoading ? "Saving..." : initialData ? "Save Pipeline" : "Create Pipeline"}
                </Button>
            </div>
        </form>
    );
};
