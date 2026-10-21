import { useEffect, useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatNotificationProvider, useChatNotifications } from "@/context/ChatNotificationContext"
import { IconRail } from "@/components/shell/IconRail"
import { TopNav } from "@/components/shell/TopNav"
import { CommandPalette } from "@/components/shell/CommandPalette"

function ChatToasts() {
    const { toasts, dismissToast } = useChatNotifications();
    const navigate = useNavigate();
    if (toasts.length === 0) return null;
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            display: 'flex', flexDirection: 'column-reverse', gap: 8,
            pointerEvents: 'none',
        }}>
            {toasts.map(toast => {
                const isTask = toast.kind === 'task_assigned';
                return (
                    <div
                        key={toast.id}
                        onClick={() => { dismissToast(toast.id); navigate(isTask ? '/task' : '/chat'); }}
                        style={{
                            pointerEvents: 'auto', cursor: 'pointer',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderLeft: `3px solid ${isTask ? '#c0622a' : 'var(--secondary-text)'}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                            minWidth: 220, maxWidth: 300,
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                            {isTask ? `📋 New task assigned` : `💬 ${toast.sender_username}`}
                        </p>
                        <p style={{
                            margin: '3px 0 0', fontSize: 12, color: 'var(--muted-foreground)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {isTask ? toast.title : toast.content}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function Shell() {
    const [searchOpen, setSearchOpen] = useState(false);

    // ⌘K / Ctrl+K opens the page switcher from anywhere.
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setSearchOpen((open) => !open);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="flex min-h-screen gap-4 bg-background p-4 pb-24 md:pb-4">
            <IconRail />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TopNav onOpenSearch={() => setSearchOpen(true)} />
                <main className="flex flex-1 flex-col gap-4">
                    <Outlet />
                </main>
            </div>
            <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </div>
    )
}

export default function AdminLayout() {
    return (
        <ChatNotificationProvider>
            <TooltipProvider delayDuration={0}>
                <Shell />
            </TooltipProvider>
            <ChatToasts />
        </ChatNotificationProvider>
    )
}
