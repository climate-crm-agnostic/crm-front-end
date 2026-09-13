// Deployment-wide timezone helpers.
//
// The whole app shows dates in the DEPLOYMENT's timezone (set per instance via
// CRM_TIME_ZONE on the backend), NOT the viewer's browser zone — so everyone
// sees one consistent clock regardless of where they log in from. The backend
// exposes it at GET /api/public-config/ (unauthenticated). We fetch it once at
// startup, cache it, and route date formatting through these helpers.
import { API_URL } from "@/services/api";

let _timeZone = null;          // resolved IANA zone, e.g. "America/Tegucigalpa"
let _loadPromise = null;

// Fetches and caches the deployment timezone. Safe to call multiple times —
// only the first triggers a request. Falls back to UTC if the call fails.
export const loadDeploymentTimeZone = async () => {
    if (_timeZone) return _timeZone;
    if (!_loadPromise) {
        _loadPromise = fetch(`${API_URL}/public-config/`, {
            headers: { "Content-Type": "application/json" },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                _timeZone = (data && data.time_zone) || "UTC";
                return _timeZone;
            })
            .catch(() => {
                _timeZone = "UTC";
                return _timeZone;
            });
    }
    return _loadPromise;
};

// The cached zone. Returns undefined until loaded, which makes toLocaleString
// fall back to the browser zone for that first render — acceptable, and it
// corrects itself once loaded. Callers that must be exact should await
// loadDeploymentTimeZone() first.
export const getTimeZone = () => _timeZone || undefined;

// Formats an ISO datetime string in the deployment zone. `opts` are Intl
// options; a sensible 24-hour default is used when omitted.
export const formatDateTime = (value, opts) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
        timeZone: getTimeZone(),
        ...(opts || {}),
    });
};

// Formats an ISO datetime as a date only (no time), in the deployment zone.
export const formatDateTz = (value, opts) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        timeZone: getTimeZone(),
        ...(opts || {}),
    });
};
