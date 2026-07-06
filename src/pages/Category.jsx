import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { Button } from "../components/ui/button";
import { Plus, Download } from "lucide-react";
import { getCategories, deleteCategory, getCategoryAttributes, exportCategoriesExcel } from "../services/categoryService";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

export const Category = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();

    const staticColumns = [
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        {
            key: "parent",
            label: "Parent Category",
            render: (value, row) => {
                if (!value) return "-";
                return typeof value === 'object' ? value.name : value;
            }
        },
    ];

    const [columns, setColumns] = useState(staticColumns);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [categoriesData, attributesData] = await Promise.all([
                getCategories(),
                getCategoryAttributes()
            ]);

            const processedCategories = categoriesData.map(category => ({
                ...category,
                ...(category.attributes || {})
            }));
            setCategories(processedCategories);
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

    const handleEdit = (category) => {
        navigate(`/category/${category.id}`);
    };

    const handleDelete = async (category) => {
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
                await deleteCategory(category.id);
                fetchData();
                Swal.fire(
                    'Deleted!',
                    'Category has been deleted.',
                    'success'
                );
            } catch (error) {
                console.error("Error deleting category", error);
                Swal.fire(
                    'Error!',
                    'There was an error deleting the category.',
                    'error'
                );
            }
        }
    };

    const handleExportExcel = async () => {
        try {
            const blob = await exportCategoriesExcel();
            saveAs(blob, "categories_report.xlsx");
        } catch (error) {
            console.error("Error exporting categories", error);
            Swal.fire('Error!', 'There was an error exporting the categories.', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-2 w-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Categories
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your categories and subcategories.
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
                    <Button onClick={() => navigate("/category/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Category
                    </Button>
                </div>
            </div>

            <div className="bg-brand-oat p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                <Table
                    data={categories}
                    columns={columns}
                    onEdit={handleEdit}
                    onAskDelete={handleDelete}
                    searchable={true}
                />
            </div>
        </div>
    );
};
