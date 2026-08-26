import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const url = `${API_URL}/quotations/`;

export const getQuotations = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchAllPages(queryParams ? `${url}?${queryParams}` : url, { headers: getHeaders() });
};

export const getQuotationById = async (id) => {
    const res = await fetch(`${url}${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error fetching quotation");
    return res.json();
};

export const createQuotation = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating quotation"));
    }
    return res.json();
};

export const updateQuotation = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating quotation"));
    }
    return res.json();
};

export const deleteQuotation = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting quotation");
    return true;
};

export const recalculateQuotation = async (id) => {
    const res = await fetch(`${url}${id}/recalculate/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error recalculating quotation");
    return res.json();
};

// --- Line Items (nested) ---

export const getQuotationLineItems = async (quotationId) => {
    return fetchAllPages(`${url}${quotationId}/line-items/`, { headers: getHeaders() });
};

export const createQuotationLineItem = async (quotationId, data) => {
    const res = await fetch(`${url}${quotationId}/line-items/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating line item"));
    }
    return res.json();
};

export const deleteQuotationLineItem = async (quotationId, lineItemId) => {
    const res = await fetch(`${url}${quotationId}/line-items/${lineItemId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting line item");
    return true;
};
