import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RowActions } from "../components/Table";
import { TableSummary } from "../components/TableSummary";
import { Button } from "../components/ui/button";
import { Plus, Package } from "lucide-react";
import { getAssets, deleteAsset } from "../services/assetService";
import Swal from "sweetalert2";
import { formatCount, formatDecimal } from "@/lib/utils";

import { PageHeader } from "@/components/PageHeader";
export const Asset = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const itemsData = await getAssets();
            const processedItems = itemsData.map(item => ({
                ...item,
                ...(item.attributes || {})
            }));
            setItems(processedItems);
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
        { label: "Total value", value: `$${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` },
    ];

    const renderAssetCard = (item) => {
        const subtitle = [
            item.bought_date && `Bought ${item.bought_date}`,
            item.supplier_name,
        ].filter(Boolean).join(" · ");
        return (
            <div className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors bg-background border border-border">
                <div className="min-w-0 cursor-pointer" onClick={() => handleEdit(item)}>
                    <p className="text-sm font-semibold truncate text-foreground">{item.name}</p>
                    <p className="text-xs mt-0.5 truncate text-muted-foreground">{subtitle || "—"}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                            {item.price ? `$${formatDecimal(item.price)}` : "—"}
                        </p>
                        <p className="text-xs mt-0.5 text-muted-foreground">Qty {item.quantity == null ? "—" : formatCount(item.quantity)}</p>
                    </div>
                    <RowActions row={item} onEdit={handleEdit} onAskDelete={handleDelete} />
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <PageHeader icon={Package} title="Assets" description="Manage physical company assets and supplies." className="mb-2">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate("/asset/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Asset
                    </Button>
                </div>
            </PageHeader>

            <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <TableSummary
                    data={items}
                    stats={stats}
                    renderCard={renderAssetCard}
                    searchKeys={["name", "supplier_name"]}
                    loading={loading}
                    emptyLabel="No assets yet."
                />
            </div>
        </div>
    );
};
