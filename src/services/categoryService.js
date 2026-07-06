import { API_URL, getHeaders } from "./api";

const endPoint = "categories";
const url = `${API_URL}/${endPoint}/`;

export const getCategories = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const finalUrl = queryParams ? `${url}?${queryParams}` : url;

    const res = await fetch(finalUrl, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching categories");
    const data = await res.json();
    return data.results || data;
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
        const errorData = await res.json();
        throw new Error(JSON.stringify(errorData));
    }
    return res.json();
};

export const updateCategory = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error updating category");
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
    const res = await fetch(`${API_URL}/attributes/category/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching category attributes");
    const data = await res.json();
    return data.results || data;
};

export const exportCategoriesExcel = async () => {
    const res = await fetch(`${url}export_excel/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error exporting categories to Excel");
    return res.blob();
};
