import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus, Download } from "lucide-react";
import { getCatalogueItems, deleteCatalogueItem, getCatalogueItemAttributes, exportCatalogueItemsExcel } from "../services/catalogueService";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { Badge } from "../components/ui/badge";

export const Catalogueitem = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    const staticColumns = [
        { key: "name", label: "Name" },
        { key: "sku", label: "SKU" },
        {
            key: "type",
            label: "Type",
            render: (value) => <span className="capitalize">{value}</span>
        },
        {
            key: "base_price",
            label: "Base Price",
            render: (value, row) => `${row.currency || 'USD'} ${Number(value).toFixed(2)}`
        },
        {
            key: "is_active",
            label: "Status",
            render: (value) => (
                <Badge variant={value ? "default" : "secondary"}>
                    {value ? "Active" : "Inactive"}
                </Badge>
            )
        },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsData, attributesData] = await Promise.all([
                getCatalogueItems(),
                getCatalogueItemAttributes()
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
        navigate(`/catalogue/${item.id}`);
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
                await deleteCatalogueItem(item.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Catalogue item has been deleted.',
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

    const handleExportExcel = async () => {
        try {
            const blob = await exportCatalogueItemsExcel();
            saveAs(blob, "catalogue_report.xlsx");
        } catch (error) {
            console.error("Error exporting catalogue", error);
            Swal.fire('Error!', 'There was an error exporting the catalogue.', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Catalogue
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your products, services, and subscriptions.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "#F2EBDD", border: "1px solid #5E6A43", color: "#5E6A43" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(94,106,67,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#F2EBDD"}
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <Button onClick={() => navigate("/catalogue/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
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
