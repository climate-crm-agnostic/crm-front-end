import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
    useSidebar
} from "@/components/ui/sidebar"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { ChatNotificationProvider, useChatNotifications } from "@/context/ChatNotificationContext"

const routeLabels = {
    "/": "Dashboard", "/lead": "Leads", "/client": "Clients",
    "/contact": "Contacts", "/service": "Services", "/invoice": "Invoices",
    "/inventory": "Inventory", "/asset": "Assets", "/assetassignment": "Asset Assignments",
    "/pipeline": "Pipelines", "/attribute": "Attributes", "/category": "Categories",
    "/catalogue": "Catalogue", "/followup": "Follow-ups", "/webhook": "Webhooks",
    "/apidocs": "API Docs", "/faq": "FAQ", "/my-info": "My Info",
    "/chat": "Team Chat",
};

function getPageTitle(pathname) {
    const base = "/" + pathname.split("/")[1];
    return routeLabels[base] ?? null;
}

function AdminLayoutContent() {
    const { setOpen, open, isMobile } = useSidebar()
    const location = useLocation()
    const pageTitle = getPageTitle(location.pathname)

    return (
        <>
            <AppSidebar />
            <SidebarInset
                onClick={() => { if (open && !isMobile) setOpen(false) }}
                className="bg-background"
            >
                <header
                    className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--background) 90%, transparent)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                    }}
                >
                    <div className="flex items-center gap-3 px-4 w-full">
                        <SidebarTrigger
                            className="-ml-1 transition-all rounded"
                            style={{ backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)" }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 bg-border" />
                        {pageTitle && (
                            <span
                                className="text-sm font-medium hidden sm:block text-muted-foreground"
                                style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                            >
                                {pageTitle}
                            </span>
                        )}
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Outlet />
                </div>
            </SidebarInset>

        </>
    )
}

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
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    onClick={() => { dismissToast(toast.id); navigate('/chat'); }}
                    style={{
                        pointerEvents: 'auto', cursor: 'pointer',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderLeft: '3px solid #5E6A43',
                        borderRadius: 10,
                        padding: '10px 14px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                        minWidth: 220, maxWidth: 300,
                    }}
                >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                        💬 {toast.sender_username}
                    </p>
                    <p style={{
                        margin: '3px 0 0', fontSize: 12, color: 'var(--muted-foreground)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {toast.content}
                    </p>
                </div>
            ))}
        </div>
    );
}

export default function AdminLayout() {
    return (
        <ChatNotificationProvider>
            <SidebarProvider defaultOpen={false}>
                <AdminLayoutContent />
                <ChatToasts />
            </SidebarProvider>
        </ChatNotificationProvider>
    )
}
