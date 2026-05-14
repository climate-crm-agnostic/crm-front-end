import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Wraps content that requires a specific plan feature.
 * Renders a tasteful upgrade prompt instead of the children when the feature
 * is disabled on the active plan.
 *
 * Usage:
 *   <FeatureGate feature="webhooks">
 *     <WebhookList />
 *   </FeatureGate>
 */
export const FeatureGate = ({ feature, children }) => {
  const { isFeatureEnabled } = useAuth();

  if (isFeatureEnabled(feature)) {
    return children;
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6"
      style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
        style={{ backgroundColor: "#F5F0E8", border: "1px solid #D8D2C4" }}
      >
        <Lock className="h-7 w-7" style={{ color: "#5E6A43" }} />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2
          className="text-2xl font-semibold"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: "italic",
            color: "#2E2A26",
          }}
        >
          Feature not available
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "#6b6560" }}>
          This module is not included in your current plan. Upgrade to unlock
          it and get access to all CodeX CRM capabilities.
        </p>
      </div>

      <a
        href="mailto:support@codexacademy.co?subject=Plan Upgrade Request"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
        style={{
          backgroundColor: "#5E6A43",
          color: "#FBF7EF",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4a5535")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#5E6A43")}
      >
        Contact us to upgrade
      </a>
    </div>
  );
};
