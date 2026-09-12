import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const CAMPAIGNS_URL = `${API_URL}/campaigns/`;

export const getCampaigns = async () => {
  return fetchAllPages(CAMPAIGNS_URL, { headers: getHeaders() });
};

export const createCampaign = async (data) => {
  const res = await fetch(CAMPAIGNS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating campaign'));
  }
  return res.json();
};

export const updateCampaign = async (id, data) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating campaign'));
  }
  return res.json();
};

export const deleteCampaign = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete campaign');
  return true;
};

// Filterable fields for the audience builder — fixed model columns + this
// tenant's custom attributes, per entity, straight from the backend (which is
// the single source of truth / security whitelist). Omit `entity` to get all
// three keyed by entity. Each field: { name, label, type, fixed, list_values? }.
// Client-entity only: per eligible client, its mailable contacts + the
// selected one (default = primary/first). Used by the "Configure Recipients"
// step, which is mandatory before a client campaign can be sent.
export const getRecipientsConfig = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/recipients-config/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching recipient configuration');
  return res.json();
};

// selections: { [clientId]: contactId }
export const saveRecipientsConfig = async (id, selections) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/recipients-config/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ selections }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error saving recipients'));
  }
  return res.json();
};

export const getAudienceFields = async (entity) => {
  const url = entity
    ? `${CAMPAIGNS_URL}audience-fields/?entity=${encodeURIComponent(entity)}`
    : `${CAMPAIGNS_URL}audience-fields/`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching audience fields');
  return res.json();
};

export const previewRecipients = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/preview-recipients/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error previewing recipients');
  return res.json();
};

// Kicks off the send — backend runs it in a background thread (paced under
// SES's rate limit) and returns immediately with { status: 'started', total }.
// Poll getSendProgress(id) for live progress until status is 'sent'.
export const sendCampaignNow = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/send-now/`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error sending campaign'));
  }
  return res.json();
};

export const getSendProgress = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/send-progress/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error checking send progress');
  return res.json();
};

// Actual per-recipient outcome after a send (status: sent/failed + reason)
// — distinct from previewRecipients, which is a pre-send "who would get
// this" estimate.
export const getCampaignRecipients = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/recipients/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching recipients');
  return res.json();
};

// Public — no auth header needed, but harmless to send since AllowAny.
export const unsubscribeByToken = async (token) => {
  const res = await fetch(`${API_URL}/campaigns/unsubscribe/${token}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'This unsubscribe link is invalid or has expired.');
  return data;
};
