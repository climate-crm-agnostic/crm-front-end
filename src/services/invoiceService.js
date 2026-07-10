import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "invoices";
const url = `${API_URL}/${endPoint}/`;

export const getInvoices = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const finalUrl = queryParams ? `${url}?${queryParams}` : url;

    return fetchAllPages(finalUrl, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const getInvoiceById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching invoice");
    return res.json();
};

export const createInvoice = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating invoice"));
    }
    return res.json();
};

export const updateInvoice = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating invoice"));
    }
    return res.json();
};

export const deleteInvoice = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting invoice");
    return true;
};

export const getInvoiceAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/invoice/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const recalculateInvoice = async (id) => {
    const res = await fetch(`${url}${id}/recalculate/`, {
        method: "POST",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error recalculating invoice");
    return res.json();
};

export const updateInvoiceTask = async (id, payload) => {
    const res = await fetch(`${url}${id}/update-task/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error updating task");
    return res.json();
};

export const deleteInvoiceNote = async (id, payload) => {
    const res = await fetch(`${url}${id}/delete-note/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error deleting note");
    return res.json();
};

// --- Invoice Line Items (Nested) ---

export const getLineItems = async (invoiceId) => {
    return fetchAllPages(`${url}${invoiceId}/line-items/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const createLineItem = async (invoiceId, data) => {
    const res = await fetch(`${url}${invoiceId}/line-items/`, {
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

export const updateLineItem = async (invoiceId, lineItemId, data) => {
    const res = await fetch(`${url}${invoiceId}/line-items/${lineItemId}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating line item"));
    }
    return res.json();
};

export const deleteLineItem = async (invoiceId, lineItemId) => {
    const res = await fetch(`${url}${invoiceId}/line-items/${lineItemId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting line item");
    return true;
};

export const getLineItemAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/invoice_line_item/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

// --- Payments (Nested) ---

export const getPayments = async (invoiceId) => {
    return fetchAllPages(`${url}${invoiceId}/payments/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const createPayment = async (invoiceId, data) => {
    const res = await fetch(`${url}${invoiceId}/payments/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating payment"));
    }
    return res.json();
};

export const updatePayment = async (invoiceId, paymentId, data) => {
    const res = await fetch(`${url}${invoiceId}/payments/${paymentId}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating payment"));
    }
    return res.json();
};

export const deletePayment = async (invoiceId, paymentId) => {
    const res = await fetch(`${url}${invoiceId}/payments/${paymentId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting payment");
    return true;
};

export const sendInvoiceToStripe = async (invoiceId, email = '') => {
    const body = email ? { email } : {};
    const res = await fetch(`${url}${invoiceId}/stripe/send/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
};

export const getPaymentAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/payment/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const exportInvoicesExcel = async () => {
    const res = await fetch(`${url}export_excel/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error exporting invoices to Excel");
    return res.blob();
};
