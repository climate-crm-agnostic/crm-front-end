import { API_URL, getHeaders } from "./api";

const url = `${API_URL}/settings/`;

export const getSettings = async () => {
    const res = await fetch(url, { method: "GET", headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching settings");
    return res.json();
};

export const updateSettings = async (data) => {
    const res = await fetch(url, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
    }
    return res.json();
};
