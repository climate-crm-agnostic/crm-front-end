import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const BASE = `${API_URL}/knowledge`;

// Every call throws an Error carrying the server's own message, so screens can show it as is.
const json = async (res, fallback) => {
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(extractErrorMessage(data, fallback));
    return data;
};

/* ── Access groups ───────────────────────────────────────────────────────── */
export const getKnowledgeGroups = () => fetchAllPages(`${BASE}/groups/`, { headers: getHeaders() });

export const createKnowledgeGroup = async (data) =>
    json(await fetch(`${BASE}/groups/`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) }), "Could not create the group");

export const updateKnowledgeGroup = async (id, data) =>
    json(await fetch(`${BASE}/groups/${id}/`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify(data) }), "Could not update the group");

export const deleteKnowledgeGroup = async (id) =>
    json(await fetch(`${BASE}/groups/${id}/`, { method: "DELETE", headers: getHeaders() }), "Could not delete the group");

/* ── Documents ───────────────────────────────────────────────────────────── */
export const getKnowledgeDocuments = (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return fetchAllPages(`${BASE}/documents/${qs ? `?${qs}` : ""}`, { headers: getHeaders() });
};

// multipart/form-data: no Content-Type header, the browser adds the boundary.
export const uploadKnowledgeDocument = async ({ file, group, title }) => {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("group", group);
    if (title) form.append("title", title);
    return json(await fetch(`${BASE}/documents/`, { method: "POST", body: form }), "Could not upload the file");
};

export const updateKnowledgeDocument = async (id, data) =>
    json(await fetch(`${BASE}/documents/${id}/`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify(data) }), "Could not update the document");

export const deleteKnowledgeDocument = async (id) =>
    json(await fetch(`${BASE}/documents/${id}/`, { method: "DELETE", headers: getHeaders() }), "Could not delete the document");
