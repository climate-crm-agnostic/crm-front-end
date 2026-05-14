import { createContext, useContext, useEffect, useRef, useState } from "react";
import { API_URL, getHeaders } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const loggingOut = useRef(false);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`${API_URL}/plan/`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } catch {
      // Plan fetch failure is non-fatal
    }
  };

  const sessionValidate = async () => {
    try {
      const res = await fetch(`${API_URL}/me/`, {
        method: "GET",
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.permissions) {
          localStorage.setItem("user_permissions", JSON.stringify(data.permissions));
          localStorage.setItem("user_data", JSON.stringify(data));
        }
        await fetchPlan();
      } else {
        // Check if the failure is due to plan expiry
        try {
          const body = await res.json();
          if (body.plan_expired) {
            window.location.href = "/plan-expired";
            return;
          }
        } catch {
          // Non-JSON body — treat as normal auth failure
        }
        setUser(null);
      }
    } catch (err) {
      console.error("Error session validation:", err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Validate token on app load
  useEffect(() => {
    sessionValidate();
  }, []);

  // Auto-logout when any API call returns 401 (token expired on the server)
  useEffect(() => {
    const handleTokenExpired = () => logout();
    window.addEventListener("auth:token-expired", handleTokenExpired);
    return () => window.removeEventListener("auth:token-expired", handleTokenExpired);
  }, []);

  const login = (userData) => {
    setUser(userData);
    if (userData?.permissions) {
      localStorage.setItem("user_permissions", JSON.stringify(userData.permissions));
      localStorage.setItem("user_data", JSON.stringify(userData));
    }
    fetchPlan();
  };

  const logout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;

    // Invalidate the token on the server before clearing local state
    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        headers: getHeaders(),
      });
    } catch {
      // Network error — proceed with local logout regardless
    }

    localStorage.removeItem("user_permissions");
    localStorage.removeItem("user_data");
    setUser(null);
    setPlan(null);
    loggingOut.current = false;
    if (!window.location.pathname.includes('/login')) {
      window.location.href = "/login";
    }
  };

  /**
   * Returns whether a named feature is enabled on the current plan.
   * Defaults to true when plan data hasn't loaded yet (avoids false negatives).
   */
  const isFeatureEnabled = (featureName) => {
    if (!plan?.features) return true;
    const val = plan.features[featureName];
    if (val === undefined) return true;
    return val !== false && val !== 0;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        isAuthenticated: !!user,
        isFeatureEnabled,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
