import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { createPipeline, updatePipeline } from "../../services/pipelineService";
import { Plus, Trash2, Save, GripVertical, FileSignature, Check } from "lucide-react";

const isReserved = (name) => {
    const n = (name || "").trim().toLowerCase();
    return n === "won" || n === "lost";
};
const isContractStage = (name) => (name || "").trim().toLowerCase() === "contract";

const CONTRACT_COLOR = "#F29B6B";

export const PipelineForm = ({ onPipelineSaved, initialData = null }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // The "Contract" stage is optional and reserved-by-name: it's toggled on/off
    // here, not typed as a free stage. Won/Lost are never shown — the backend
    // always re-appends them. Default ON for new pipelines (mirrors the backend
    // create() default).
    const [hasContractStage, setHasContractStage] = useState(true);

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
            const allStages = initialData.stages || [];
            // Won/Lost are auto-managed by the backend — never editable here.
            // "Contract" is optional and controlled by its own toggle, so it's
            // kept out of the editable rows too.
            const userStages = allStages.filter(
                (s) => !isReserved(s.name) && !isContractStage(s.name)
            );
            setHasContractStage(allStages.some((s) => isContractStage(s.name)));
            reset({
                name: initialData.name,
                stages: userStages,
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
            // Rebuild the ordered stage list from the user's rows, then append
            // the optional "Contract" stage if it's toggled on. Won/Lost are
            // added by the backend (pipelines_serializer). Drop existing ids so
            // orders are recomputed cleanly by index.
            const userStages = data.stages.map((stage, index) => {
                const { id: _id, ...rest } = stage;
                void _id;
                return { ...rest, order: index + 1 };
            });

            if (hasContractStage) {
                userStages.push({
                    name: "Contract",
                    color: CONTRACT_COLOR,
                    order: userStages.length + 1,
                });
            }

            const formattedData = { ...data, stages: userStages };

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
                                                    return "Stage name cannot be 'Won' or 'Lost' (added automatically)";
                                                }
                                                if (lower === 'contract') {
                                                    return "Use the Contract stage toggle below instead of a stage named 'Contract'";
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

                    {/* Optional reserved "Contract" stage. On new pipelines it's
                        always added by default (backend); on edit it can be
                        toggled off to remove it. When present, a contract must
                        be created before a lead can be marked Won. */}
                    {initialData ? (
                        <div
                            className="flex items-center justify-between gap-3 p-3 rounded-md border transition-colors"
                            style={hasContractStage
                                ? { borderColor: CONTRACT_COLOR, backgroundColor: "color-mix(in srgb, " + CONTRACT_COLOR + " 12%, transparent)" }
                                : { borderColor: "var(--border)", backgroundColor: "var(--muted)" }}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: CONTRACT_COLOR }} />
                                <FileSignature size={16} className="text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">Contract stage</p>
                                        {hasContractStage ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: CONTRACT_COLOR, color: "#fff" }}>
                                                <Check size={10} /> Enabled
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted-foreground/15 text-muted-foreground">
                                                Off
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        A reserved “Contract” stage before Won. When enabled, a contract must be created before a lead can be won.
                                    </p>
                                </div>
                            </div>
                            {hasContractStage ? (
                                <button
                                    type="button"
                                    onClick={() => setHasContractStage(false)}
                                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors cursor-pointer"
                                >
                                    <Trash2 size={14} /> Remove
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setHasContractStage(true)}
                                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90 cursor-pointer"
                                    style={{ backgroundColor: CONTRACT_COLOR }}
                                >
                                    <Plus size={14} /> Add Contract stage
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <FileSignature size={12} />
                            A “Contract” stage is added automatically (removable later by editing the pipeline).
                        </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                        “Won” and “Lost” stages are always added automatically and can’t be edited here.
                    </p>
                </div>

                {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isLoading ? "Saving..." : <><Save size={18} /> {initialData ? "Save Pipeline" : "Create Pipeline"}</>}
                    </button>
                </div>
            </form>
        </div>
    );
};
