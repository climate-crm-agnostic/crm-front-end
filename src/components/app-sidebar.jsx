"use client"

import { React, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import * as Icons from "lucide-react"
import { LayoutDashboard, Bot, ChevronRight } from "lucide-react"

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
  const { user, isFeatureEnabled } = useAuth();
  const { open, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const isDashboardActive = location.pathname === "/";
  const isChettActive = location.pathname.startsWith("/chett-ai");
  const canSeeChett = isFeatureEnabled("ai") &&
    (user?.is_superuser === true || (user?.permissions || []).includes("app.view_aiconversation"));

  // Which hubs are expanded — seeded once from whichever hub contains the
  // page you loaded on, then driven entirely by clicks from there.
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set();
    menu.forEach((group) => {
      const hasActive = group.items.some(
        (item) => location.pathname === item.url || location.pathname.startsWith(item.url + "/")
      );
      if (hasActive) initial.add(group.label);
    });
    return initial;
  });

  // Single click handler for every hub icon, in every sidebar state:
  // - Collapsed (icon rail): expand the sidebar AND force this hub open.
  //   From the rail, no hub's contents are visible anyway, so "click Sales"
  //   only ever needs to mean one thing — reveal Sales — never a toggle.
  // - Expanded: just toggle this one hub, nothing else moves.
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

      {/* Brand mark — expanded */}
      <SidebarHeader className="pb-0 bg-card">
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 group-data-[collapsible=icon]:hidden border-b border-border"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#5E6A43" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold tracking-tight text-foreground" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
              Climate by CodeX
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest mt-0.5 text-muted-foreground">
              CRM Platform
            </p>
          </div>
        </div>

        {/* Icon-only logo */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center py-2.5 border-b border-border">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#5E6A43" }}
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
                  style={isDashboardActive ? {
                    backgroundColor: "var(--sidebar-accent)",
                  } : {}}
                >
                  <Link to="/" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    <LayoutDashboard className="size-5" style={{ color: isDashboardActive ? "#5E6A43" : undefined }} />
                    <span className="font-medium text-foreground">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {canSeeChett && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Chett AI"
                    isActive={isChettActive}
                    style={isChettActive ? {
                      backgroundColor: "var(--sidebar-accent)",
                    } : {}}
                  >
                    <Link to="/chett-ai" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                      <Bot className="size-5" style={{ color: isChettActive ? "#5E6A43" : undefined }} />
                      <span className="font-medium text-foreground">Chett AI</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {menu.map((group) => {
          const GroupIcon = Icons[group.icon] ?? Icons.Circle;
          const isGroupOpen = openGroups.has(group.label);

          return (
            <Collapsible key={group.label} open={isGroupOpen} className="group/hub">
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={group.label}
                      onClick={() => toggleGroup(group.label)}
                      style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                    >
                      <GroupIcon className="size-4" style={{ color: "#5E6A43" }} />
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                        {group.label}
                      </span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/hub:rotate-90 group-data-[collapsible=icon]:hidden" />
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
