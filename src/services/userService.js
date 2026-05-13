import { API_URL, getHeaders } from "./api";

const BASE = `${API_URL}/users`;

export const getUsers = async () => {
    const res = await fetch(`${BASE}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
};

export const getUser = async (id) => {
    const res = await fetch(`${BASE}/${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
};

export const createUser = async (data) => {
    const res = await fetch(`${BASE}/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return res;
};

export const updateUser = async (id, data) => {
    const res = await fetch(`${BASE}/${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return res;
};

export const deactivateUser = async (id) => {
    const res = await fetch(`${BASE}/${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    return res;
};

export const activateUser = async (id) => {
    return updateUser(id, { is_active: true });
};

export const resetUserPassword = async (id) => {
    const res = await fetch(`${BASE}/${id}/reset-password/`, {
        method: "POST",
        headers: getHeaders(),
    });
    return res;
};

export const deleteUser = async (id) => {
    const res = await fetch(`${BASE}/${id}/hard-delete/`, {
        method: "POST",
        headers: getHeaders(),
    });
    return res;
};

export const confirmPasswordReset = async ({ uid, token, password }) => {
    const res = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ uid, token, password }),
    });
    return res;
};
