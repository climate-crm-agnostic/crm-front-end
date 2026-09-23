import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const TEMPLATES_URL = `${API_URL}/contract-templates/`;

export const getContractTemplates = async () => {
    return fetchAllPages(TEMPLATES_URL, { headers: getHeaders() });
};

export const getContractTemplate = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching contract template");
    return res.json();
};

export const createContractTemplate = async (data) => {
    const res = await fetch(TEMPLATES_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating contract template"));
    }
    return res.json();
};

export const updateContractTemplate = async (id, data) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating contract template"));
    }
    return res.json();
};

export const deleteContractTemplate = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting contract template");
    return true;
};

export const approveContractTemplate = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/approve/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error approving template"));
    }
    return res.json();
};

// Merge-field catalog for the picker — always entity='lead' for contract templates.
export const getContractMergeFields = async () => {
    const res = await fetch(`${TEMPLATES_URL}merge-fields/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching merge fields");
    return res.json();
};

// Renders this template's sections against a real Lead (leadId optional —
// the backend picks the first available Lead if omitted) so the editor
// shows resolved text instead of raw {lead.x}/{client.x} placeholders.
export const previewContractTemplate = async (id, leadId) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/preview/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(leadId ? { lead_id: leadId } : {}),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error previewing template"));
    }
    return res.json();
};
