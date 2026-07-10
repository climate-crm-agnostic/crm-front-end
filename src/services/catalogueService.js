import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from "./api";

const endPoint = "catalogue";
const url = `${API_URL}/${endPoint}/`;

export const getCatalogueItems = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const finalUrl = queryParams ? `${url}?${queryParams}` : url;

    return fetchAllPages(finalUrl, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const getCatalogueItemById = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching catalogue item");
    return res.json();
};

export const createCatalogueItem = async (data) => {
    const res = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating catalogue item"));
    }
    return res.json();
};

export const updateCatalogueItem = async (id, data) => {
    const res = await fetch(`${url}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating catalogue item"));
    }
    return res.json();
};

export const deleteCatalogueItem = async (id) => {
    const res = await fetch(`${url}${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting catalogue item");
    return true;
};

export const getCatalogueItemAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/catalogue_item/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const exportCatalogueItemsExcel = async () => {
    const res = await fetch(`${url}export_excel/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error exporting catalogue to Excel");
    return res.blob();
};

export const uploadCatalogueItemImage = async (id, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const token = localStorage.getItem('auth_token');
    const headers = {
        ...(token && { 'Authorization': `Token ${token}` })
    };

    const res = await fetch(`${url}${id}/files/`, {
        method: "POST",
        headers: headers,
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error uploading file: ${res.status} ${text}`);
    }
    return res.json();
};

// --- Price Tiers (Nested under Catalogue Item) ---

export const getPriceTiers = async (catalogueItemId) => {
    return fetchAllPages(`${url}${catalogueItemId}/price-tiers/`, {
        method: "GET",
        headers: getHeaders(),
    });
};

export const getPriceTierById = async (catalogueItemId, tierId) => {
    const res = await fetch(`${url}${catalogueItemId}/price-tiers/${tierId}/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching price tier");
    return res.json();
};

export const createPriceTier = async (catalogueItemId, data) => {
    const res = await fetch(`${url}${catalogueItemId}/price-tiers/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error creating price tier"));
    }
    return res.json();
};

export const updatePriceTier = async (catalogueItemId, tierId, data) => {
    const res = await fetch(`${url}${catalogueItemId}/price-tiers/${tierId}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData, "Error updating price tier"));
    }
    return res.json();
};

export const deletePriceTier = async (catalogueItemId, tierId) => {
    const res = await fetch(`${url}${catalogueItemId}/price-tiers/${tierId}/`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error deleting price tier");
    return true;
};

export const getPriceTierAttributes = async () => {
    return fetchAllPages(`${API_URL}/attributes/price_tier/`, {
        method: "GET",
        headers: getHeaders(),
    });
};
