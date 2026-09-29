import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

// Accounts payable: supplier bills, supplier payments and the reports built
// on them. Money rules (what a payment may settle, voids, balances) live in
// the backend — see crm-back-end/app/payables/services.py.

const billsUrl = `${API_URL}/supplier-bills/`;
const paymentsUrl = `${API_URL}/supplier-payments/`;

const request = async (url, { method = "GET", body, fallback = "Request failed" } = {}) => {
    const res = await fetch(url, {
        method,
        headers: getHeaders(),
        ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, fallback));
    }
    if (res.status === 204) return true;
    return res.json();
};

const query = (filters) => {
    const qs = new URLSearchParams(filters).toString();
    return qs ? `?${qs}` : "";
};

const download = async (url, fallback) => {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(fallback);
    return res.blob();
};

const uploadTo = async (url, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(extractErrorMessage(data, "Upload failed"));
    return data;
};

// --- Bills ---

export const getSupplierBills = (filters = {}) =>
    fetchAllPages(`${billsUrl}${query(filters)}`, { headers: getHeaders() });

export const getSupplierBill = (id) => request(`${billsUrl}${id}/`, { fallback: "Error fetching bill" });

export const createSupplierBill = (data) =>
    request(billsUrl, { method: "POST", body: data, fallback: "Error creating bill" });

export const updateSupplierBill = (id, data) =>
    request(`${billsUrl}${id}/`, { method: "PATCH", body: data, fallback: "Error updating bill" });

export const deleteSupplierBill = (id) =>
    request(`${billsUrl}${id}/`, { method: "DELETE", fallback: "Error deleting bill" });

export const voidSupplierBill = (id, reason) =>
    request(`${billsUrl}${id}/void/`, { method: "POST", body: { reason }, fallback: "Error voiding bill" });

export const getBillPayments = (id) => request(`${billsUrl}${id}/payments/`, { fallback: "Error fetching payments" });

export const getBillLineItems = (billId) =>
    fetchAllPages(`${billsUrl}${billId}/line-items/`, { headers: getHeaders() });

export const createBillLineItem = (billId, data) =>
    request(`${billsUrl}${billId}/line-items/`, { method: "POST", body: data, fallback: "Error adding line" });

export const deleteBillLineItem = (billId, lineId) =>
    request(`${billsUrl}${billId}/line-items/${lineId}/`, { method: "DELETE", fallback: "Error deleting line" });

export const uploadBillFile = (id, file) => uploadTo(`${billsUrl}${id}/upload-file/`, file);

export const deleteBillFile = (id, path) =>
    request(`${billsUrl}${id}/delete-file/`, { method: "POST", body: { path }, fallback: "Error deleting file" });

export const exportSupplierBillsExcel = () => download(`${billsUrl}export_excel/`, "Error exporting bills");

export const getSupplierBillAttributes = () =>
    fetchAllPages(`${API_URL}/attributes/supplier_bill/`, { headers: getHeaders() });

// --- Payments ---

export const getSupplierPayments = (filters = {}) =>
    fetchAllPages(`${paymentsUrl}${query(filters)}`, { headers: getHeaders() });

export const getSupplierPayment = (id) => request(`${paymentsUrl}${id}/`, { fallback: "Error fetching payment" });

// data: { supplier, payment_date, amount, currency, method, reference, notes,
//         attributes, allocations: [{ bill, amount }] }
export const createSupplierPayment = (data) =>
    request(paymentsUrl, { method: "POST", body: data, fallback: "Error recording payment" });

export const updateSupplierPayment = (id, data) =>
    request(`${paymentsUrl}${id}/`, { method: "PATCH", body: data, fallback: "Error updating payment" });

export const voidSupplierPayment = (id, reason) =>
    request(`${paymentsUrl}${id}/void/`, { method: "POST", body: { reason }, fallback: "Error voiding payment" });

export const applySupplierCredit = (id, bill, amount) =>
    request(`${paymentsUrl}${id}/apply-credit/`, { method: "POST", body: { bill, amount }, fallback: "Error applying credit" });

export const uploadPaymentFile = (id, file) => uploadTo(`${paymentsUrl}${id}/upload-file/`, file);

export const deletePaymentFile = (id, path) =>
    request(`${paymentsUrl}${id}/delete-file/`, { method: "POST", body: { path }, fallback: "Error deleting file" });

export const exportSupplierPaymentsExcel = () => download(`${paymentsUrl}export_excel/`, "Error exporting payments");

export const getSupplierPaymentAttributes = () =>
    fetchAllPages(`${API_URL}/attributes/supplier_payment/`, { headers: getHeaders() });

// --- Supplier account & reports ---

export const getSupplierBalance = (supplierId) =>
    request(`${API_URL}/suppliers/${supplierId}/balance/`, { fallback: "Error fetching balance" });

export const getPayablesSummary = (withinDays = 7) =>
    request(`${API_URL}/accounts-payable/summary/?within_days=${withinDays}`, { fallback: "Error fetching summary" });

const statementUrl = (supplierId, filters = {}) =>
    `${API_URL}/suppliers/${supplierId}/statement/${query(filters)}`;

// filters: { date_from, date_to } (YYYY-MM-DD, both optional)
export const getSupplierStatement = (supplierId, filters = {}) =>
    request(statementUrl(supplierId, filters), { fallback: "Error fetching statement" });

export const exportSupplierStatementExcel = (supplierId, filters = {}) =>
    download(statementUrl(supplierId, { ...filters, export: "excel" }), "Error exporting statement");

const agingUrl = (filters = {}) => `${API_URL}/accounts-payable/aging/${query(filters)}`;

// filters: { as_of, supplier } (both optional)
export const getPayablesAging = (filters = {}) => request(agingUrl(filters), { fallback: "Error fetching aging report" });

export const exportPayablesAgingExcel = (filters = {}) =>
    download(agingUrl({ ...filters, export: "excel" }), "Error exporting aging report");
