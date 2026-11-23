import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const BASE = `${API_URL}/knowledge`;

// Every call throws an Error carrying the server's own message, so screens can show it as is.
const json = async (res, fallback) => {
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    // Prefer the server's own message: 402 bodies also carry a nested credits object whose strings must not leak.
    if (!res.ok) throw new Error(data?.detail || extractErrorMessage(data, fallback));
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

/* ── Sync with the knowledge bases ───────────────────────────────────────── */
/** Queue counts and the running / last sync job of each knowledge base. */
export const getKnowledgeSync = async () =>
    json(await fetch(`${BASE}/sync/`, { headers: getHeaders() }), "Could not load the sync status");

/** "Sync now": starts a job without waiting for the batching window; optionally re-queues the failed files first. */
export const startKnowledgeSync = async ({ retryFailed = false } = {}) =>
    json(await fetch(`${BASE}/sync/`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify({ retry_failed: retryFailed }),
    }), "Could not start the sync");

/** Puts one failed document back in the queue. */
export const resyncKnowledgeDocument = async (id) =>
    json(await fetch(`${BASE}/documents/${id}/resync/`, { method: "POST", headers: getHeaders() }), "Could not retry the document");

/* ── Ask the knowledge base (any user with Intelligence; answers respect their access groups) ── */
export const askKnowledge = async (message, conversationId = null) => {
    const body = { message };
    if (conversationId) body.conversation_id = conversationId;
    return json(await fetch(`${BASE}/chat/`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }), "The assistant could not answer");
};

// Short-lived download links (15 min) — open them right away instead of storing them.
export const getGeneratedFileUrl = async (key) =>
    (await json(await fetch(`${BASE}/files/url/`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ key }) }), "Could not open the file")).url;

export const getSourceUrl = async (docId) =>
    (await json(await fetch(`${BASE}/sources/${docId}/url/`, { headers: getHeaders() }), "Could not open the document")).url;
