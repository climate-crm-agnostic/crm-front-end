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

export const deleteCampaign = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete campaign');
  return true;
};

export const previewRecipients = async (id) => {
  const res = await fetch(`${CAMPAIGNS_URL}${id}/preview-recipients/`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error previewing recipients');
  return res.json();
};

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
