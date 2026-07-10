import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

export const getPipelines = async () => {
    return fetchAllPages(`${API_URL}/pipelines/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const updatePipeline = async (id, pipelineData) => {
    const res = await fetch(`${API_URL}/pipelines/${id}/`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(pipelineData),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating pipeline"));
    }
    return res.json();
};

export const createPipeline = async (pipelineData) => {
    const res = await fetch(`${API_URL}/pipelines/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(pipelineData),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating pipeline"));
    }
    return res.json();
};
