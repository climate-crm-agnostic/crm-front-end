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
    user,
    loading,
    error,
    showPass,
    password,
    code,
    step,
    handleSubmit,
    handleVerifyCode,
    resetToCredentials,
    setUser,
    setShowPass,
    setPassword,
    setCode,
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
        <div className="flex items-center justify-center py-12 px-8" style={{ backgroundColor: "var(--background)" }}>
          {/* Green top accent bar */}
          <div className="absolute top-0 left-0 w-1/2 h-1 lg:block hidden" style={{ backgroundColor: "var(--secondary)" }} />
          <div className="mx-auto grid w-full max-w-sm gap-8">

            {/* Brand mark */}
            <div className="flex flex-col items-center gap-4">
              <img src="/climate.svg" alt="Climate by CodeX" className="h-16 w-auto" />
              <div className="text-center">
                <h1
                  className="text-3xl font-semibold"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: "italic", color: "var(--foreground)", letterSpacing: "-0.015em", lineHeight: 1.1 }}
                >
                  Welcome back
                </h1>
                <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                  Sign into your{" "}
                  <span className="font-bold" style={{ color: "#4F8071" }}>ClimateCRM</span>{" "}
                  workspace
                </p>
              </div>
            </div>

            {/* Form */}
            {step === "credentials" ? (
              <form onSubmit={handleSubmit} className="grid gap-4">
                {error && (
                  <div
                    className="flex items-start gap-2.5 rounded-lg p-3 text-sm"
                    style={{ backgroundColor: "var(--muted)", border: "1px solid var(--primary-text)", color: "var(--foreground)" }}
                  >
                    <span
                      className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: "var(--primary)" }}
                    >!</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid gap-1.5">
                  <Label htmlFor="usuario" className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                    Username
                  </Label>
                  <Input
                    id="usuario"
                    type="text"
                    placeholder="Enter your username"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    disabled={loading}
                    className="h-11 rounded-md transition-all"
                    style={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      fontFamily: '"Source Sans 3", Arial, sans-serif',
                    }}
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "var(--primary-text)" }}
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
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      fontFamily: '"Source Sans 3", Arial, sans-serif',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 h-11 rounded-md font-semibold text-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                  style={{
                    backgroundColor: loading ? "color-mix(in srgb, var(--primary) 80%, black)" : "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                    letterSpacing: "0.02em",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 80%, black)")}
                  onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = "var(--primary)")}
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
            ) : (
              <form onSubmit={handleVerifyCode} className="grid gap-4">
                {error && (
                  <div
                    className="flex items-start gap-2.5 rounded-lg p-3 text-sm"
                    style={{ backgroundColor: "var(--muted)", border: "1px solid var(--primary-text)", color: "var(--foreground)" }}
                  >
                    <span
                      className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ backgroundColor: "var(--primary)" }}
                    >!</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  We emailed a verification code to <strong style={{ color: "var(--foreground)" }}>{user}</strong>'s address.
                  It expires in <strong style={{ color: "var(--foreground)" }}>1 minute</strong>.
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
                    Verification code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    required
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    className="h-11 rounded-md transition-all text-center tracking-[0.5em] text-lg"
                    style={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      fontFamily: '"Source Sans 3", Arial, sans-serif',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 h-11 rounded-md font-semibold text-sm transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                  style={{
                    backgroundColor: loading ? "color-mix(in srgb, var(--primary) 80%, black)" : "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                    letterSpacing: "0.02em",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--primary) 80%, black)")}
                  onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = "var(--primary)")}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetToCredentials}
                  disabled={loading}
                  className="text-xs font-medium text-center"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Back to login
                </button>
              </form>
            )}

            <p className="text-center text-xs" style={{ color: "var(--border)" }}>
              © {new Date().getFullYear()} Codex Technologies
            </p>
          </div>
        </div>

        {/* Right — Branding */}
        <div
          className="hidden lg:flex flex-col relative justify-center p-14 overflow-hidden"
          style={{ backgroundColor: "#000000" }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #000000 0%, #142b0a 50%, #000000 100%)" }} />
          <div className="absolute top-[-60px] right-[-60px] h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: "rgba(37,91,1,0.15)" }} />
          <div className="absolute bottom-[-40px] left-[-30px] h-56 w-56 rounded-full blur-3xl" style={{ backgroundColor: "rgba(96,216,5,0.08)" }} />

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />

          <div className="relative z-10 max-w-md mx-auto space-y-10">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{ backgroundColor: "rgba(37,91,1,0.2)", border: "1px solid rgba(37,91,1,0.4)", color: "var(--primary-text)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent)" }} />
              Climate by CodeX
            </div>

            {/* Hero heading — Cormorant Garamond */}
            <div className="space-y-3">
              <h2
                className="text-5xl font-semibold leading-tight"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontStyle: "italic", color: "#ffffff", letterSpacing: "-0.015em", lineHeight: 1.1 }}
              >
                Manage smarter.<br />
                <span style={{ color: "var(--primary-text)" }}>Grow faster.</span>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "#b8b0a8", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                A unified platform to manage clients, leads, and operations — all in one place.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-5">
              {[
                { icon: Briefcase, color: "rgba(37,91,1,0.25)", border: "rgba(37,91,1,0.4)", iconColor: "var(--primary-text)", title: "Sales Pipeline", desc: "Track leads from first contact to closed deal with full visibility." },
                { icon: Users, color: "rgba(96,216,5,0.18)", border: "rgba(96,216,5,0.35)", iconColor: "var(--primary-text)", title: "Client Management", desc: "Keep every client interaction, service record, and follow-up organized." },
                { icon: Zap, color: "rgba(96,216,5,0.18)", border: "rgba(96,216,5,0.35)", iconColor: "var(--primary-text)", title: "Unified Operations", desc: "Connect Sales, Operations, and Finance in one real-time workspace." },
              ].map(({ icon: Icon, color, border, iconColor, title, desc }) => (
                <div key={title} className="flex gap-4 group">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: color, border: `1px solid ${border}` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: iconColor }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "#ffffff", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>{title}</h3>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#b0a89e", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <blockquote
                className="text-sm leading-relaxed"
                style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontStyle: "italic", color: "#c8bfb5" }}
              >
                "Technology that takes your business to the next level."
              </blockquote>
              <p className="text-xs mt-2 font-semibold uppercase tracking-widest" style={{ color: "var(--primary-text)" }}>
                — Climate by CodeX
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Change Password" widthClass="sm:w-1/2 lg:w-1/3">
        <Form fields={changePassFields} initialValues={{ password: "", confirmar_contrasenia: "", usuario: user }} onSubmit={handlePass} />
      </Modal>

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </>
  );
};
