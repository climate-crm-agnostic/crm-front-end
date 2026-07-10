import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

export const getAttributes = async (entity) => {
    try {
        return await fetchAllPages(`${API_URL}/attributes/${entity}/`, {
            headers: getHeaders(),
        });
    } catch (error) {
        console.error("Error fetching attributes:", error);
        throw error;
    }
};

export const createAttribute = async (entity, data) => {
    try {
        const response = await fetch(`${API_URL}/attributes/${entity}/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(extractErrorMessage(errorData, "Failed to create attribute"));
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating attribute:", error);
        throw error;
    }
};

export const deleteAttribute = async (entity, id) => {
    try {
        const response = await fetch(`${API_URL}/attributes/${id}/`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to delete attribute`);
        }
        return true;
    } catch (error) {
        console.error("Error deleting attribute:", error);
        throw error;
    }
};

export const updateAttribute = async (id, data) => {
    try {
        const response = await fetch(`${API_URL}/attributes/${id}/`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(extractErrorMessage(errorData, "Failed to update attribute"));
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating attribute:", error);
        throw error;
    }
};
