import { Bot } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChettAccess } from "@/hooks/useMenu";

/** Chett AI on phones: a floating button above the bottom bar. Desktop has it in the IconRail instead. */
export function ChettButton() {
    const allowed = useChettAccess();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    // Already there, or not available to this user / plan.
    if (!allowed || pathname.startsWith("/chett-ai")) return null;

    return (
        <button
            type="button"
            onClick={() => navigate("/chett-ai")}
            aria-label="Ask Chett AI"
            title="Ask Chett AI"
            // Above the phone's bottom bar; chat toasts stack above this button.
            // A round icon that widens to show its label on hover/focus, so it covers less of the page.
            className="group md:hidden fixed bottom-20 right-4 z-40 inline-flex h-12 min-w-12 cursor-pointer items-center justify-center rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-lg outline-none transition-all hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
        >
            <Bot className="size-5 shrink-0" aria-hidden="true" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 md:group-hover:ml-2 md:group-hover:max-w-28 md:group-hover:opacity-100 md:group-focus-visible:ml-2 md:group-focus-visible:max-w-28 md:group-focus-visible:opacity-100">
                Ask Chett
            </span>
        </button>
    );
}
