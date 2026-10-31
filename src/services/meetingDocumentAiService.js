import { API_URL, getHeaders } from "./api";

// outputFormat ('docx' | 'pptx') is only sent/required on the first message
// of a new conversation — it's locked for the life of the conversation once
// chosen (one format per document).
export const sendMeetingDocumentMessage = async (leadId, message, conversationId = null, outputFormat = null) => {
    const body = { message };
    if (conversationId) body.conversation_id = conversationId;
    if (!conversationId && outputFormat) body.output_format = outputFormat;

    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/ai/chat/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "AI request failed");
    // { conversation_id, conversation_name, output_format, assistant_message,
    //   meeting_document_id?, document_preview?, suggested_topic? }
    //   meeting_document_id/document_preview are both set whenever this turn
    //   generated or edited the document (document_preview is the full
    //   { title, attendees, sections, show_durations, accent } so the chat
    //   can render an inline mockup matching the real file's formatting).
    //   suggested_topic ({ topic_label }) is set instead when the AI
    //   proactively suggests a topic from the Lead's CRM data — render
    //   assistant_message with Accept/Decline buttons rather than plain text.
    return data;
};

// On-demand "draft so far" for the chat's Preview button — mirrors
// getContractDraftPreview in contractAiService.js. Returns
// { title, attendees, sections: [...] }.
export const getMeetingDocumentDraftPreview = async (leadId, conversationId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/meeting-documents/ai/preview/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ conversation_id: conversationId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Preview request failed");
    return data;
};
