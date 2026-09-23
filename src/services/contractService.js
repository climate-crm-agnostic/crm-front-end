import { API_URL, getHeaders, extractErrorMessage } from "./api";

// --- Internal (staff, authenticated) ---

export const listContractsForLead = async (leadId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching contracts");
    return res.json();
};

export const createContract = async (leadId, data) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const err = new Error(extractErrorMessage(errorData, "Error creating contract"));
        // LeadContractPanel needs the raw list to render a "fill these in"
        // form when a template references Lead data this record doesn't have.
        if (Array.isArray(errorData?.missing_fields)) err.missingFields = errorData.missing_fields;
        throw err;
    }
    return res.json();
};

export const uploadContractFile = async (leadId, contractId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/${contractId}/upload-file/`, {
        method: "POST",
        headers: {
            "Authorization": getHeaders().Authorization,
        },
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || "Error uploading contract file");
    }
    return res.json();
};

export const resendSignerLink = async (leadId, contractId, signerId) => {
    const res = await fetch(
        `${API_URL}/leads/${leadId}/contracts/${contractId}/signers/${signerId}/resend/`,
        { method: "POST", headers: getHeaders() },
    );
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error resending signature link"));
    }
    return res.json();
};

export const deleteContract = async (leadId, contractId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/${contractId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting contract");
    return true;
};

// --- Public (no auth, token is the credential) ---

export const getPublicContract = async (token) => {
    const res = await fetch(`${API_URL}/public/contracts/${token}/`, { headers: getHeaders() });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const err = new Error(extractErrorMessage(errorData, "Error loading document"));
        err.status = res.status;
        throw err;
    }
    return res.json();
};

export const submitSignature = async (token, { accepted, signatureImage }) => {
    const res = await fetch(`${API_URL}/public/contracts/${token}/sign/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ accepted, signature_image: signatureImage }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const err = new Error(extractErrorMessage(errorData, "Error submitting signature"));
        err.status = res.status;
        throw err;
    }
    return res.json();
};
