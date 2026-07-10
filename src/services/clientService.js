import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "clients";
const url = `${API_URL}/${endPoint}/`;

export const getClients = async () => {
    return fetchAllPages(url, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const getClientById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching client");
    return res.json();
};

export const createClient = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating client"));
    }
    return res.json();
};

export const updateClient = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating client"));
    }
    return res.json();
};

export const deleteClient = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting client");
    return true;
};

export const getClientAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/client/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const importClientsFromExcel = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/clients/import_excel/`, {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
};

export const exportClientsExcel = async () => {
    const res = await fetch(`${url}export_excel/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error exporting clients to Excel");
    return res.blob();
};

export const uploadClientImage = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const token = localStorage.getItem('auth_token');

    const headers = {
        ...(token && { 'Authorization': `Token ${token}` })
    };

    const res = await fetch(`${API_URL}/clients/${id}/files/`, {
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
