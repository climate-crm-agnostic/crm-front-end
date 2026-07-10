import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "inventory";
const url = `${API_URL}/${endPoint}/`;

export const getInventoryItems = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAllPages(`${url}${queryParams ? `?${queryParams}` : ''}`, {
        headers: getHeaders(),
    });
};

export const getInventoryItemById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching inventory item");
    return res.json();
};

export const createInventoryItem = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating inventory item"));
    }
    return res.json();
};

export const updateInventoryItem = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating inventory item"));
    }
    return res.json();
};

export const deleteInventoryItem = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting inventory item");
    return true; // 204 No Content
};

export const getInventoryItemAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/inventory/`, {
        headers: getHeaders(),
    });
};
