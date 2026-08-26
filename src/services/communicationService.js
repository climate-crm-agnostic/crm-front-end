import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

// multipart/form-data — deliberately no Content-Type header: the browser
// sets it (with the correct multipart boundary) when body is a FormData
// instance. Auth still rides the HttpOnly cookie via the global fetch
// interceptor in api.js (credentials: 'include'), so no headers are needed
// here at all.
export const sendCommunication = async ({ to, subject, body, lead, quotation, attachment }) => {
    const formData = new FormData();
    // `to` can be a single address (legacy callers) or an array of several
    // — the backend reads every repeated "to" field via request.data.getlist.
    if (Array.isArray(to)) to.forEach(addr => formData.append("to", addr));
    else formData.append("to", to);
    formData.append("subject", subject);
    formData.append("body", body);
    if (lead) formData.append("lead", lead);
    if (quotation) formData.append("quotation", quotation);
    if (attachment) formData.append("attachment", attachment, attachment.name || "attachment.pdf");

    const res = await fetch(`${API_URL}/communications/send/`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error sending email"));
    }
    return res.json();
};

export const polishEmail = async (text) => {
    const res = await fetch(`${API_URL}/communications/polish/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ text }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error polishing email"));
    }
    return res.json();
};

export const getSentEmails = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = `${API_URL}/sent-emails/`;
    return fetchAllPages(queryParams ? `${url}?${queryParams}` : url, { headers: getHeaders() });
};
