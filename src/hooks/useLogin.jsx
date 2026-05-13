import { useAuth } from "@/context/AuthContext";
import { postToken } from "@/services/login";
import { API_URL } from "@/services/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!user || !password) return;

    setLoading(true);

    try {
      const res = await postToken({ username: user, password: password });

      if (res?.ok && res?.data) {
        login(res.data);
        navigate("/", { replace: true });
      } else {
        const msg = res?.data?.detail || res?.status_text || "Invalid credentials.";
        setError(msg);
        setUser("");
        setPassword("");
      }
    } catch (err) {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return {
    //properties
    user,
    loading,
    error,
    showPass,
    password,
    isModalOpen,

    //methods
    handleSubmit,
    setUser,
    setShowPass,
    setPassword,
    setIsModalOpen,
  };
};
