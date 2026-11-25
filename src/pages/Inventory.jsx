import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus, Boxes } from "lucide-react";
import { getInventoryItems, deleteInventoryItem, getInventoryItemAttributes } from "../services/inventoryService";
import Swal from "sweetalert2";
import { formatDecimal } from "@/lib/utils";

import { PageHeader } from "@/components/PageHeader";
export const Inventory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    const staticColumns = [
        { key: "sku", label: "SKU" },
        { key: "for_name", label: "Stock of", render: (value) => value || "—" },
        {
            key: "quantity_on_hand",
            label: "Quantity",
            render: (value) => formatDecimal(value)
        },
        {
            key: "reorder_level",
            label: "Reorder Lvl",
            render: (value) => formatDecimal(value)
        },
        { key: "location", label: "Location" },
        { key: "supplier_name", label: "Supplier", render: (value) => value || "-" },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsData, attributesData] = await Promise.all([
                getInventoryItems(),
                getInventoryItemAttributes()
            ]);

            const processedItems = itemsData.map(item => ({
                ...item,
                ...(item.attributes || {})
            }));
            setItems(processedItems);
            setAttributes(attributesData);

            // Dynamic columns from attributes
            const dynamicColumns = attributesData.map(attr => ({
                key: attr.name,
                label: attr.label
            }));

            setColumns([...staticColumns, ...dynamicColumns]);

        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        navigate(`/inventory/${item.id}`);
    };

    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await deleteInventoryItem(item.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Inventory item has been deleted.',
                    'success'
                );
            } catch (error) {
                console.error("Error deleting item", error);
                Swal.fire(
                    'Error!',
                    'There was an error deleting the item.',
                    'error'
                );
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <PageHeader icon={Boxes} title="Inventory" description="Manage physical stock and locations." className="mb-2">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate("/inventory/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Inventory
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <Table
                    data={items}
                    columns={columns}
                    onEdit={handleEdit}
                    onAskDelete={handleDelete}
                    searchable={true}
                />
            </div>
        </div>
    );
};
