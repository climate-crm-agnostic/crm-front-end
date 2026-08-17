import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import { getAssetAssignments, deleteAssetAssignment, getAssetAssignmentAttributes } from "../services/assetAssignmentService";
import Swal from "sweetalert2";

export const AssetAssignment = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    const staticColumns = [
        { key: "asset_name", label: "Asset" },
        { key: "name", label: "Borrower" },
        { key: "borrow_date", label: "Borrow Date" },
        { key: "return_date", label: "Return Date", render: (value) => value || <span className="text-yellow-600 font-medium">Active</span> },
        { key: "lending_amount", label: "Amount" }
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsData, attributesData] = await Promise.all([
                getAssetAssignments(),
                getAssetAssignmentAttributes()
            ]);

            const processedItems = itemsData.map(item => ({
                ...item,
                asset_name: item.asset_details?.name || item.asset_name || "Unknown Asset",
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
        navigate(`/assetassignment/${item.id}`);
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
                await deleteAssetAssignment(item.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Asset Assignment has been deleted.',
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
                        Asset Assignments
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage asset loans and returns.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate("/assetassignment/new")}>
                        <Plus className="mr-2 h-4 w-4" /> New Assignment
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
