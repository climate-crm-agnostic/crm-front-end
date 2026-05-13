const env = import.meta.env.VITE_ENV;

export const API_URL =
  env === 'production'
    ? import.meta.env.VITE_API_PROD
    : import.meta.env.VITE_API_DEV;

// Headers for all API requests — token is in the HttpOnly cookie, not here
export const getHeaders = () => ({
  'Content-Type': 'application/json',
});

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
