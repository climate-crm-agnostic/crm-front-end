import { API_URL, getHeaders } from "./api";

export const getLeads = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_URL}/leads/?${query}`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching leads");
    return res.json();
};

export const createLead = async (data) => {
    const res = await fetch(`${API_URL}/leads/`, {
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

export const updateLead = async (id, data) => {
    const res = await fetch(`${API_URL}/leads/${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error updating lead");
    return res.json();
};

export const getLead = async (id) => {
    const res = await fetch(`${API_URL}/leads/${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching lead");
    return res.json();
};

export const getLeadAttributes = async () => {
    const res = await fetch(`${API_URL}/attributes/lead/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching lead attributes");
    const data = await res.json();
    return data.results || data;
}

export const getLeadClientAttributes = async () => {
    const res = await fetch(`${API_URL}/attributes/client/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching lead client attributes");
    const data = await res.json();
    return data.results || data;
};

export const getLeadServiceAttributes = async () => {
    const res = await fetch(`${API_URL}/attributes/service/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching lead service attributes");
    const data = await res.json();
    return data.results || data;
};

export const importLeadsFromExcel = async (pipelineId, file, clientId, newClientName) => {
    const formData = new FormData();
    formData.append('pipeline_id', pipelineId);
    formData.append('file', file);
    if (clientId) {
        formData.append('client_id', clientId);
    } else if (newClientName) {
        formData.append('new_client_name', newClientName);
    }

    const res = await fetch(`${API_URL}/leads/import_excel/`, {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
};

export const reassignLeads = async (fromUserId, toUserId) => {
    const res = await fetch(`${API_URL}/leads/reassign/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ from_user_id: fromUserId, to_user_id: toUserId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error reassigning leads");
    return data;
};

export const uploadLeadImage = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/leads/${id}/files/`, {
        method: "POST",
        headers: {
            "Authorization": getHeaders().Authorization,
        },
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error uploading image");
    }
    return res.json();
};
