import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const INDICATORS_URL = `${API_URL}/indicators/`;

export const getIndicators = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return fetchAllPages(`${INDICATORS_URL}?${query}`, { headers: getHeaders() });
};

export const createIndicator = async (data) => {
  const res = await fetch(INDICATORS_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, 'Error creating indicator'));
  }
  return res.json();
};
