import { API_URL, getHeaders, extractErrorMessage } from "./api";

// --- Internal (staff, authenticated) ---

export const listContractsForLead = async (leadId) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching contracts");
    return res.json();
};

// data: { template_id } — only needed when the Lead's pipeline has more than
// one approved template family (LeadContractPanel shows a picker in that
// case); omit it when there's just one, the backend picks it automatically.
export const createContract = async (leadId, data) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating contract"));
    }
    return res.json();
};

export const fillContractFields = async (leadId, contractId, fieldValues, signers) => {
    const res = await fetch(`${API_URL}/leads/${leadId}/contracts/${contractId}/fill-fields/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ field_values: fieldValues, signers: signers || [] }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const err = new Error(extractErrorMessage(errorData, "Error saving contract fields"));
        if (Array.isArray(errorData?.missing_fields)) err.missingFields = errorData.missing_fields;
        if (Array.isArray(errorData?.missing_signer_roles)) err.missingSignerRoles = errorData.missing_signer_roles;
        throw err;
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

export const submitSignature = async (token, { accepted, signatureImage, fieldValues }) => {
    const res = await fetch(`${API_URL}/public/contracts/${token}/sign/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            accepted,
            signature_image: signatureImage,
            // Values for the {{fields}} the Lead couldn't fill — the (first)
            // signer completes them before signing.
            field_values: fieldValues || {},
        }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const err = new Error(extractErrorMessage(errorData, "Error submitting signature"));
        err.status = res.status;
        throw err;
    }
    return res.json();
};
