import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Plus, MoreHorizontal, SquarePen, OctagonX } from "lucide-react";
import { getAssets, deleteAsset, getAssetAttributes } from "../services/assetService";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "../components/ui/dropdown-menu";
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

    const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const stats = [
        { label: "Total assets", value: items.length },
        { label: "Total quantity", value: totalQuantity },
        { label: "Total value", value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    ];

    const renderAssetCard = (item) => (
        <div
            className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors"
            style={{ backgroundColor: "#FBF7EF", border: "1px solid #D8D2C4" }}
        >
            <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(item)}>
                <p className="text-sm font-semibold truncate" style={{ color: "#2E2A26" }}>{item.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9b948e" }}>{item.bought_date ? `Bought ${item.bought_date}` : "—"}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "#2E2A26" }}>
                        {item.price ? `$${Number(item.price).toFixed(2)}` : "—"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9b948e" }}>Qty {item.quantity ?? "—"}</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer" style={{ color: "#6b6560" }}>
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <SquarePen className="w-4 h-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:text-destructive focus:text-destructive" onClick={() => handleDelete(item)}>
                            <OctagonX className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Assets
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage physical company assets and supplies.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => navigate("/asset/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Asset
                    </Button>
                </div>
            </div>

            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={items}
                    stats={stats}
                    renderCard={renderAssetCard}
                    searchKeys={["name"]}
                    loading={loading}
                    emptyLabel="No assets yet."
                />
            </div>
        </div>
    );
};
