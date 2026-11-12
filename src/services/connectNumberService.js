import { API_URL, getHeaders } from './api';

const CONNECT_NUMBER_URL = `${API_URL}/connect-number/`;

// Omit zone to just read the currently claimed number (no AWS call made).
export const getClaimedNumber = async () => {
  const res = await fetch(CONNECT_NUMBER_URL, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Error fetching the claimed number');
  }
  return res.json();
};

export const searchNumbers = async (zone) => {
  const params = new URLSearchParams({ search: '1', zone });
  const res = await fetch(`${CONNECT_NUMBER_URL}?${params.toString()}`, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Error searching available numbers');
  }
  return res.json();
};

export const claimNumber = async (phoneNumber) => {
  const res = await fetch(CONNECT_NUMBER_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Error claiming this number');
  }
  return res.json();
};
