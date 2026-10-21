import { useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useMenu } from "@/hooks/useMenu";

// Dashboard sits above the hubs and has no pages of its own.
export const DASHBOARD_HUB = { label: "Dashboard", icon: "LayoutDashboard", url: "/", items: [] };

const matches = (pathname, url) => (url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`));

export const iconFor = (name) => Icons[name] ?? Icons.Circle;

/**
 * One hierarchy for the whole shell: the icon rail picks a hub, the top bar
 * lists that hub's pages. Hubs and pages come from useMenu, so permissions and
 * feature flags hide exactly what they hid in the old sidebar.
 */
export function useShellNav() {
    const { menu } = useMenu();
    const { pathname } = useLocation();

    const hubs = [DASHBOARD_HUB, ...menu];
    const activeHub = pathname === "/"
        ? DASHBOARD_HUB
        : menu.find((group) => group.items.some((item) => matches(pathname, item.url))) || null;
    const activeItem = activeHub
        ? activeHub.items
            .filter((item) => matches(pathname, item.url))
            .sort((a, b) => b.url.length - a.url.length)[0] || null
        : null;

    // Clicking a hub opens its first page (the dashboard opens "/").
    const hubUrl = (hub) => hub.url ?? hub.items[0]?.url ?? "/";

    return { hubs, activeHub, activeItem, hubUrl, pathname };
}
