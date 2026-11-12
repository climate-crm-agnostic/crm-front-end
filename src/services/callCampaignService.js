import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const CALL_CAMPAIGNS_URL = `${API_URL}/call-campaigns/`;

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
// thread (paced, capped at max_send_now) and returns immediately with
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
