import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

export const getPipelineAttributes = async (pipelineId) => {
    return fetchAllPages(`${API_URL}/pipelines/${pipelineId}/attributes/`, {
        headers: getHeaders(),
    });
};

export const createPipelineAttribute = async (pipelineId, data) => {
    const res = await fetch(`${API_URL}/pipelines/${pipelineId}/attributes/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating attribute"));
    }
    return res.json();
};

export const updatePipelineAttribute = async (pipelineId, attrId, data) => {
    const res = await fetch(`${API_URL}/pipelines/${pipelineId}/attributes/${attrId}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating attribute"));
    }
    return res.json();
};

export const deletePipelineAttribute = async (pipelineId, attrId) => {
    const res = await fetch(`${API_URL}/pipelines/${pipelineId}/attributes/${attrId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting attribute");
};
