import React, { useEffect, useState } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPipelines } from "../services/pipelineService";
import { getPipelineAttributes, createPipelineAttribute, updatePipelineAttribute, deletePipelineAttribute } from "../services/pipelineAttributeService";
import { AttributeForm } from "../components/attributes/AttributeForm";
import { 
    Plus, Edit2, ChevronLeft, ChevronRight, SlidersHorizontal, 
    GripVertical, Trash2, Package, GitMerge, AlertCircle 
} from "lucide-react";
import Swal from "sweetalert2";

const FONT = '"Source Sans 3", Arial, sans-serif';
const INK = "#2E2A26";
const MUTED = "#6b6560";
const HINT = "#9b948e";
const LINEN = "#FBF7EF";
const OAT = "#F2EBDD";
const PEBBLE = "#D8D2C4";
const OLIVE = "#5E6A43";

const TYPE_COLORS = {
    text:     { bg: "rgba(94,106,67,0.10)",  border: "rgba(94,106,67,0.35)",  color: "#4a5535" },
    boolean:  { bg: "rgba(242,155,107,0.12)", border: "rgba(242,155,107,0.4)", color: "#c0622a" },
    list:     { bg: "rgba(184,199,106,0.12)", border: "rgba(184,199,106,0.4)", color: "#697a28" },
    number:   { bg: "rgba(216,210,196,0.4)",  border: "#D8D2C4",               color: "#6b6560" },
    date:     { bg: "rgba(216,210,196,0.4)",  border: "#D8D2C4",               color: "#6b6560" },
    textarea: { bg: "rgba(216,210,196,0.4)",  border: "#D8D2C4",               color: "#6b6560" },
};

const TypePill = ({ type }) => {
    const c = TYPE_COLORS[type?.toLowerCase()] || TYPE_COLORS.number;
    return (
        <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}
        >
            {type}
        </span>
    );
};

const Modal = ({ isOpen, children, onClose }) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(46,42,38,0.4)" }}
        >
            <div
                className="w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
                style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4" }}
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
};

const SortableAttrCard = ({ attr, onEdit, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: attr.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group/item flex items-center justify-between p-3 rounded-lg transition-all bg-white border"
            onMouseEnter={e => {
                if (!isDragging) {
                    e.currentTarget.style.borderColor = OLIVE;
                    e.currentTarget.style.backgroundColor = "#FBF7EF";
                }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = PEBBLE;
                e.currentTarget.style.backgroundColor = "white";
            }}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="flex items-center justify-center mr-2 shrink-0 cursor-grab active:cursor-grabbing p-1"
                style={{ color: PEBBLE, touchAction: "none" }}
            >
                <GripVertical size={14} />
            </button>

            {/* Order badge */}
            <span
                className="shrink-0 mr-2 text-[9px] font-black tabular-nums flex items-center justify-center rounded"
                style={{
                    minWidth: "18px", height: "18px",
                    backgroundColor: "rgba(94,106,67,0.12)",
                    border: "1px solid rgba(94,106,67,0.25)",
                    color: OLIVE,
                    padding: "0 3px",
                }}
            >
                {attr.order ?? 0}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs uppercase tracking-tight truncate" style={{ color: INK }}>
                        {attr.label}
                    </p>
                    {attr.is_required && (
                        <span className="text-[9px] font-bold" style={{ color: "#c0392b" }} title="Required">●</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <TypePill type={attr.type} />
                    <span className="font-mono text-[9px] truncate opacity-60" style={{ color: MUTED }}>#{attr.name}</span>
                </div>
            </div>

            <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2">
                <button
                    onClick={() => onEdit(attr)}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer text-olive"
                    style={{ color: OLIVE }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Edit2 size={13} />
                </button>
                <button
                    onClick={() => onDelete(attr.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer"
                    style={{ color: "#c0392b" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(192,57,43,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
};

const PipelineColumn = ({ pipeline, attributes, onAdd, onEdit, onDelete, onDragEnd, sensors }) => {
    const attrIds = attributes.map(a => a.id);

    return (
        <div
            className="flex-shrink-0 w-[85vw] md:w-[360px] flex flex-col rounded-2xl h-full border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            style={{ borderColor: PEBBLE }}
        >
            {/* Column header */}
            <div
                className="px-5 py-4 flex justify-between items-center shrink-0"
                style={{ backgroundColor: OLIVE, borderBottom: `1px solid ${OLIVE}` }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold uppercase shadow-inner"
                        style={{ backgroundColor: "rgba(251,247,239,0.15)", color: LINEN }}
                    >
                        {pipeline.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none" style={{ color: LINEN }}>
                            {pipeline.name}
                        </p>
                        <span className="text-[9px] font-medium" style={{ color: "rgba(251,247,239,0.7)" }}>
                            {attributes.length} {attributes.length === 1 ? 'field' : 'fields'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => onAdd(pipeline)}
                    className="flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    style={{ backgroundColor: "rgba(251,247,239,0.2)", color: LINEN, border: "1px solid rgba(251,247,239,0.3)" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(251,247,239,0.3)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(251,247,239,0.2)"}
                >
                    <Plus size={12} /> New
                </button>
            </div>

            {/* Attribute list with drag-and-drop */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
                {attributes.length === 0 ? (
                    <div
                        className="h-32 flex flex-col items-center justify-center rounded-xl border-2 border-dashed m-1"
                        style={{ borderColor: PEBBLE, color: HINT }}
                    >
                        <Package className="opacity-20 mb-2" size={24} />
                        <p className="text-[10px] uppercase tracking-widest font-bold">No Fields</p>
                        <p className="text-[9px] mt-1 opacity-60 italic">Define form fields</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => onDragEnd(pipeline.id, e)}
                    >
                        <SortableContext items={attrIds} strategy={verticalListSortingStrategy}>
                            {attributes.map(attr => (
                                <SortableAttrCard
                                    key={attr.id}
                                    attr={attr}
                                    onEdit={(a) => onEdit(pipeline, a)}
                                    onDelete={(id) => onDelete(pipeline.id, id)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
};

export const PipelineAttributesAdmin = () => {
    const [pipelines, setPipelines] = useState([]);
    const [attributesData, setAttributesData] = useState({});
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPipeline, setCurrentPipeline] = useState(null);
    const [editingAttribute, setEditingAttribute] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const fetchData = async () => {
        setLoading(true);
        try {
            const pipes = await getPipelines();
            const pipelinesList = pipes.results || pipes || [];
            setPipelines(pipelinesList);

            const attrResults = await Promise.all(
                pipelinesList.map(p => getPipelineAttributes(p.id))
            );

            const newData = {};
            pipelinesList.forEach((p, idx) => {
                newData[p.id] = attrResults[idx] || [];
            });
            setAttributesData(newData);
        } catch (error) {
            console.error("Error fetching pipeline attributes data", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load pipelines and fields.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddClick = (pipeline) => {
        setCurrentPipeline(pipeline);
        setEditingAttribute(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (pipeline, attribute) => {
        setCurrentPipeline(pipeline);
        setEditingAttribute(attribute);
        setIsModalOpen(true);
    };

    const handleCreateOrUpdate = async (data) => {
        setFormLoading(true);
        try {
            if (editingAttribute) {
                await updatePipelineAttribute(currentPipeline.id, editingAttribute.id, data);
            } else {
                await createPipelineAttribute(currentPipeline.id, data);
            }
            const updatedList = await getPipelineAttributes(currentPipeline.id);
            setAttributesData(prev => ({ ...prev, [currentPipeline.id]: updatedList }));
            setIsModalOpen(false);
            setEditingAttribute(null);
            Swal.fire({ 
                icon: 'success', 
                title: editingAttribute ? 'Field Updated' : 'Field Created', 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 3000 
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Operation failed' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (pipelineId, id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This field will be removed from the pipeline form. Existing data remains in the database.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: OLIVE,
            cancelButtonColor: HINT,
            confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;

        try {
            await deletePipelineAttribute(pipelineId, id);
            const updatedList = await getPipelineAttributes(pipelineId);
            setAttributesData(prev => ({ ...prev, [pipelineId]: updatedList }));
            Swal.fire({ icon: 'success', title: 'Deleted!', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch {
            Swal.fire({ icon: 'error', title: 'Error!', text: 'Failed to delete field.' });
        }
    };

    const handleDragEnd = async (pipelineId, event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const items = attributesData[pipelineId] || [];
        const oldIndex = items.findIndex(a => a.id === active.id);
        const newIndex = items.findIndex(a => a.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Optimistic UI update
        setAttributesData(prev => ({ ...prev, [pipelineId]: reordered }));

        // Persist new order values
        try {
            await Promise.all(
                reordered.map((attr, idx) =>
                    attr.order !== idx + 1
                        ? updatePipelineAttribute(pipelineId, attr.id, { order: idx + 1 })
                        : Promise.resolve()
                )
            );
            // Sync from server to get clean data
            const updated = await getPipelineAttributes(pipelineId);
            setAttributesData(prev => ({ ...prev, [pipelineId]: updated }));
        } catch {
            // Revert on failure
            setAttributesData(prev => ({ ...prev, [pipelineId]: items }));
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save new order.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: LINEN, color: MUTED }}>
                <div className="w-10 h-10 border-4 border-t-olive border-olive/20 rounded-full animate-spin mb-4" style={{ borderTopColor: OLIVE }} />
                <p className="text-sm font-medium">Loading pipelines and fields...</p>
            </div>
        );
    }

    return (
        <div
            className="flex-1 flex flex-col min-h-0 overflow-hidden w-full"
            style={{ backgroundColor: LINEN, fontFamily: FONT }}
        >
            {/* Page header */}
            <div
                className="shrink-0 px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                style={{ borderBottom: `1px solid ${PEBBLE}`, backgroundColor: "#F2EBDD" }}
            >
                <div className="flex items-center gap-4">
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", border: `1px solid rgba(94,106,67,0.3)` }}
                    >
                        <SlidersHorizontal className="h-6 w-6" style={{ color: OLIVE }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight" style={{ color: INK }}>
                            Pipeline Attributes
                        </h1>
                        <p className="text-xs flex items-center gap-2 mt-1" style={{ color: HINT }}>
                            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: OLIVE }} />
                            Configure custom form fields for each sales process. Drag to reorder.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <span
                        className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm"
                        style={{ backgroundColor: "rgba(94,106,67,0.1)", border: `1px solid ${PEBBLE}`, color: OLIVE }}
                    >
                        {pipelines.length} Pipelines
                    </span>
                </div>
            </div>

            {/* Kanban board */}
            <div className="flex-1 min-h-0 overflow-hidden p-6 relative group/board">
                {/* Scroll fade overlays */}
                <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#FBF7EF] to-transparent pointer-events-none z-10 opacity-0 group-hover/board:opacity-100 transition-opacity" />
                <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#FBF7EF] to-transparent pointer-events-none z-10 opacity-0 group-hover/board:opacity-100 transition-opacity" />

                {/* Scroll buttons */}
                <button
                    onClick={() => document.getElementById('attr-scroll-container').scrollBy({ left: -400, behavior: 'smooth' })}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full opacity-0 group-hover/board:opacity-100 transition-all hover:scale-110 hidden md:flex bg-white shadow-lg border"
                    style={{ borderColor: PEBBLE, color: OLIVE }}
                >
                    <ChevronLeft size={18} />
                </button>

                <button
                    onClick={() => document.getElementById('attr-scroll-container').scrollBy({ left: 400, behavior: 'smooth' })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full opacity-0 group-hover/board:opacity-100 transition-all hover:scale-110 hidden md:flex bg-white shadow-lg border"
                    style={{ borderColor: PEBBLE, color: OLIVE }}
                >
                    <ChevronRight size={18} />
                </button>

                <div
                    id="attr-scroll-container"
                    className="flex gap-6 overflow-x-auto pb-6 h-full scroll-smooth"
                    style={{ scrollbarWidth: "thin", scrollbarColor: `${PEBBLE} transparent` }}
                >
                    {pipelines.map(pipeline => (
                        <PipelineColumn
                            key={pipeline.id}
                            pipeline={pipeline}
                            attributes={attributesData[pipeline.id] || []}
                            onAdd={handleAddClick}
                            onEdit={handleEditClick}
                            onDelete={handleDelete}
                            onDragEnd={handleDragEnd}
                            sensors={sensors}
                        />
                    ))}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAttribute(null); }}>
                <AttributeForm
                    entity={currentPipeline?.name}
                    onSubmit={handleCreateOrUpdate}
                    onCancel={() => { setIsModalOpen(false); setEditingAttribute(null); }}
                    isLoading={formLoading}
                    initialData={editingAttribute}
                    defaultOrder={(attributesData[currentPipeline?.id]?.length ?? 0) + 1}
                    supportsUnique
                />
            </Modal>
        </div>
    );
};
