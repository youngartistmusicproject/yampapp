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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Work Management", href: "/projects", icon: FolderKanban },
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "Content Hub", href: "/content", icon: FolderOpen },
  { name: "Community", href: "/community", icon: Users },
  { name: "Requests", href: "/requests", icon: ClipboardList },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "CRM", href: "/crm", icon: UserCircle },
];

// Desktop Sidebar - Todoist minimalist style with Monday.com flair
function DesktopSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { isSuperAdmin } = useUserRole();

  const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
    const content = (
      <NavLink
        to={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
          isActive
            ? "bg-primary/8 text-primary border-l-2 border-primary ml-0 pl-[10px]"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
        )}
      >
        <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
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
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo + Collapse Toggle */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <span className="text-primary-foreground font-bold text-sm">W</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground text-[15px]">WorkOS</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-7 w-7 text-muted-foreground hover:text-foreground",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-border/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return <NavItem key={item.name} item={item} isActive={isActive} />;
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-border/30 space-y-1">
        {/* User Preview (expanded only) */}
        {!collapsed && profile && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <NavItem
            item={{ name: "User Management", href: "/users", icon: Shield }}
            isActive={location.pathname === "/users"}
          />
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
              >
                <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}

// Mobile Sheet Navigation
function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { isSuperAdmin } = useUserRole();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 bg-background">
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-foreground text-[15px]">WorkOS</span>
          </div>
        </div>

        {/* User Preview */}
        {profile && (
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/30">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/8 text-primary border-l-2 border-primary ml-0 pl-[10px]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive && "text-primary")} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-2 py-3 border-t border-border/30 space-y-1">
          {isSuperAdmin && (
            <NavLink
              to="/users"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                location.pathname === "/users"
                  ? "bg-primary/8 text-primary border-l-2 border-primary ml-0 pl-[10px]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
              )}
            >
              <Shield className="w-[18px] h-[18px] flex-shrink-0" />
              <span>User Management</span>
            </NavLink>
          )}

          <NavLink
            to="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
              location.pathname === "/settings"
                ? "bg-primary/8 text-primary border-l-2 border-primary ml-0 pl-[10px]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
            )}
          >
            <Settings className="w-[18px] h-[18px] flex-shrink-0" />
            <span>Settings</span>
          </NavLink>

          <button
            onClick={() => {
              signOut();
              onOpenChange(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-2 border-transparent"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
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
