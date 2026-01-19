import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  FolderOpen,
  Users,
  ClipboardList,
  Calendar,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Shield,
  Flag,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Flat navigation list (Todoist style) with optional feature flag keys
const navItems: Array<{
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey?: string;
}> = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, featureKey: "dashboard" },
  { name: "Work Management", href: "/projects", icon: FolderKanban, featureKey: "work_management" },
  { name: "Calendar", href: "/calendar", icon: Calendar, featureKey: "calendar" },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen, featureKey: "knowledge_base" },
  { name: "Content Hub", href: "/content", icon: FolderOpen, featureKey: "content_hub" },
  { name: "Community", href: "/community", icon: Users, featureKey: "community" },
  { name: "Requests", href: "/requests", icon: ClipboardList, featureKey: "requests" },
  { name: "CRM", href: "/crm", icon: UserCircle, featureKey: "crm" },
];

// Desktop Sidebar - Todoist minimalist style
function DesktopSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { isFeatureEnabled } = useFeatureFlags();

  // Filter nav items based on feature flags
  const filteredNavItems = navItems.filter(item => {
    if (!item.featureKey) return true;
    return isFeatureEnabled(item.featureKey);
  });

  const NavItem = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean }) => {
    const content = (
      <NavLink
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-background border-r border-border/40 transition-all duration-200",
        collapsed ? "w-[56px]" : "w-[240px]"
      )}
    >
      {/* Header with logo and collapse toggle */}
      <div className={cn(
        "flex items-center h-14 border-b border-border/40",
        collapsed ? "justify-center px-1.5" : "justify-between px-3"
      )}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
                  <span className="text-primary-foreground font-semibold text-sm">W</span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary flex-shrink-0">
                <span className="text-primary-foreground font-semibold text-sm">W</span>
              </div>
              <span className="font-semibold text-foreground text-[15px] truncate">WorkOS</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return <NavItem key={item.name} item={item} isActive={isActive} />;
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-border/40 space-y-0.5">
        {isSuperAdmin && (
          <>
            <NavItem
              item={{ name: "User Management", href: "/users", icon: Shield }}
              isActive={location.pathname === "/users"}
            />
            <NavItem
              item={{ name: "Feature Flags", href: "/feature-flags", icon: Flag }}
              isActive={location.pathname === "/feature-flags"}
            />
          </>
        )}

        <NavItem
          item={{ name: "Settings", href: "/settings", icon: Settings }}
          isActive={location.pathname === "/settings"}
        />

        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}

// Mobile Sheet Navigation - Todoist style
function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { isFeatureEnabled } = useFeatureFlags();

  // Filter nav items based on feature flags
  const filteredNavItems = navItems.filter(item => {
    if (!item.featureKey) return true;
    return isFeatureEnabled(item.featureKey);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 bg-background">
        {/* Header */}
        <div className="flex items-center h-14 px-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
              <span className="text-primary-foreground font-semibold text-sm">W</span>
            </div>
            <span className="font-semibold text-foreground text-[15px]">WorkOS</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="space-y-0.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-2 py-3 border-t border-border/40 space-y-0.5">
          {isSuperAdmin && (
            <>
              <NavLink
                to="/users"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  location.pathname === "/users"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span>User Management</span>
              </NavLink>
              <NavLink
                to="/feature-flags"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  location.pathname === "/feature-flags"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Flag className="w-5 h-5 flex-shrink-0" />
                <span>Feature Flags</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              location.pathname === "/settings"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>

          <button
            onClick={() => {
              signOut();
              onOpenChange(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
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
