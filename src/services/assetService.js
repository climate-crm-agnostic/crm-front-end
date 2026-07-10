import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "assets";
const url = `${API_URL}/${endPoint}/`;

export const getAssets = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAllPages(`${url}${queryParams ? `?${queryParams}` : ''}`, {
        headers: getHeaders(),
    });
};

export const getAssetById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching asset");
    return res.json();
};

export const createAsset = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating asset"));
    }
    return res.json();
};

export const updateAsset = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating asset"));
    }
    return res.json();
};

export const deleteAsset = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting asset");
    return true; // 204 No Content
};

export const getAssetAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/asset/`, {
        headers: getHeaders(),
    });
};
