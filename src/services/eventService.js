import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const EVENTS_URL = `${API_URL}/events/`;

// ── Admin CRUD ───────────────────────────────────────────────────────────
export const getEvents = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return fetchAllPages(`${EVENTS_URL}?${query}`, { headers: getHeaders() });
};

export const getEvent = async (id) => {
    const res = await fetch(`${EVENTS_URL}${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching event");
    return res.json();
};

export const createEvent = async (data) => {
    const res = await fetch(EVENTS_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating event"));
    }
    return res.json();
};

export const updateEvent = async (id, data) => {
    const res = await fetch(`${EVENTS_URL}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating event"));
    }
    return res.json();
};

export const deleteEvent = async (id) => {
    const res = await fetch(`${EVENTS_URL}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete event");
    return true;
};

// ── Attendees ──────────────────────────────────────────────────────────────
export const getEventAttendees = async (id) => {
    const res = await fetch(`${EVENTS_URL}${id}/attendees/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching attendees");
    return res.json();
};

// ── Excel template download (triggers a browser download) ──────────────────
export const downloadAttendeeTemplate = async () => {
    const res = await fetch(`${EVENTS_URL}attendee-template/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error downloading template");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendee_template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
};

// ── Excel upload → sanitized preview (no commit) ───────────────────────────
export const previewAttendeesExcel = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    // Do NOT set Content-Type — the browser sets the multipart boundary.
    const res = await fetch(`${EVENTS_URL}preview-attendees/`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error reading Excel file"));
    }
    return res.json();
};

// ── Append attendees to an existing event + send invitations ───────────────
export const approveAttendees = async (id, attendees, sendInvites = true) => {
    const res = await fetch(`${EVENTS_URL}${id}/approve-attendees/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ attendees, send_invites: sendInvites }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error saving attendees"));
    }
    return res.json();
};

export const sendInvitations = async (id) => {
    const res = await fetch(`${EVENTS_URL}${id}/send-invitations/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error sending invitations");
    return res.json();
};

// Resend to a single attendee (regenerates that attendee's code).
export const resendAttendee = async (eventId, attendeeId) => {
    const res = await fetch(`${EVENTS_URL}${eventId}/attendees/${attendeeId}/resend/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error resending invitation"));
    }
    return res.json();
};

export const reactivateEvent = async (id, data) => {
    const res = await fetch(`${EVENTS_URL}${id}/reactivate/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error reactivating event"));
    }
    return res.json();
};

export const deactivateEvent = async (id) => {
    const res = await fetch(`${EVENTS_URL}${id}/deactivate/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deactivating event");
    return res.json();
};

// ── Pipeline lead fields (to preview the public form + validate prereqs) ───
export const getPipelineFields = async (pipelineId) => {
    return fetchAllPages(`${API_URL}/pipelines/${pipelineId}/attributes/`, {
        headers: getHeaders(),
    });
};

// ── Public endpoints (no auth — the token is the credential) ───────────────
export const getPublicEvent = async (token) => {
    const res = await fetch(`${API_URL}/public/events/${token}/`, {
        headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
};

// Step 1: exchange the 6-digit code for the attendee's data + field schema.
export const verifyEventCode = async (token, code) => {
    const res = await fetch(`${API_URL}/public/events/${token}/verify-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
};

// Step 2: confirm the attendee (identified by code) + submit lead fields.
export const submitPublicRegistration = async (token, code, attributes) => {
    const res = await fetch(`${API_URL}/public/events/${token}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, attributes }),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
};

// Walk-in: on-site self-registration with no prior invite/code. The person
// fills in all their own details (base contact fields + lead fields).
export const submitWalkIn = async (token, payload) => {
    const res = await fetch(`${API_URL}/public/events/${token}/walk-in/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
};
