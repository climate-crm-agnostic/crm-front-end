import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Plus, Search } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useChatNotifications } from "@/context/ChatNotificationContext";
import { UserMenu } from "./UserMenu";
import { useShellNav } from "./useShellNav";

const VISIBLE_TABS = 6;

// Quick-create entries, filtered by the same permissions as the menu.
const NEW_ITEMS = [
    { label: "Lead", url: "/lead/new", permission: "app.add_lead" },
    { label: "Client", url: "/client/new", permission: "app.add_client" },
    { label: "Contact", url: "/contact/new", permission: "app.add_contact" },
    { label: "Invoice", url: "/invoice/new", permission: "app.add_invoice" },
    { label: "Catalogue item", url: "/catalogue/new", permission: "app.add_catalogueitem" },
];

const routeLabels = {
    "/apidocs": "API Docs", "/faq": "FAQ", "/plan-expired": "Plan",
};

const tabClass = (active) =>
    `inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "bg-[var(--nav-active)] text-[var(--nav-active-fg)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

export function TopNav({ onOpenSearch }) {
    const { activeHub, activeItem, pathname } = useShellNav();
    const { user } = useAuth();
    const { totalUnread = 0 } = useChatNotifications() || {};
    const navigate = useNavigate();

    const items = activeHub?.items ?? [];
    const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

    // The page you are on must never hide inside "More".
    const visible = items.slice(0, VISIBLE_TABS);
    if (activeIndex >= VISIBLE_TABS) visible[VISIBLE_TABS - 1] = activeItem;
    const overflow = items.filter((item) => !visible.includes(item));

    const permissions = new Set(user?.permissions || []);
    const newItems = NEW_ITEMS.filter((item) => user?.is_superuser || permissions.has(item.permission));

    const title = activeHub?.label ?? routeLabels["/" + pathname.split("/")[1]] ?? "";

    return (
        <header className="sticky top-4 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[28px] border bg-card py-2 pl-5 pr-2.5 shadow-sm md:rounded-full">
            <span className="font-heading text-base font-bold">{title}</span>

            {items.length > 1 && (
                <nav aria-label={`${title} pages`} className="order-last flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:overflow-visible">
                    {visible.map((item) => (
                        <Link key={item.url} to={item.url} aria-current={item === activeItem ? "page" : undefined} className={tabClass(item === activeItem)}>
                            {item.title}
                        </Link>
                    ))}
                    {overflow.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button type="button" className={`${tabClass(false)} cursor-pointer gap-1`}>
                                    More <span className="text-xs font-medium opacity-70">{overflow.length}</span><ChevronDown className="size-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" sideOffset={8} className="min-w-52">
                                {overflow.map((item) => (
                                    <DropdownMenuItem key={item.url} onSelect={() => navigate(item.url)} className="cursor-pointer">
                                        {item.title}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </nav>
            )}

            <div className="flex-1" />

            <button
                type="button" onClick={onOpenSearch} aria-label="Search pages (Command K)"
                className="hidden h-10 min-w-[220px] cursor-pointer items-center gap-2 rounded-full bg-background px-4 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring 2xl:flex"
            >
                <Search className="size-4" />
                <span className="flex-1 text-left">Search</span>
                <kbd className="rounded-md border bg-card px-1.5 text-xs">⌘K</kbd>
            </button>
            <button type="button" onClick={onOpenSearch} aria-label="Search pages" className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-background outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring 2xl:hidden">
                <Search className="size-[18px]" />
            </button>

            <Link to="/chat" aria-label={totalUnread ? `Messages, ${totalUnread} unread` : "Messages"} className="relative grid h-10 w-10 place-items-center rounded-full bg-background outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <Bell className="size-[18px]" />
                {totalUnread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
                        {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                )}
            </Link>

            {newItems.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring">
                            <Plus className="size-4" />New
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="min-w-44">
                        {newItems.map((item) => (
                            <DropdownMenuItem key={item.url} onSelect={() => navigate(item.url)} className="cursor-pointer">{item.label}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            <UserMenu />
        </header>
    );
}
