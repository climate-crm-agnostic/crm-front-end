import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table } from "../components/Table";
import { CatalogueGallery } from "../components/CatalogueGallery";
import { Button } from "../components/ui/button";
import { Plus, Download, Image as ImageIcon } from "lucide-react";
import { getCatalogueItems, deleteCatalogueItem, getCatalogueItemAttributes, exportCatalogueItemsExcel } from "../services/catalogueService";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { Badge } from "../components/ui/badge";
import { formatDecimal } from "@/lib/utils";

export const Catalogueitem = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attributes, setAttributes] = useState([]);
    const navigate = useNavigate();
    const [view, setView] = useState(() => {
        try { return localStorage.getItem("catalogue_view") || "gallery"; } catch { return "gallery"; }
    });
    const changeView = (next) => {
        setView(next);
        try { localStorage.setItem("catalogue_view", next); } catch { /* remembering the view is a nicety */ }
    };

    const staticColumns = [
        {
            key: "list_of_images",
            label: "",
            render: (value) => (
                <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
                    {value?.[0]
                        ? <img src={value[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        : <ImageIcon className="size-4 opacity-50" aria-hidden="true" />}
                </div>
            ),
        },
        {
            key: "name",
            label: "Name",
            render: (value, row) => (
                <div>
                    <div>{value}</div>
                    {row.variants?.length > 0 && (
                        <div className="text-xs text-muted-foreground">{row.variants.length} variant{row.variants.length === 1 ? "" : "s"}</div>
                    )}
                </div>
            ),
        },
        { key: "sku", label: "SKU" },
        {
            key: "type",
            label: "Type",
            render: (value) => <span className="capitalize">{value}</span>
        },
        {
            key: "base_price",
            label: "Base Price",
            render: (value, row) => {
                const money = (n) => `${row.currency || 'USD'} ${formatDecimal(n)}`;
                return row.has_variants && row.min_price !== row.max_price
                    ? `${money(row.min_price)} – ${formatDecimal(row.max_price)}`
                    : money(value);
            }
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-codex-texto-primary dark:text-codex-texto-dark-primary">
                        Catalogue
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your products, services, and subscriptions.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div role="group" aria-label="View" className="inline-flex gap-0.5 rounded-full bg-muted p-[3px]">
                        {[["gallery", "Gallery"], ["table", "Table"]].map(([value, label]) => (
                            <button
                                key={value} type="button" aria-pressed={view === value} onClick={() => changeView(value)}
                                className={`h-8 cursor-pointer rounded-full px-4 text-[13px] font-semibold transition-colors ${view === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        style={{ backgroundColor: "var(--card)", border: "1px solid var(--secondary-text)", color: "var(--secondary-text)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(37,91,1,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--card)"}
                    >
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <Button onClick={() => navigate("/catalogue/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </div>

            {view === "gallery" ? (
                <div className="p-2">
                    {loading ? (
                        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))]">
                            {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
                        </div>
                    ) : (
                        <CatalogueGallery items={items} onOpen={handleEdit} />
                    )}
                </div>
            ) : (
                <div className="bg-card p-2 rounded-lg shadow flex-1 min-h-0 overflow-hidden flex flex-col">
                    <Table
                        data={items}
                        columns={columns}
                        onEdit={handleEdit}
                        onAskDelete={handleDelete}
                        searchable={true}
                    />
                </div>
            )}
        </div>
    );
};
