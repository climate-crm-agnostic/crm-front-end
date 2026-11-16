import { API_URL, getHeaders } from "./api";

const base = `${API_URL}/ai`;

export const sendMessage = async (message, conversationId = null) => {
    const body = { message };
    if (conversationId) body.conversation_id = conversationId;

    const res = await fetch(`${base}/chat/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "AI request failed");
    return data; // { conversation_id, conversation_name, assistant_message }
};

export const getConversations = async () => {
    const res = await fetch(`${base}/conversations/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
};

export const getConversation = async (id) => {
    const res = await fetch(`${base}/conversations/${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch conversation");
    return res.json();
};

export const renameConversation = async (id, name) => {
    const res = await fetch(`${base}/conversations/${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to rename conversation");
    return res.json();
};

export const deleteConversation = async (id) => {
    const res = await fetch(`${base}/conversations/${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
    return true;
};

// Monthly AI credit usage for the whole account: { enabled, pool, used, remaining, percent, period, ... }.
// Throws on 403 (plan without AI / no permission) so callers can hide the widgets.
export const getAICredits = async () => {
    const res = await fetch(`${base}/credits/`, { headers: getHeaders() });
    if (!res.ok) {
        const err = new Error("Failed to fetch AI credits");
        err.status = res.status;
        throw err;
    }
    return res.json();
};
