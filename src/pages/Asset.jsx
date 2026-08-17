import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import { getAssets, deleteAsset, getAssetAttributes } from "../services/assetService";
import Swal from "sweetalert2";

export const Asset = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    const staticColumns = [
        { key: "name", label: "Name" },
        {
            key: "bought_date",
            label: "Bought Date"
        },
        {
            key: "price",
            label: "Price",
            render: (value) => value ? `$${Number(value).toFixed(2)}` : '-'
        },
        { key: "quantity", label: "Quantity" }
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsData, attributesData] = await Promise.all([
                getAssets(),
                getAssetAttributes()
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
        navigate(`/asset/${item.id}`);
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
                await deleteAsset(item.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Asset has been deleted.',
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Assets
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage physical company assets and supplies.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate("/asset/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Asset
                    </Button>
                </div>
            </div>

            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
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
