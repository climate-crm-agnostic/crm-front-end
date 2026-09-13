import { AlertTriangle } from "lucide-react";

export const PlanExpired = () => {
  return (
    <div
      className="w-full min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--background)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
    >
      {/* Top accent bar */}
      <div
        className="fixed top-0 left-0 w-full h-1"
        style={{ backgroundColor: "var(--primary)" }}
      />

      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        {/* Icon */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-md"
          style={{ backgroundColor: "var(--muted)", border: "1px solid var(--primary)" }}
        >
          <AlertTriangle className="h-9 w-9" style={{ color: "var(--secondary)" }} />
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <h1
            className="text-4xl font-semibold"
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: "italic",
              color: "var(--foreground)",
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
            }}
          >
            Access suspended
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Your CodeX CRM subscription has expired or been suspended.
            Please contact support to reactivate your account.
          </p>
        </div>

        {/* Contact CTA */}
        <a
          href="mailto:support@codexacademy.co?subject=CRM Account Reactivation"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
        >
          Contact support
        </a>

        <p className="text-xs" style={{ color: "var(--border)" }}>
          © {new Date().getFullYear()} Codex Technologies
        </p>
      </div>
    </div>
  );
};
