import { useAuth } from "@/context/AuthContext";
import { postToken, verifyLoginCode } from "@/services/login";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("credentials"); // "credentials" | "code"

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const resetToCredentials = () => {
    setStep("credentials");
    setPassword("");
    setCode("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!user || !password) return;

    setLoading(true);

    try {
      const res = await postToken({ username: user, password: password });

      if (res?.ok && res?.status === 202) {
        // Credentials are valid — a verification code was emailed to the
        // user. Drop the password from memory now that it's done its job.
        setPassword("");
        setStep("code");
      } else {
        const msg = res?.data?.detail || res?.status_text || "Invalid credentials.";
        setError(msg);
        setUser("");
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");

    if (!code) return;

    setLoading(true);

    try {
      const res = await verifyLoginCode({ username: user, code });

      if (res?.ok && res?.data) {
        // /login/verify/ sets the HttpOnly auth cookie and returns the user
        // data directly in the body (same shape as /me/) — no extra round trip.
        login(res.data);
        navigate("/", { replace: true });
      } else {
        const msg = res?.data?.detail || res?.status_text || "Invalid or expired code.";
        setError(msg);
        setCode("");
      }
    } catch (err) {
      console.error(err);
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
    code,
    step,
    isModalOpen,

    //methods
    handleSubmit,
    handleVerifyCode,
    resetToCredentials,
    setUser,
    setShowPass,
    setPassword,
    setCode,
    setIsModalOpen,
  };
};
