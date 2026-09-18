import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatNotifications } from "@/context/ChatNotificationContext";
import { Chat } from "./Chat";
import { ChettAI } from "./ChettAI";

// Single page for Team Chat + Chett AI, switched via tabs instead of two
// separate sidebar destinations. Both panels stay mounted (just hidden via
// CSS) rather than unmounted on tab switch, so the chat websocket connection
// and unread-notification suppression (keyed on the /chat URL in
// ChatNotificationContext) keep working exactly as they did before.
export const ChatHub = () => {
    const { user, isFeatureEnabled } = useAuth();
    const { totalUnread } = useChatNotifications();

    const canSeeChat = isFeatureEnabled("chat");
    const canSeeChett = isFeatureEnabled("ai") &&
        (user?.is_superuser === true || (user?.permissions || []).includes("app.view_aiconversation"));

    const [tab, setTab] = useState(canSeeChat ? "chat" : "chett-ai");

    const tabButtonStyle = (isActive) => ({
        padding: "10px 18px",
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
        background: "transparent",
        border: "none",
        borderBottom: isActive ? "2px solid var(--secondary)" : "2px solid transparent",
        color: isActive ? "var(--secondary)" : "var(--muted-foreground)",
        display: "flex",
        alignItems: "center",
        gap: 6,
    });

    if (!canSeeChat && !canSeeChett) {
        return null;
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            margin: "-1rem",
            marginTop: 0,
            height: "calc(100vh - 3rem)",
            overflow: "hidden",
        }}>
            <div style={{
                display: "flex",
                flexShrink: 0,
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
                padding: "0 12px",
            }}>
                {canSeeChat && (
                    <button style={tabButtonStyle(tab === "chat")} onClick={() => setTab("chat")}>
                        Team Chat
                        {totalUnread > 0 && (
                            <span style={{
                                minWidth: 18, height: 18, borderRadius: 9,
                                background: "#e53e3e", color: "#fff", fontSize: 10, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                            }}>
                                {totalUnread > 99 ? "99+" : totalUnread}
                            </span>
                        )}
                    </button>
                )}
                {canSeeChett && (
                    <button style={tabButtonStyle(tab === "chett-ai")} onClick={() => setTab("chett-ai")}>
                        Chett AI
                    </button>
                )}
            </div>

            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                {canSeeChat && (
                    <div style={{ display: tab === "chat" ? "block" : "none", height: "100%" }}>
                        <Chat embedded />
                    </div>
                )}
                {canSeeChett && (
                    <div style={{ display: tab === "chett-ai" ? "block" : "none", height: "100%" }}>
                        <ChettAI embedded />
                    </div>
                )}
            </div>
        </div>
    );
};
