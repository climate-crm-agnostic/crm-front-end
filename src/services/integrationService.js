import { API_URL, getHeaders, extractErrorMessage } from "./api";

const BASE = `${API_URL}/integrations`;

// Every call throws an Error carrying the server's own plain-language message, so screens can show it as is.
const json = async (res, fallback) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || extractErrorMessage(data, fallback));
    return data;
};

export const getIntegrations = async () =>
    json(await fetch(`${BASE}/`, { headers: getHeaders() }), "Could not load the integrations");

// Write-only: the server never sends a credential back, it only says which ones are set.
export const saveIntegrationCredentials = async (key, values) =>
    json(await fetch(`${BASE}/${key}/credentials/`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(values) }), "Could not save the credentials");

export const deleteIntegrationCredentials = async (key) =>
    json(await fetch(`${BASE}/${key}/credentials/`, { method: "DELETE", headers: getHeaders() }), "Could not remove the credentials");

export const saveIntegrationSettings = async (key, values) =>
    json(await fetch(`${BASE}/${key}/settings/`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify(values) }), "Could not save the settings");

export const runIntegration = async (key) =>
    json(await fetch(`${BASE}/${key}/run/`, { method: "POST", headers: getHeaders() }), "Could not start it");
