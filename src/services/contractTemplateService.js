import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const TEMPLATES_URL = `${API_URL}/contract-templates/`;

export const getContractTemplates = async () => {
    return fetchAllPages(TEMPLATES_URL, { headers: getHeaders() });
};

// Templates for one pipeline. latestOnly collapses each version family to its
// highest version (what the Lead selector shows); null-pipeline legacy
// templates are always included by the backend.
export const getContractTemplatesForPipeline = async (pipelineId, { latestOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (pipelineId) params.set("pipeline", pipelineId);
    if (latestOnly) params.set("latest_only", "true");
    return fetchAllPages(`${TEMPLATES_URL}?${params.toString()}`, { headers: getHeaders() });
};

// Full version history of one template family, newest version first.
export const getContractTemplateVersions = async (familyId) => {
    return fetchAllPages(`${TEMPLATES_URL}?family=${familyId}`, { headers: getHeaders() });
};

// Create a template from an uploaded PDF — the backend extracts its text and
// detects fill-in variables with AI. Returns the created (inactive) template.
export const uploadContractTemplatePdf = async (file, { pipelineId, name } = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    if (pipelineId) formData.append("pipeline", pipelineId);
    if (name) formData.append("name", name);

    const res = await fetch(`${TEMPLATES_URL}upload-pdf/`, {
        method: "POST",
        headers: { "Authorization": getHeaders().Authorization },
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error uploading PDF template"));
    }
    return res.json();
};

export const getContractTemplate = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching contract template");
    return res.json();
};

export const createContractTemplate = async (data) => {
    const res = await fetch(TEMPLATES_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating contract template"));
    }
    return res.json();
};

export const updateContractTemplate = async (id, data) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating contract template"));
    }
    return res.json();
};

// Deletes only this one version row.
export const deleteContractTemplate = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting contract template");
    return true;
};

// Deletes every version in this template's family — used by the templates
// list, which shows one row per family (its highest version), so "delete
// this template" there means the whole logical document.
export const deleteContractTemplateFamily = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/family/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting contract template");
    return true;
};

export const approveContractTemplate = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/approve/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error approving template"));
    }
    return res.json();
};

// Reactivates this exact version in place (no fork, same id/version number
// in and out) — deactivates whatever else was active in the family, and
// overwrites approved_by/approved_at with the current user/time on that
// same row, by design.
export const republishContractTemplateVersion = async (id) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/republish/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error republishing version"));
    }
    return res.json();
};

// Merge-field catalog for the picker — always entity='lead' for contract templates.
export const getContractMergeFields = async () => {
    const res = await fetch(`${TEMPLATES_URL}merge-fields/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching merge fields");
    return res.json();
};

// Renders this template's sections against a real Lead (leadId optional —
// the backend picks the first available Lead if omitted) so the editor
// shows resolved text instead of raw {lead.x}/{client.x} placeholders.
export const previewContractTemplate = async (id, leadId) => {
    const res = await fetch(`${TEMPLATES_URL}${id}/preview/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(leadId ? { lead_id: leadId } : {}),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error previewing template"));
    }
    return res.json();
};
