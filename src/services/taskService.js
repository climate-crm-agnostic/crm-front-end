import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

export const getMyTasks = async () => {
    const res = await fetch(`${API_URL}/my-tasks/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching tasks");
    return res.json();
};

const TASKS_URL = `${API_URL}/tasks/`;

export const getTasks = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return fetchAllPages(`${TASKS_URL}?${query}`, { headers: getHeaders() });
};

export const createTask = async (data) => {
    const res = await fetch(TASKS_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating task"));
    }
    return res.json();
};

export const updateTask = async (id, data) => {
    const res = await fetch(`${TASKS_URL}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating task"));
    }
    return res.json();
};

export const deleteTask = async (id) => {
    const res = await fetch(`${TASKS_URL}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete task");
    return true;
};
