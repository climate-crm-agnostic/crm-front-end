"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import * as Icons from "lucide-react"
import { LayoutDashboard, ChevronRight } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useMenu } from "@/hooks/useMenu"
import { NavUserFooter } from "./nav-user-footer"
import { useAuth } from "@/context/AuthContext"

export function AppSidebar({ ...props }) {

  const { menu } = useMenu();
  const { user } = useAuth();
  const location = useLocation();
  const isDashboardActive = location.pathname === "/";
  const { open, setOpen, isMobile } = useSidebar();

  const groupHasActive = (group) => group.items.some(
    (item) => location.pathname === item.url || location.pathname.startsWith(item.url + "/")
  );

  // Which hubs are expanded — seeded once from whichever hub contains the
  // page you loaded on, then driven entirely by clicks from there.
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set();
    menu.forEach((group) => {
      if (groupHasActive(group)) initial.add(group.label);
    });
    return initial;
  });

  // From the collapsed rail no hub's contents are visible, so a hub click
  // always means "reveal this hub": expand the sidebar and force it open.
  // When expanded, it just toggles that one hub.
  const toggleGroup = (label) => {
    if (!open && !isMobile) {
      setOpen(true);
      setOpenGroups((prev) => new Set(prev).add(label));
      return;
    }
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const data = {
    user: {
      name: user?.username,
      profile_name: user?.username || '',
      rol: user?.groups?.[0] || '',
      avatar: '',
      id_rol: user?.groups?.[0] || '',
      email: user?.email
    }
  }


  return (
    <Sidebar collapsible="icon" {...props}>

      {/* Brand mark — expanded. climate.svg is a full wordmark (carries the
          "Climate" name itself), so the separate text labels this used to
          sit next to are gone — the image replaces both the icon and them. */}
      <SidebarHeader className="pb-0 bg-card">
        <div
          className="flex items-center px-3 py-2.5 group-data-[collapsible=icon]:hidden border-b border-border"
        >
          <img src="/climate.svg" alt="Climate by CodeX" className="h-10 w-auto" />
        </div>

        {/* Icon-only logo — kept as the old geometric mark rather than the
            wordmark, which doesn't read at 8x8. */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center py-2.5 border-b border-border">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        <div className="px-2 pb-1 pt-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <NavUser user={data.user} />
        </div>
      </SidebarHeader>

      <div className="h-px bg-border" />

      <SidebarContent className="bg-card">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Dashboard"
                  isActive={isDashboardActive}
                  className={isDashboardActive ? "shadow-[inset_3px_0_0_var(--secondary-text)] rounded-l-none group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:rounded-md" : undefined}
                  style={isDashboardActive ? { backgroundColor: "var(--sidebar-accent)" } : {}}
                >
                  <Link to="/" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    <LayoutDashboard className="size-4" style={{ color: isDashboardActive ? "var(--secondary-text)" : undefined }} />
                    <span className="font-medium text-foreground">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {menu.map((group) => {
          const GroupIcon = Icons[group.icon] ?? Icons.Circle;
          const isGroupOpen = openGroups.has(group.label);
          const hasActive = groupHasActive(group);

          return (
            <Collapsible key={group.label} open={isGroupOpen} className="group/hub">
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={group.label}
                      onClick={() => toggleGroup(group.label)}
                      // In the rail the hub icon is the only trace of where you are.
                      className={hasActive ? "group-data-[collapsible=icon]:bg-sidebar-accent" : undefined}
                      style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                      <GroupIcon className="size-4" style={{ color: "var(--secondary-text)" }} />
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                        {group.label}
                      </span>
                      <ChevronRight className="ml-auto size-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/hub:rotate-90 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <NavMain items={group.items} />
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <div className="h-px bg-border" />
      <SidebarFooter className="bg-card">
        <NavUserFooter user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
