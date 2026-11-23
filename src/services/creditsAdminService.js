import { API_URL, getHeaders } from "./api";

const BASE = `${API_URL}/ai/credits`;

const json = async (res, fallback) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || fallback);
    return data;
};

/** Every user's balance for a month (YYYY-MM; omit for the current month). Administrators only. */
export const getCreditUsers = async (period) => {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    return json(await fetch(`${BASE}/users/${qs}`, { headers: getHeaders() }), "Could not load the credit balances");
};

/** This month's top-ups, optionally for one user. */
export const getCreditTopUps = async (userId) => {
    const qs = userId ? `?user=${encodeURIComponent(userId)}` : "";
    return json(await fetch(`${BASE}/topups/${qs}`, { headers: getHeaders() }), "Could not load the top-ups");
};

/** The account's monthly knowledge-ingestion budget (shared by every administrator, separate from personal credits). */
export const getIngestionBudget = async () =>
    json(await fetch(`${BASE}/ingestion/`, { headers: getHeaders() }), "Could not load the ingestion budget");

/**
 * Gives one user extra credits for the current month ({ user, credits, note }), or adds to the
 * account's ingestion budget ({ pool: "ingestion", credits, note }). Returns the new summary.
 */
export const createCreditTopUp = async ({ user, pool, credits, note }) =>
    json(await fetch(`${BASE}/topups/`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify(pool === "ingestion" ? { pool, credits, note: note || "" } : { user, credits, note: note || "" }),
    }), "Could not add the credits");
