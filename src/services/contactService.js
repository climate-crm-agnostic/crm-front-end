import { API_URL, getHeaders } from "./api";

const endPoint = "contacts";
const url = `${API_URL}/${endPoint}/`;

export const getContacts = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const finalUrl = queryParams ? `${url}?${queryParams}` : url;

    const res = await fetch(finalUrl, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching contacts");
    const data = await res.json();
    return data.results || data;
};

export const getContactById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching contact");
    return res.json();
};

export const createContact = async (data) => {
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

export const updateContact = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error updating contact");
    return res.json();
};

export const deleteContact = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting contact");
    return true;
};

export const getContactAttributes = async () => {
    const res = await fetch(`${API_URL}/attributes/contact/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching contact attributes");
    const data = await res.json();
    return data.results || data;
};

export const importContactsFromExcel = async (clientId, file) => {
    const formData = new FormData();
    formData.append('client_id', clientId);
    formData.append('file', file);

    const res = await fetch(`${API_URL}/contacts/import_excel/`, {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
};

// Atomic Updates specific to Contact
export const updateContactTask = async (id, payload) => {
    const res = await fetch(`${url}${id}/update-task/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error updating task");
    return res.json();
};

export const deleteContactNote = async (id, payload) => {
    const res = await fetch(`${url}${id}/delete-note/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error deleting note");
    return res.json();
};

export const exportContactsExcel = async () => {
    const res = await fetch(`${url}export_excel/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error exporting contacts to Excel");
    return res.blob();
};
