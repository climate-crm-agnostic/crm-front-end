"use client"

import { React } from "react"
import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useMenu } from "@/hooks/useMenu"
import { NavUserFooter } from "./nav-user-footer"
import { useAuth } from "@/context/AuthContext"

export function AppSidebar({ ...props }) {

  const { menu } = useMenu();
  const { user } = useAuth();
  const location = useLocation();
  const isDashboardActive = location.pathname === "/";

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
                    borderLeft: "3px solid #5E6A43",
                    borderRadius: "0 4px 4px 0",
                  } : {}}
                >
                  <Link to="/" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                    <LayoutDashboard className="size-5" style={{ color: isDashboardActive ? "#5E6A43" : undefined }} />
                    <span className="font-medium text-foreground">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {menu.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel
              className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground"
              style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
            >
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMain items={group.items} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <div className="h-px bg-border" />
      <SidebarFooter className="bg-card">
        <NavUserFooter user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
