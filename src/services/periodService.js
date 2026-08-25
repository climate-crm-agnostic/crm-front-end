import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const PERIODS_URL = `${API_URL}/periods/`;

export const getPeriods = async () => {
  return fetchAllPages(PERIODS_URL, { headers: getHeaders() });
};

export const createPeriod = async (data) => {
  const res = await fetch(PERIODS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating period'));
  }
  return res.json();
};

export const updatePeriod = async (id, data) => {
  const res = await fetch(`${PERIODS_URL}${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error updating period'));
  }
  return res.json();
};

export const deletePeriod = async (id) => {
  const res = await fetch(`${PERIODS_URL}${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete period');
  return true;
};
