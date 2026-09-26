import { API_URL, getHeaders } from "./api";

export const sendContractMessage = async (message, conversationId = null, pipelineId = null) => {
    const body = { message };
    if (conversationId) body.conversation_id = conversationId;
    // Contract templates belong to a pipeline (the AI/templates flow is a
    // pipeline concern, not a Lead one), so the chat carries the pipeline it
    // was launched from — the backend scopes the created template to it.
    if (pipelineId) body.pipeline_id = pipelineId;

    const res = await fetch(`${API_URL}/contracts/ai/chat/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "AI request failed");
    // { conversation_id, conversation_name, assistant_message,
    //   draft_template_id? }  // draft_template_id set once the draft is finalized
    return data;
};

// On-demand "draft so far" for the chat's Preview button. The backend replays
// the conversation and forces the preview tool, so it works regardless of
// whether the model volunteered a preview mid-chat. Returns { sections: [...] }.
export const getContractDraftPreview = async (conversationId) => {
    const res = await fetch(`${API_URL}/contracts/ai/preview/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ conversation_id: conversationId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Preview request failed");
    return data;
};
