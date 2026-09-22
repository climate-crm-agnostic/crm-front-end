import * as Icons from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useChatNotifications } from "@/context/ChatNotificationContext";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useLocation } from "react-router-dom";

const OLIVE = "var(--secondary)";
// Inset shadow instead of border-left so the active item keeps the same
// icon position as the rest; the bar is dropped in the collapsed rail.
const ACTIVE_CLASS = "shadow-[inset_3px_0_0_var(--secondary-text)] rounded-l-none group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:rounded-md";

export function NavMain({ items }) {
  const location = useLocation();
  const { totalUnread } = useChatNotifications();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = Icons[item.icon] ?? Icons.Circle;
        const hasSubItems = item.items && item.items.length > 0;

        if (!hasSubItems) {
          const isActive = location.pathname === item.url ||
            location.pathname.startsWith(item.url + "/");

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={isActive ? ACTIVE_CLASS : undefined}
                style={isActive ? { backgroundColor: "var(--sidebar-accent)" } : {}}
              >
                <a
                  href={item.url || "#"}
                  style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                >
                  {item.icon && (
                    <Icon
                      className="size-4"
                      style={{ color: isActive ? "var(--secondary-text)" : undefined }}
                    />
                  )}
                  <span className="font-medium text-foreground">{item.title}</span>
                  {item.url === '/chat' && totalUnread > 0 && (
                    <span style={{
                      marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                      background: '#e53e3e', color: '#fff', fontSize: 10, fontWeight: 700,
                      flexShrink: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: '0 4px',
                    }}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        return (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}
                >
                  {item.icon && (
                    <div className="flex items-center">
                      <div
                        className="p-1 rounded group-data-[collapsible=icon]:hidden"
                        style={{ backgroundColor: "rgba(37,91,1,0.12)" }}
                      >
                        <Icon className="size-4" style={{ color: "var(--secondary-text)" }} />
                      </div>
                      <Icon
                        className="size-4 hidden group-data-[collapsible=icon]:block"
                        style={{ color: "var(--secondary-text)" }}
                      />
                    </div>
                  )}
                  <span className="line-clamp-1 font-medium text-foreground">
                    {item.title}
                  </span>
                  <ChevronRight
                    className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground group-data-[collapsible=icon]:hidden"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => {
                    const isActive = location.pathname === subItem.url;
                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <a
                            href={subItem.url}
                            className="flex items-center px-3 py-2 rounded transition-all"
                            style={{
                              color: isActive ? "var(--secondary-text)" : undefined,
                              backgroundColor: isActive ? "var(--sidebar-accent)" : "transparent",
                              fontFamily: '"Source Sans 3", Arial, sans-serif',
                              fontWeight: isActive ? 600 : 400,
                              borderLeft: isActive ? `2px solid var(--secondary-text)` : "2px solid transparent",
                            }}
                          >
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        );
      })}
    </SidebarMenu>
  );
}
