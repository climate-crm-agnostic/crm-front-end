import { Bot } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChettAccess } from "@/hooks/useMenu";
import { AI_NAME, AI_SHORT, AI_PATH } from "@/lib/brand";

/** Intelligence by CodeX Academy, one tap away from every page: a floating button in the bottom-right corner. */
export function ChettButton() {
    const allowed = useChettAccess();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    // Already there, or not available to this user / plan.
    if (!allowed || pathname.startsWith(AI_PATH)) return null;

    return (
        <button
            type="button"
            onClick={() => navigate(AI_PATH)}
            aria-label={`Ask ${AI_NAME}`}
            title={`Ask ${AI_NAME}`}
            // Above the phone's bottom bar; chat toasts stack above this button.
            className="fixed bottom-20 right-4 z-40 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
        >
            <Bot className="size-5" aria-hidden="true" />
            <span className="hidden md:inline">Ask {AI_SHORT}</span>
        </button>
    );
}
