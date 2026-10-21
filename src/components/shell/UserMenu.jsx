import { Link } from "react-router-dom";
import { LogOut, Monitor, Moon, Sparkles, Sun, Webhook } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { UseTheme } from "@/components/UseTheme";

const THEMES = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "system", label: "System", icon: Monitor },
];

const initials = (name = "") => name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";

/** Avatar chip with profile, theme and logout. Also the single place that applies the saved theme. */
export function UserMenu() {
    const { user, logout } = useAuth();
    const [theme, setTheme] = UseTheme();
    const name = user?.username || "";
    const role = user?.groups?.[0] || "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-10 items-center gap-2.5 rounded-full bg-background pl-1 pr-1 outline-none 2xl:pr-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring cursor-pointer" aria-label="Account menu">
                    <span className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--secondary-text)" }}>
                        {initials(name)}
                    </span>
                    <span className="hidden text-left leading-tight 2xl:block">
                        <span className="block max-w-[110px] truncate text-[13px] font-semibold">{name}</span>
                        <span className="block max-w-[110px] truncate text-xs text-muted-foreground">{role}</span>
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                    <span className="block truncate font-semibold">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user?.email || role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {THEMES.map((option) => {
                    const Icon = option.icon;
                    return (
                        <DropdownMenuItem key={option.key} onSelect={(event) => { event.preventDefault(); setTheme(option.key); }} className="cursor-pointer gap-2">
                            <Icon className="size-4" />
                            <span className="flex-1">{option.label}</span>
                            {theme === option.key && <span className="size-2 rounded-full bg-primary" aria-label="Selected" />}
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2"><Link to="/faq"><Sparkles className="size-4" />FAQ</Link></DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2"><Link to="/apidocs"><Webhook className="size-4" />API Docs</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout()} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                    <LogOut className="size-4" />Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
