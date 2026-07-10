import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

// Helper to construct nested URL: /services/:serviceId/follow-ups/
const getBaseUrl = (serviceId) => `${API_URL}/services/${serviceId}/follow-ups/`;

export const getFollowups = async (serviceId) => {
    if (!serviceId) throw new Error("Service ID is required to fetch follow-ups.");

    // We can likely pass other query params if needed, but for now just the list
    const url = getBaseUrl(serviceId);

    return fetchAllPages(url, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const createFollowup = async (serviceId, data) => {
    if (!serviceId) throw new Error("Service ID is required to create a follow-up.");
    const url = getBaseUrl(serviceId);

    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating follow-up"));
    }
    return res.json();
};

export const updateFollowup = async (serviceId, followupId, data) => {
    if (!serviceId || !followupId) throw new Error("Service ID and Follow-up ID are required to update.");
    const url = `${getBaseUrl(serviceId)}${followupId}/`;

    const res = await fetch(url, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating followup"));
    }
    return res.json();
};

export const deleteFollowup = async (serviceId, followupId) => {
    if (!serviceId || !followupId) throw new Error("Service ID and Follow-up ID are required to delete.");
    const url = `${getBaseUrl(serviceId)}${followupId}/`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting followup");
    return true;
};

export const getFollowupAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/followup/`, {
        method: "GET",
        headers: getHeaders(),
    });
};
