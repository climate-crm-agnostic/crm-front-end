import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "suppliers";
const url = `${API_URL}/${endPoint}/`;

export const getSuppliers = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAllPages(`${url}${queryParams ? `?${queryParams}` : ''}`, {
        headers: getHeaders(),
    });
};

export const getSupplierById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching supplier");
    return res.json();
};

export const createSupplier = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating supplier"));
    }
    return res.json();
};

export const updateSupplier = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating supplier"));
    }
    return res.json();
};

export const deleteSupplier = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting supplier");
    return true; // 204 No Content
};

export const getSupplierAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/supplier/`, {
        headers: getHeaders(),
    });
};
