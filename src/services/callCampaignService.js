import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const CALL_CAMPAIGNS_URL = `${API_URL}/call-campaigns/`;

// Calling balance ($1 per minute): { balance_cents, reserved_cents, available_cents,
// price_cents_per_minute, min_call_minutes, max_call_minutes }.
// Balance history (DynamoDB), newest first: { entries, next_cursor, ledger_enabled }.
export const getCallingLedger = async ({ campaign, cursor, limit = 50 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (campaign) params.set('campaign', campaign);
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${API_URL}/calling/ledger/?${params}`, { headers: getHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error fetching the balance history'));
  }
  return res.json();
};

// What one campaign moved in the balance: reserved, given back, charged, minutes, answered/unanswered calls.
export const getCampaignSpend = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/spend/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching the campaign spend');
  return res.json();
};

// Simultaneous-calls limit and the AWS request to raise it:
// { max_concurrent_calls, source, increase_request, active_calls }.
export const getCallingLimits = async () => {
  const res = await fetch(`${API_URL}/calling/limits/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching the calling limits');
  return res.json();
};

export const getCallingBalance = async () => {
  const res = await fetch(`${API_URL}/calling/balance/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching the calling balance');
  return res.json();
};

export const getCallCampaigns = async () => {
  return fetchAllPages(CALL_CAMPAIGNS_URL, { headers: getHeaders() });
};

export const createCallCampaign = async (data) => {
  const res = await fetch(CALL_CAMPAIGNS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating call campaign'));
  }
  return res.json();
};

export const updateCallCampaign = async (id, data) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating call campaign'));
  }
  return res.json();
};

export const deleteCallCampaign = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete call campaign');
  return true;
};

// Contact-only field catalog (fixed columns + this tenant's custom
// attributes) — see app/models/calling.py::CallCampaign for why Lead/Client
// aren't supported yet. A flat array, unlike campaignService's
// getAudienceFields (which is keyed by entity across contact/client/lead).
export const getAudienceFields = async () => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}audience-fields/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching audience fields');
  return res.json();
};

export const previewRecipients = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/preview-recipients/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error previewing recipients');
  return res.json();
};

// Kicks off the batch — backend dispatches each call from a background
// thread (never more calls at once than the line allows, see preview's
// max_concurrent_calls) and returns immediately with
// { status: 'started', total }. Poll getSendProgress(id) for live progress.
// 'completed' recipients only means the call ended — not that it was
// answered (see CallCampaignRecipient docstring on the backend).
export const sendCallCampaignNow = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/send-now/`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error starting call campaign'));
  }
  return res.json();
};

// Stops dialing the contacts not called yet (they become 'failed' with a "not called" reason).
// Calls already in progress are not hung up; they finish and report back as usual.
export const stopCallCampaign = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/stop/`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error stopping call campaign'));
  }
  return res.json();
};

export const getSendProgress = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/send-progress/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error checking call progress');
  return res.json();
};

export const getCallCampaignRecipients = async (id) => {
  const res = await fetch(`${CALL_CAMPAIGNS_URL}${id}/recipients/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error fetching recipients');
  return res.json();
};
