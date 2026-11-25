import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus, Truck } from "lucide-react";
import { getSuppliers, deleteSupplier, getSupplierAttributes } from "../services/supplierService";
import { AttributeValueCell } from "../components/attributes/AttributeValueCell";
import Swal from "sweetalert2";

import { PageHeader } from "@/components/PageHeader";
export const Supplier = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    // name is the only fixed column left on Supplier — email, phone and
    // is_active are dynamic attributes now (see app/models/suppliers.py),
    // so they arrive through dynamicColumns below like everything else.
    const staticColumns = [
        { key: "name", label: "Name" },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsData, attributesData] = await Promise.all([
                getSuppliers(),
                getSupplierAttributes()
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
                label: attr.label,
                render: (value) => <AttributeValueCell attr={attr} value={value} />,
            }));

            setColumns([...staticColumns, ...dynamicColumns]);

        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        navigate(`/supplier/${item.id}`);
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
                await deleteSupplier(item.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Supplier has been deleted.',
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
            <PageHeader icon={Truck} title="Suppliers" description="Manage the vendors your company buys from." className="mb-2">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate("/supplier/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Supplier
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
