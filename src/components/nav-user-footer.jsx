import { Sun, Moon, Monitor, ChevronsUpDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { UseTheme } from "./UseTheme";

export function NavUserFooter({ user }) {
  const { isMobile, open } = useSidebar();
  const isCollapsed = !open && !isMobile;

  const [darkMode, setDarkMode] = UseTheme();

  const themeOptions = {
    system: { label: "System", icon: <Monitor className="size-4" /> },
    light: { label: "Light", icon: <Sun className="size-4" /> },
    dark: { label: "Dark", icon: <Moon className="size-4" /> },
  };

  const currentTheme = themeOptions[darkMode] || themeOptions.system;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isCollapsed ? (
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg mx-auto transition-colors cursor-pointer"
                style={{ color: "var(--muted-foreground)", backgroundColor: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--secondary) 15%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                title={currentTheme.label}
              >
                {currentTheme.icon}
              </button>
            ) : (
              <SidebarMenuButton
                size="sm"
                className="cursor-pointer rounded-lg transition-colors"
                style={{ color: "var(--muted-foreground)", backgroundColor: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--secondary) 15%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                {currentTheme.icon}
                <span className="ml-1.5 text-sm" style={{ color: "var(--muted-foreground)", fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                  {currentTheme.label}
                </span>
                <ChevronsUpDown className="ml-auto size-3.5" style={{ color: "var(--muted-foreground)" }} />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-40 rounded-lg"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {Object.entries(themeOptions).map(([key, { label, icon }]) => (
              <DropdownMenuItem
                key={key}
                onSelect={() => setDarkMode(key)}
                className="cursor-pointer flex items-center gap-2"
                style={{
                  color: darkMode === key ? "var(--secondary-text)" : "var(--foreground)",
                  backgroundColor: darkMode === key ? "color-mix(in srgb, var(--secondary) 8%, transparent)" : "transparent",
                  fontFamily: '"Source Sans 3", Arial, sans-serif',
                }}
              >
                <span style={{ color: darkMode === key ? "var(--secondary-text)" : "var(--muted-foreground)" }}>{icon}</span>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
