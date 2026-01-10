import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  FolderOpen,
  MessageCircle,
  Users,
  ClipboardList,
  Calendar,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Work Management", href: "/projects", icon: FolderKanban },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "Content Hub", href: "/content", icon: FolderOpen },
  { name: "Chat", href: "/chat", icon: MessageCircle },
  { name: "Community", href: "/community", icon: Users },
  { name: "Requests", href: "/requests", icon: ClipboardList },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "CRM", href: "/crm", icon: UserCircle },
];

// Desktop Sidebar - Bold Monochrome Style
function DesktopSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-background border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-foreground text-background font-bold text-sm">
            W
          </div>
          {!collapsed && (
            <span className="font-bold text-foreground tracking-tight">WorkOS</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
            location.pathname === "/settings"
              ? "bg-foreground text-background font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-muted-foreground hover:text-foreground h-8"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

// Mobile Sheet Navigation
function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0 bg-background border-r border-border">
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-foreground text-background font-bold text-sm">
              W
            </div>
            <span className="font-bold text-foreground tracking-tight">WorkOS</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-2 py-3 border-t border-border space-y-0.5">
          <NavLink
            to="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
              location.pathname === "/settings"
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Mobile trigger button
export function MobileMenuTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={onClick}
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}

// Export for header to use
export { MobileSidebar };
export const useMobileSidebar = () => {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
};