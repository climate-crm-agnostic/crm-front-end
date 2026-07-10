import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "asset-assignments";
const url = `${API_URL}/${endPoint}/`;

export const getAssetAssignments = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAllPages(`${url}${queryParams ? `?${queryParams}` : ''}`, {
        headers: getHeaders(),
    });
};

export const getAssetAssignmentById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching asset assignment");
    return res.json();
};

export const createAssetAssignment = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating asset assignment"));
    }
    return res.json();
};

export const updateAssetAssignment = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating asset assignment"));
    }
    return res.json();
};

export const deleteAssetAssignment = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting asset assignment");
    return true; // 204 No Content
};

export const getAssetAssignmentAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/asset_assignment/`, {
        headers: getHeaders(),
    });
};
