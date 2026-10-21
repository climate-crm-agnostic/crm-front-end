import { API_URL, getHeaders, extractErrorMessage } from './api';

const get = async (path, params = {}, fallback = 'Error loading dashboard') => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/dashboard/${path}/${query ? `?${query}` : ''}`, { headers: getHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, fallback));
  }
  return res.json();
};

/** The three indicators for this month (with change and a 12-week sparkline) and the latest wins. */
export const getDashboardSummary = (scope) => get('summary', scope ? { scope } : {});

/** Revenue per bucket next to the previous window. granularity: day|week|month; kind: all|product|service. */
export const getRevenueSeries = ({ granularity = 'month', kind = 'all', scope } = {}) =>
  get('revenue-series', { granularity, kind, ...(scope ? { scope } : {}) }, 'Error loading revenue');
