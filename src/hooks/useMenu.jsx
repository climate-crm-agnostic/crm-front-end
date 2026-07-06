import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

const MENU_CONFIG = [
    {
        label: "CRM",
        items: [
            { title: "Leads",    url: "/lead",     icon: "Magnet",    permission: "app.add_lead" },
            { title: "Clients",  url: "/client",   icon: "Building2", permission: "app.add_client" },
            { title: "Contacts", url: "/contact",  icon: "UserCircle",permission: "app.add_contact" },
            { title: "Services", url: "/service",  icon: "Briefcase", permission: "app.add_service" },
            { title: "Pipeline", url: "/pipeline", icon: "GitMerge",  permission: "app.add_pipeline" },
        ],
    },
    {
        label: "Billing / Inventory",
        items: [
            { title: "Invoices",   url: "/invoice",   icon: "Receipt",    permission: "app.add_invoice" },
            { title: "Catalogue",  url: "/catalogue", icon: "Package",    permission: "app.add_catalogueitem" },
            { title: "Categories", url: "/category",  icon: "FolderTree", permission: "app.add_category" },
            { title: "Inventory",  url: "/inventory", icon: "Warehouse",  permission: "app.add_inventory",  feature: "inventory" },
        ],
    },
    {
        label: "Assets",
        items: [
            { title: "Assets",            url: "/asset",           icon: "Laptop",        permission: "app.add_asset",           feature: "assets" },
            { title: "Asset Assignments", url: "/assetassignment", icon: "ClipboardList", permission: "app.add_assetassignment", feature: "assets" },
        ],
    },
    {
        label: "AI",
        items: [
            { title: "Chett AI", url: "/chett-ai", icon: "Bot", permission: "app.view_aiconversation", feature: "ai" },
        ],
    },
    {
        label: "Communication",
        items: [
            { title: "Team Chat", url: "/chat", icon: "MessageCircle", feature: "chat" },
        ],
    },
    {
        label: "Admin",
        items: [
            { title: "Attributes",  url: "/attribute",           icon: "SlidersHorizontal", permission: "app.add_attribute" },
            { title: "Lead Fields", url: "/attribute-pipeline",  icon: "SlidersHorizontal", permission: "app.add_pipeline" },
            { title: "Webhooks",    url: "/webhook",             icon: "Webhook",           permission: "app.add_webhook", feature: "webhooks" },
            { title: "Audit Log",   url: "/audit-log",           icon: "ClipboardList",     permission: "auth.add_user",   feature: "audit_trail" },
            { title: "Users",       url: "/users",               icon: "Users",             permission: "auth.add_user" },
            { title: "Settings",    url: "/settings",            icon: "Settings2",         permission: "auth.add_user" },
            { title: "Lead Reassignment", url: "/lead-reassignment", icon: "ArrowLeftRight", superuserOnly: true },
        ],
    },
    {
        label: "Account",
        items: [
            { title: "My Info", url: "/my-info", icon: "UserCircle2" },
        ],
    },
];

export const useMenu = () => {
    const { user, isFeatureEnabled } = useAuth();

    const menu = useMemo(() => {
        const permissions = new Set(user?.permissions || []);
        const isSuperuser = user?.is_superuser === true;

        return MENU_CONFIG
            .map(group => ({
                ...group,
                items: group.items.filter(item => {
                    if (item.superuserOnly && !isSuperuser) return false;
                    if (item.permission && !isSuperuser && !permissions.has(item.permission)) return false;
                    if (item.feature && !isFeatureEnabled(item.feature)) return false;
                    return true;
                }),
            }))
            .filter(group => group.items.length > 0);
    }, [user, isFeatureEnabled]);

    return { menu };
};
