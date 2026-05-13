import { createContext, useContext, useEffect, useRef, useState } from "react";
import { API_URL, getHeaders } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const loggingOut = useRef(false);

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
      } else {
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
    loggingOut.current = false;
    if (!window.location.pathname.includes('/login')) {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
