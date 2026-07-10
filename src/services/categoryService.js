import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "categories";
const url = `${API_URL}/${endPoint}/`;

export const getCategories = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const finalUrl = queryParams ? `${url}?${queryParams}` : url;

    return fetchAllPages(finalUrl, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const getCategoryById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching category");
    return res.json();
};

export const createCategory = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating category"));
    }
    return res.json();
};

export const updateCategory = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating category"));
    }
    return res.json();
};

export const deleteCategory = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting category");
    return true;
};

export const getCategoryAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/category/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const exportCategoriesExcel = async () => {
    const res = await fetch(`${url}export_excel/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error exporting categories to Excel");
    return res.blob();
};
