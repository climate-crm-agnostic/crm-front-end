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
            { title: "Inventory",  url: "/inventory", icon: "Warehouse",  permission: "app.add_inventory" },
        ],
    },
    {
        label: "Assets",
        items: [
            { title: "Assets",            url: "/asset",           icon: "Laptop",        permission: "app.add_asset" },
            { title: "Asset Assignments", url: "/assetassignment", icon: "ClipboardList", permission: "app.add_assetassignment" },
        ],
    },
    {
        label: "AI",
        items: [
            { title: "Chett AI", url: "/chett-ai", icon: "Bot", permission: "app.view_aiconversation" },
        ],
    },
    {
        label: "Admin",
        items: [
            { title: "Attributes", url: "/attribute",           icon: "SlidersHorizontal", permission: "app.add_attribute" },
            { title: "Lead Fields", url: "/attribute-pipeline", icon: "SlidersHorizontal", permission: "app.add_pipeline" },
            { title: "Webhooks",   url: "/webhook",             icon: "Webhook",           permission: "app.add_webhook" },
            { title: "Users",      url: "/users",               icon: "Users",             permission: "auth.add_user" },
            { title: "Settings",   url: "/settings",            icon: "Settings2",         permission: "auth.add_user" },
        ],
    },
];

export const useMenu = () => {
    const { user } = useAuth();

    const menu = useMemo(() => {
        const permissions = new Set(user?.permissions || []);
        const isSuperuser = user?.is_superuser === true;

        return MENU_CONFIG
            .map(group => ({
                ...group,
                items: group.items.filter(item =>
                    isSuperuser || permissions.has(item.permission)
                ),
            }))
            .filter(group => group.items.length > 0);
    }, [user]);

    return { menu };
};
