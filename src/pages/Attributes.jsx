import React, { useEffect, useState } from 'react';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getAttributes, createAttribute, updateAttribute, deleteAttribute } from '../services/attributeService';
import { AttributeForm } from '../components/attributes/AttributeForm';
import { Plus, Trash, Edit, ChevronLeft, ChevronRight, SlidersHorizontal, GripVertical } from 'lucide-react';
import Swal from 'sweetalert2';

const TYPE_COLORS = {
    text:     { bg: "rgba(94,106,67,0.10)",  border: "rgba(94,106,67,0.35)",  color: "#4a5535" },
    boolean:  { bg: "rgba(242,155,107,0.12)", border: "rgba(242,155,107,0.4)", color: "#c0622a" },
    list:     { bg: "rgba(184,199,106,0.12)", border: "rgba(184,199,106,0.4)", color: "#697a28" },
    number:   { bg: "rgba(216,210,196,0.4)",  border: "#D8D2C4",               color: "#6b6560" },
    date:     { bg: "rgba(216,210,196,0.4)",  border: "#D8D2C4",               color: "#6b6560" },
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
                className="w-full max-w-md rounded-xl shadow-2xl p-6 relative"
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
            className="group/item flex items-center justify-between p-3 rounded-lg transition-all"
            onMouseEnter={e => {
                if (!isDragging) {
                    e.currentTarget.style.borderColor = "#5E6A43";
                    e.currentTarget.style.backgroundColor = "#ede7d9";
                }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#D8D2C4";
                e.currentTarget.style.backgroundColor = "#F2EBDD";
            }}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="flex items-center justify-center mr-2 shrink-0 cursor-grab active:cursor-grabbing"
                style={{ color: "#D8D2C4", touchAction: "none" }}
                title="Drag to reorder"
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
                    color: "#5E6A43",
                    padding: "0 3px",
                }}
            >
                {attr.order ?? 0}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs uppercase tracking-tight truncate" style={{ color: "#2E2A26" }}>
                        {attr.label}
                    </p>
                    {attr.is_required && (
                        <span className="text-[9px] font-bold" style={{ color: "#c0392b" }} title="Required">●</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <TypePill type={attr.type} />
                    <span className="font-mono text-[9px] truncate opacity-60" style={{ color: "#6b6560" }}>#{attr.name}</span>
                </div>
            </div>

            <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2">
                <button
                    onClick={() => onEdit(attr)}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer"
                    style={{ color: "#5E6A43" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    title="Edit"
                >
                    <Edit size={13} />
                </button>
                <button
                    onClick={() => onDelete(attr.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer"
                    style={{ color: "#c0392b" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(192,57,43,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    title="Delete"
                >
                    <Trash size={13} />
                </button>
            </div>
        </div>
    );
};

export const Attributes = () => {
    const [entities] = useState([
        'client', 'contact', 'lead', 'service',
        'category', 'catalogue_item', 'invoice', 'followup', 'inventory', 'asset', 'asset_assignment'
    ]);
    const [attributesData, setAttributesData] = useState({});
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntity, setCurrentEntity] = useState(null);
    const [editingAttribute, setEditingAttribute] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => { fetchAllAttributes(); }, []);

    const fetchAllAttributes = async () => {
        setLoading(true);
        try {
            const results = await Promise.all(entities.map(e => getAttributes(e)));
            const newData = {};
            entities.forEach((entity, index) => {
                newData[entity] = results[index].results || results[index] || [];
            });
            setAttributesData(newData);
        } catch (error) {
            console.error("Error fetching all attributes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = (entity) => {
        setCurrentEntity(entity);
        setEditingAttribute(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (entity, attribute) => {
        setCurrentEntity(entity);
        setEditingAttribute(attribute);
        setIsModalOpen(true);
    };

    const handleCreateOrUpdate = async (data) => {
        setFormLoading(true);
        try {
            if (editingAttribute) {
                await updateAttribute(editingAttribute.id, data);
            } else {
                await createAttribute(currentEntity, data);
            }
            const updatedList = await getAttributes(currentEntity);
            setAttributesData(prev => ({ ...prev, [currentEntity]: updatedList }));
            setIsModalOpen(false);
            setEditingAttribute(null);
            Swal.fire({ icon: 'success', title: editingAttribute ? 'Attribute Updated' : 'Attribute Created', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (entity, id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#5E6A43',
            cancelButtonColor: '#9b948e',
            confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteAttribute(entity, id);
            const updatedList = await getAttributes(entity);
            setAttributesData(prev => ({ ...prev, [entity]: updatedList }));
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Attribute deleted.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch {
            Swal.fire({ icon: 'error', title: 'Error!', text: 'Failed to delete attribute.' });
        }
    };

    const handleDragEnd = async (entity, event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const items = attributesData[entity] || [];
        const oldIndex = items.findIndex(a => a.id === active.id);
        const newIndex = items.findIndex(a => a.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Optimistic UI update
        setAttributesData(prev => ({ ...prev, [entity]: reordered }));

        // Persist new order values (1-based)
        try {
            await Promise.all(
                reordered.map((attr, idx) =>
                    attr.order !== idx + 1
                        ? updateAttribute(attr.id, { order: idx + 1 })
                        : Promise.resolve()
                )
            );
            // Sync from server to get updated order values
            const updated = await getAttributes(entity);
            setAttributesData(prev => ({ ...prev, [entity]: updated }));
        } catch {
            // Revert on failure
            setAttributesData(prev => ({ ...prev, [entity]: items }));
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save new order.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center" style={{ color: "#6b6560", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                Loading Attributes...
            </div>
        );
    }

    return (
        <div
            className="flex-1 flex flex-col min-h-0 overflow-hidden w-full"
            style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
        >
            {/* Page header */}
            <div
                className="shrink-0 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                style={{ borderBottom: "1px solid #D8D2C4", backgroundColor: "#F2EBDD" }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: "rgba(94,106,67,0.12)", border: "1px solid rgba(94,106,67,0.3)" }}
                    >
                        <SlidersHorizontal className="h-5 w-5" style={{ color: "#5E6A43" }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold uppercase tracking-wide" style={{ color: "#2E2A26", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                            Core Attributes Management
                        </p>
                        <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "#9b948e" }}>
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: "#5E6A43" }} />
                            Define and customize fields for your core system entities. Drag cards to reorder.
                        </p>
                    </div>
                </div>
                <span
                    className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(94,106,67,0.10)", border: "1px solid rgba(94,106,67,0.3)", color: "#5E6A43" }}
                >
                    {entities.length} Modules
                </span>
            </div>

            {/* Kanban board */}
            <div className="flex-1 min-h-0 overflow-hidden p-5 relative group/board">
                {/* Scroll left */}
                <button
                    onClick={() => document.getElementById('attr-scroll-container').scrollBy({ left: -420, behavior: 'smooth' })}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 flex items-center justify-center rounded-full hidden md:flex"
                    style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4", color: "#5E6A43", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Scroll right */}
                <button
                    onClick={() => document.getElementById('attr-scroll-container').scrollBy({ left: 420, behavior: 'smooth' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 flex items-center justify-center rounded-full hidden md:flex"
                    style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4", color: "#5E6A43", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                >
                    <ChevronRight size={16} />
                </button>

                <div
                    id="attr-scroll-container"
                    className="flex gap-5 overflow-x-auto pb-4 h-full scroll-smooth"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "#D8D2C4 transparent" }}
                >
                    {entities.map(entity => {
                        const label = entity === 'catalogue_item' ? 'Catalogue Item'
                            : entity === 'asset_assignment' ? 'Asset Assignment'
                            : entity.replace('_', ' ');
                        const attrs = attributesData[entity] || [];
                        const attrIds = attrs.map(a => a.id);

                        return (
                            <div
                                key={entity}
                                className="flex-shrink-0 w-[85vw] md:w-[360px] flex flex-col rounded-xl h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                                style={{ border: "1px solid #D8D2C4", backgroundColor: "#FBF7EF", overflow: "hidden" }}
                            >
                                {/* Column header */}
                                <div
                                    className="px-4 py-3 flex justify-between items-center shrink-0"
                                    style={{ backgroundColor: "#5E6A43", borderBottom: "1px solid #4a5535" }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold uppercase"
                                            style={{ backgroundColor: "rgba(251,247,239,0.15)", color: "#FBF7EF" }}
                                        >
                                            {entity.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest leading-none" style={{ color: "#FBF7EF" }}>
                                                {label}
                                            </p>
                                            <span className="text-[9px] font-medium" style={{ color: "rgba(251,247,239,0.6)" }}>
                                                {attrs.length} {attrs.length === 1 ? 'attribute' : 'attributes'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAddClick(entity)}
                                        className="flex items-center gap-1 px-3 h-7 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                                        style={{ backgroundColor: "rgba(251,247,239,0.15)", color: "#FBF7EF", border: "1px solid rgba(251,247,239,0.25)" }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(251,247,239,0.25)"}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(251,247,239,0.15)"}
                                    >
                                        <Plus size={11} /> New
                                    </button>
                                </div>

                                {/* Attribute list with drag-and-drop */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {attrs.length === 0 ? (
                                        <div
                                            className="h-24 flex flex-col items-center justify-center rounded-lg m-1"
                                            style={{ border: "1.5px dashed #D8D2C4", color: "#9b948e" }}
                                        >
                                            <p className="text-[10px] uppercase tracking-widest font-bold">No Attributes</p>
                                            <p className="text-[9px] mt-0.5 opacity-60 italic">Start by adding one</p>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(entity, e)}
                                        >
                                            <SortableContext items={attrIds} strategy={verticalListSortingStrategy}>
                                                {attrs.map(attr => (
                                                    <SortableAttrCard
                                                        key={attr.id}
                                                        attr={attr}
                                                        onEdit={(a) => handleEditClick(entity, a)}
                                                        onDelete={(id) => handleDelete(entity, id)}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAttribute(null); }}>
                <AttributeForm
                    entity={currentEntity}
                    onSubmit={handleCreateOrUpdate}
                    onCancel={() => { setIsModalOpen(false); setEditingAttribute(null); }}
                    isLoading={formLoading}
                    initialData={editingAttribute}
                    defaultOrder={(attributesData[currentEntity]?.length ?? 0) + 1}
                />
            </Modal>
        </div>
    );
};
