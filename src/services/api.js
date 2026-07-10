const env = import.meta.env.VITE_ENV;

export const API_URL =
  env === 'production'
    ? import.meta.env.VITE_API_PROD
    : import.meta.env.VITE_API_DEV;

// Headers for all API requests — token is in the HttpOnly cookie, not here
export const getHeaders = () => ({
  'Content-Type': 'application/json',
});

// DRF's PageNumberPagination (PAGE_SIZE=250) caps list endpoints at one
// page — a plain `fetch` silently drops anything past record #250 and
// `data.next` goes unused. This follows `next` until exhausted so callers
// always get the full list, same shape they already expect.
export const fetchAllPages = async (url, options) => {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, options);
    if (!res.ok) throw new Error("Error fetching data");
    const data = await res.json();
    if (Array.isArray(data)) return data; // endpoint isn't paginated
    results = results.concat(data.results || []);
    nextUrl = data.next;
  }
  return results;
};

// DRF validation errors can nest arbitrarily deep (e.g. a JSONField
// field-level validator raising {field: "msg"} gets wrapped as
// {"attributes": {"lead_email": "msg"}}). Walks the error object and
// collects every leaf string instead of assuming a fixed depth.
export const extractErrorMessage = (errorData, fallback = "An error occurred") => {
  if (!errorData) return fallback;
  const messages = [];
  const visit = (val) => {
    if (typeof val === "string") messages.push(val);
    else if (Array.isArray(val)) val.forEach(visit);
    else if (val && typeof val === "object") Object.values(val).forEach(visit);
  };
  visit(errorData);
  return messages.length ? messages.join(" ") : fallback;
};

// Global fetch interceptor:
// 1. Adds credentials: 'include' so the browser always sends the auth cookie
// 2. Fires auth:token-expired on 401 so AuthContext can trigger logout
const _originalFetch = window.fetch.bind(window);
window.fetch = async (url, options = {}) => {
  const mergedOptions = {
    credentials: 'include',
    ...options,
  };
  const response = await _originalFetch(url, mergedOptions);
  const urlStr = String(url);
  if (
    response.status === 401 &&
    !urlStr.includes('/login/') &&
    !urlStr.includes('/me/')
  ) {
    window.dispatchEvent(new CustomEvent('auth:token-expired'));
  }
  return response;
};
