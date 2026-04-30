import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Users, Zap, ArrowRight } from "lucide-react";
import { useLogin } from "@/hooks/useLogin";
import { Modal } from "@/components/Modal";
import { Form } from "@/components/Form";
import { Notification } from "@/components/Notification";
import { useState } from "react";
import { handleSaveCrud } from "@/utils/handleOperacion";

export const Login = ({ className, ...props }) => {
  const {
    usuario,
    loading,
    error,
    showPass,
    password,
    handleSubmit,
    setUser,
    setShowPass,
    setPassword,
    isModalOpen,
    setIsModalOpen,
  } = useLogin();

  const [notification, setNotification] = useState(null);

  const changePassFields = [
    { name: "usuario", label: "Username", type: "text", placeholder: "Username", required: true, disabled: true },
    { name: "password", label: "New Password", type: "password", placeholder: "Enter your new password", required: true },
    { name: "confirmar_contrasenia", label: "Confirm New Password", type: "password", placeholder: "Confirm your new password", required: true },
  ];

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUser("");
    setPassword("");
    setShowPass(false);
  };

  const handlePass = async (newPass) => {
    const { password, confirmar_contrasenia } = newPass;
    if (password !== confirmar_contrasenia) {
      setNotification({ message: "Passwords do not match.", type: "warning" });
      return;
    }
    const resetForm = async () => { setUser(""); setPassword(""); setShowPass(false); };
    await handleSaveCrud(newPass, resetForm, setNotification, setIsModalOpen);
  };

  return (
    <>
      <div className="w-full h-screen lg:grid lg:grid-cols-2" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>

        {/* Left — Form */}
        <div className="flex items-center justify-center py-12 px-8" style={{ backgroundColor: "#FBF7EF" }}>
          {/* Green top accent bar */}
          <div className="absolute top-0 left-0 w-1/2 h-1 lg:block hidden" style={{ backgroundColor: "#5E6A43" }} />
          <div className="mx-auto grid w-full max-w-sm gap-8">

            {/* Brand mark */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-lg shadow-md"
                style={{ backgroundColor: "#5E6A43" }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="text-center">
                <h1
                  className="text-3xl font-semibold"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: "italic", color: "#2E2A26", letterSpacing: "-0.015em", lineHeight: 1.1 }}
                >
                  Welcome back
                </h1>
                <p className="text-sm mt-1.5" style={{ color: "#6b6560" }}>
                  Sign in to your{" "}
                  <span className="font-bold" style={{ color: "#4F8071" }}>CodeX CRM</span>{" "}
                  workspace
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="grid gap-4">
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg p-3 text-sm"
                  style={{ backgroundColor: "#FFDCC8", border: "1px solid #F29B6B", color: "#2E2A26" }}
                >
                  <span
                    className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full text-white text-xs font-bold"
                    style={{ backgroundColor: "#F29B6B" }}
                  >!</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="usuario" className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b6560" }}>
                  Username
                </Label>
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Enter your username"
                  required
                  value={usuario}
                  onChange={(e) => setUser(e.target.value)}
                  disabled={loading}
                  className="h-11 rounded-md transition-all"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #D8D2C4",
                    color: "#2E2A26",
                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                  }}
                />
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b6560" }}>
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "#F29B6B" }}
                    tabIndex={-1}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 rounded-md transition-all"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #D8D2C4",
                    color: "#2E2A26",
                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 h-11 rounded-md font-semibold text-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                style={{
                  backgroundColor: loading ? "#d97c4a" : "#F29B6B",
                  color: "#FBF7EF",
                  fontFamily: '"Source Sans 3", Arial, sans-serif',
                  letterSpacing: "0.02em",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "#d97c4a")}
                onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = "#F29B6B")}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs" style={{ color: "#D8D2C4" }}>
              © {new Date().getFullYear()} Codex Technologies
            </p>
          </div>
        </div>

        {/* Right — Branding */}
        <div
          className="hidden lg:flex flex-col relative justify-center p-14 overflow-hidden"
          style={{ backgroundColor: "#2E2A26" }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #2E2A26 0%, #3d3830 50%, #2a2620 100%)" }} />
          <div className="absolute top-[-60px] right-[-60px] h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: "rgba(94,106,67,0.15)" }} />
          <div className="absolute bottom-[-40px] left-[-30px] h-56 w-56 rounded-full blur-3xl" style={{ backgroundColor: "rgba(242,155,107,0.08)" }} />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: "linear-gradient(rgba(251,247,239,1) 1px, transparent 1px), linear-gradient(90deg, rgba(251,247,239,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />

          <div className="relative z-10 max-w-md mx-auto space-y-10">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{ backgroundColor: "rgba(94,106,67,0.2)", border: "1px solid rgba(94,106,67,0.4)", color: "#B8C76A" }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#B8C76A" }} />
              Codex CRM Platform
            </div>

            {/* Hero heading — Cormorant Garamond */}
            <div className="space-y-3">
              <h2
                className="text-5xl font-semibold leading-tight"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: "italic", color: "#FBF7EF", letterSpacing: "-0.015em", lineHeight: 1.1 }}
              >
                Manage smarter.<br />
                <span style={{ color: "#B8C76A" }}>Grow faster.</span>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#b8b0a8", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                A unified platform to manage clients, leads, and operations — all in one place.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-5">
              {[
                { icon: Briefcase, color: "rgba(94,106,67,0.25)", border: "rgba(94,106,67,0.4)", iconColor: "#B8C76A", title: "Sales Pipeline", desc: "Track leads from first contact to closed deal with full visibility." },
                { icon: Users, color: "rgba(242,155,107,0.18)", border: "rgba(242,155,107,0.35)", iconColor: "#F29B6B", title: "Client Management", desc: "Keep every client interaction, service record, and follow-up organized." },
                { icon: Zap, color: "rgba(184,199,106,0.18)", border: "rgba(184,199,106,0.35)", iconColor: "#B8C76A", title: "Unified Operations", desc: "Connect Sales, Operations, and Finance in one real-time workspace." },
              ].map(({ icon: Icon, color, border, iconColor, title, desc }) => (
                <div key={title} className="flex gap-4 group">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: color, border: `1px solid ${border}` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: iconColor }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>{title}</h3>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#b0a89e", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="pt-8" style={{ borderTop: "1px solid rgba(251,247,239,0.15)" }}>
              <blockquote
                className="text-sm leading-relaxed"
                style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontStyle: "italic", color: "#c8bfb5" }}
              >
                "Technology that takes your business to the next level."
              </blockquote>
              <p className="text-xs mt-2 font-semibold uppercase tracking-widest" style={{ color: "#B8C76A" }}>
                — Codex Technologies
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Change Password" widthClass="sm:w-1/2 lg:w-1/3">
        <Form fields={changePassFields} initialValues={{ password: "", confirmar_contrasenia: "", usuario }} onSubmit={handlePass} />
      </Modal>

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </>
  );
};
