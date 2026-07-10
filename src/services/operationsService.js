import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "operations";
const url = `${API_URL}/${endPoint}/`;

export const getOperations = async () => {
    return fetchAllPages(url, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const getOperationById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching operation");
    const data = await res.json();
    return data;
};

export const createOperation = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating operation"));
    }
    return res.json();
};

export const updateOperation = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating operation"));
    }
    return res.json();
};

export const deleteOperation = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting operation");
    return true;
};
