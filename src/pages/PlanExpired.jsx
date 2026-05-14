import { AlertTriangle } from "lucide-react";

export const PlanExpired = () => {
  return (
    <div
      className="w-full min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#FBF7EF", fontFamily: '"Source Sans 3", Arial, sans-serif' }}
    >
      {/* Top accent bar */}
      <div
        className="fixed top-0 left-0 w-full h-1"
        style={{ backgroundColor: "#F29B6B" }}
      />

      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        {/* Icon */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-md"
          style={{ backgroundColor: "#FFDCC8", border: "1px solid #F29B6B" }}
        >
          <AlertTriangle className="h-9 w-9" style={{ color: "#d97c4a" }} />
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <h1
            className="text-4xl font-semibold"
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: "italic",
              color: "#2E2A26",
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
            }}
          >
            Access suspended
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#6b6560" }}>
            Your CodeX CRM subscription has expired or been suspended.
            Please contact support to reactivate your account.
          </p>
        </div>

        {/* Contact CTA */}
        <a
          href="mailto:support@codexacademy.co?subject=CRM Account Reactivation"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm"
          style={{
            backgroundColor: "#F29B6B",
            color: "#FBF7EF",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d97c4a")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F29B6B")}
        >
          Contact support
        </a>

        <p className="text-xs" style={{ color: "#D8D2C4" }}>
          © {new Date().getFullYear()} Codex Technologies
        </p>
      </div>
    </div>
  );
};
