import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const PROJECTS_URL = `${API_URL}/projects/`;

export const getProjects = async () => {
    return fetchAllPages(PROJECTS_URL, { headers: getHeaders() });
};

export const createProject = async (data) => {
    const res = await fetch(PROJECTS_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating project"));
    }
    return res.json();
};

export const deleteProject = async (id) => {
    const res = await fetch(`${PROJECTS_URL}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete project");
    return true;
};
