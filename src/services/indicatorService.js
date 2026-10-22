import { API_URL, getHeaders, fetchAllPages, extractErrorMessage } from './api';

const INDICATORS_URL = `${API_URL}/indicators/`;

const send = async (url, method, data, fallback) => {
  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const error = new Error(extractErrorMessage(errorData, fallback));
    error.fields = errorData && typeof errorData === 'object' ? errorData : {};
    throw error;
  }
  return res.status === 204 ? null : res.json();
};

export const getIndicators = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return fetchAllPages(`${INDICATORS_URL}?${query}`, { headers: getHeaders() });
};

export const getIndicator = (id) => fetch(`${INDICATORS_URL}${id}/`, { headers: getHeaders() }).then(async (res) => {
  if (!res.ok) throw new Error('Could not load the KPI.');
  return res.json();
});

export const createIndicator = (data) => send(INDICATORS_URL, 'POST', data, 'Error creating KPI');
export const updateIndicator = (id, data) => send(`${INDICATORS_URL}${id}/`, 'PATCH', data, 'Error updating KPI');
export const deleteIndicator = (id) => send(`${INDICATORS_URL}${id}/`, 'DELETE', undefined, 'Error deleting KPI');

/** Everything the rule form may offer: entities, aggregations, fields, operators. */
export const getIndicatorSchema = () => fetch(`${INDICATORS_URL}schema/`, { headers: getHeaders() }).then(async (res) => {
  if (!res.ok) throw new Error('Could not load the KPI options.');
  return res.json();
});

/** Evaluates an unsaved rule (month to date, everyone). Rejects with `error.fields` when the rule is invalid. */
export const previewIndicator = (rule) => send(`${INDICATORS_URL}preview/`, 'POST', rule, 'Invalid rule');
