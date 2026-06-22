import { API_URL, getHeaders } from "./api";

const endPoint = "services";
const url = `${API_URL}/${endPoint}/`;

export const getServices = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const finalUrl = queryParams ? `${url}?${queryParams}` : url;

    const res = await fetch(finalUrl, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching services");
    const data = await res.json();
    return data.results || data;
};

export const searchServices = async (name) => {
    const res = await fetch(`${url}?name=${name}`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error searching services");
    const data = await res.json();
    return data.results || data;
};

export const getServiceById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching service");
    return res.json();
};

export const createService = async (data) => {
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

export const updateService = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error updating service");
    return res.json();
};

export const deleteService = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting service");
    return true;
};

export const getServiceAttributes = async () => {
    const res = await fetch(`${API_URL}/attributes/service/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching service attributes");
    const data = await res.json();
    return data.results || data;
};

export const importServicesFromExcel = async (clientId, file) => {
    const formData = new FormData();
    formData.append('client_id', clientId);
    formData.append('file', file);

    const res = await fetch(`${API_URL}/services/import_excel/`, {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
};

export const uploadServiceImage = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const token = localStorage.getItem('auth_token');

    const headers = {
        ...(token && { 'Authorization': `Token ${token}` })
    };

    const res = await fetch(`${API_URL}/services/${id}/files/`, {
        method: "POST",
        headers: headers,
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error uploading file: ${res.status} ${text}`);
    }
    return res.json();
};
