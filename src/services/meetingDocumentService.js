import { API_URL, getHeaders } from "./api";

export const listMeetingDocumentsForLead = async (leadId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching meeting documents");
    return res.json();
};

export const getMeetingDocument = async (leadId, documentId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/${documentId}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching meeting document");
    return res.json();
};

export const deleteMeetingDocument = async (leadId, documentId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/${documentId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting meeting document");
};

// Each entry: { id, name, output_format, created_at, updated_at,
// meeting_document_id, meeting_document_title } — the last two are null
// for a conversation that never finished generating a document ("draft").
export const listMeetingDocumentConversations = async (leadId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/conversations/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching meeting document conversations");
    return res.json();
};

// { id, name, output_format, created_at, updated_at, messages: [{id, role, content, created_at}] }
export const getMeetingDocumentConversation = async (leadId, conversationId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/conversations/${conversationId}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching meeting document conversation");
    return res.json();
};
