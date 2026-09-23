import { API_URL, getHeaders } from "./api";

export const sendContractMessage = async (message, conversationId = null) => {
    const body = { message };
    if (conversationId) body.conversation_id = conversationId;

    const res = await fetch(`${API_URL}/contracts/ai/chat/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "AI request failed");
    return data; // { conversation_id, conversation_name, assistant_message, draft_template_id? }
};

export const getContractConversations = async () => {
    const res = await fetch(`${API_URL}/contract-conversations/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
};

export const getContractConversation = async (id) => {
    const res = await fetch(`${API_URL}/contract-conversations/${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch conversation");
    return res.json();
};

export const renameContractConversation = async (id, name) => {
    const res = await fetch(`${API_URL}/contract-conversations/${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to rename conversation");
    return res.json();
};

export const deleteContractConversation = async (id) => {
    const res = await fetch(`${API_URL}/contract-conversations/${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
    return true;
};
