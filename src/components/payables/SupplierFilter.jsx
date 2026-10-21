import React, { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "../ui/searchable-select";
import { getSuppliers } from "../../services/supplierService";

// Supplier picker for the accounts-payable lists. Searchable, since an
// instance can have many suppliers; empty value means "all suppliers".
export const SupplierFilter = ({ value, onChange, className = "w-full sm:w-60" }) => {
    const [suppliers, setSuppliers] = useState([]);

    useEffect(() => {
        getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
    }, []);

    const options = useMemo(
        () => suppliers
            .map((s) => ({ value: String(s.id), label: s.name }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        [suppliers],
    );

    return (
        <div className={className}>
            <SearchableSelect value={value} onChange={(v) => onChange(v || "")} options={options} placeholder="All suppliers" />
        </div>
    );
};
