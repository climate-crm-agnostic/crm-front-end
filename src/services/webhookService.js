import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const WEBHOOK_API_URL = `${API_URL}/webhooks/`;

export const getWebhooks = async () => {
  return fetchAllPages(WEBHOOK_API_URL, {
    headers: getHeaders(),
  });
};

export const getWebhook = async (id) => {
  const response = await fetch(`${WEBHOOK_API_URL}${id}/`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch webhook');
  return await response.json();
};

export const createWebhook = async (webhook) => {
  const response = await fetch(WEBHOOK_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(webhook),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Failed to create webhook"));
  }
  return await response.json();
};

export const updateWebhook = async (id, webhook) => {
  const response = await fetch(`${WEBHOOK_API_URL}${id}/`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(webhook),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Failed to update webhook"));
  }
  return await response.json();
};

export const deleteWebhook = async (id) => {
  const response = await fetch(`${WEBHOOK_API_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete webhook');
  return true;
};
