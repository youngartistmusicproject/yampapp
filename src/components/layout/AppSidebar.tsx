import { useState, useEffect } from "react";
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
  Shield,
  Flag,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useBranding } from "@/contexts/BrandingContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Flat navigation list with optional feature flag keys
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

// Desktop Sidebar - Dark navy with expand/collapse functionality
function DesktopSidebar() {
  const location = useLocation();
  const { signOut, isOrgAdmin } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { isFeatureEnabled } = useFeatureFlags();
  const { appName, faviconUrl, logoUrl, primaryColor } = useBranding();

  // Expanded state with localStorage persistence
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Filter nav items based on feature flags
  const filteredNavItems = navItems.filter(item => {
    if (!item.featureKey) return true;
    return isFeatureEnabled(item.featureKey);
  });

  // Get the first letter for the logo fallback
  const logoLetter = appName.charAt(0).toUpperCase();

  const NavItem = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean }) => {
    const content = (
      <NavLink
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl transition-all duration-200",
          isExpanded ? "px-3 py-2.5 w-full" : "justify-center w-10 h-10",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {isExpanded && (
          <span className="text-sm font-medium truncate">{item.name}</span>
        )}
      </NavLink>
    );

    if (isExpanded) {
      return content;
    }

    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-screen bg-sidebar rounded-r-2xl transition-all duration-300 relative",
        isExpanded ? "w-[240px]" : "w-[72px]"
      )}
    >
      {/* Header with logo */}
      <div className={cn(
        "flex items-center h-16 pt-2",
        isExpanded ? "px-4 justify-start" : "justify-center"
      )}>
        {isExpanded ? (
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="h-10 w-auto max-w-[160px] object-contain"
              />
            ) : faviconUrl ? (
              <>
                <img
                  src={faviconUrl}
                  alt={appName}
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
                <span className="text-sidebar-accent-foreground font-semibold text-[15px] truncate">
                  {appName}
                </span>
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white font-semibold text-sm">{logoLetter}</span>
                </div>
                <span className="text-sidebar-accent-foreground font-semibold text-[15px] truncate">
                  {appName}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt={appName}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white font-semibold text-sm">{logoLetter}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section Label - only when expanded */}
      {isExpanded && (
        <div className="px-4 pt-4 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "flex-1 flex flex-col gap-1 py-4",
        isExpanded ? "px-3" : "items-center px-3"
      )}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return <NavItem key={item.name} item={item} isActive={isActive} />;
        })}
      </nav>

      {/* Bottom section */}
      <div className={cn(
        "flex flex-col gap-1 py-4 border-t border-sidebar-border",
        isExpanded ? "px-3" : "items-center px-3"
      )}>
        {(isSuperAdmin || isOrgAdmin) && (
          <NavItem
            item={{ name: "Admin", href: "/admin", icon: Shield }}
            isActive={location.pathname === "/admin"}
          />
        )}

        {isSuperAdmin && (
          <NavItem
            item={{ name: "Feature Flags", href: "/feature-flags", icon: Flag }}
            isActive={location.pathname === "/feature-flags"}
          />
        )}

        <NavItem
          item={{ name: "Settings", href: "/settings", icon: Settings }}
          isActive={location.pathname === "/settings"}
        />

        {isExpanded ? (
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut()}
                className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              Sign Out
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Expand/Collapse Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-20 flex items-center justify-center w-6 h-6 rounded-full bg-sidebar border-2 border-background text-sidebar-foreground hover:bg-sidebar-accent transition-colors shadow-md"
      >
        {isExpanded ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}

// Mobile Sheet Navigation
function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const location = useLocation();
  const { signOut, isOrgAdmin } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { isFeatureEnabled } = useFeatureFlags();
  const { appName, logoUrl, primaryColor } = useBranding();

  // Filter nav items based on feature flags
  const filteredNavItems = navItems.filter(item => {
    if (!item.featureKey) return true;
    return isFeatureEnabled(item.featureKey);
  });

  // Get the first letter for the logo fallback
  const logoLetter = appName.charAt(0).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="h-10 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white font-semibold text-sm">{logoLetter}</span>
                </div>
                <span className="font-semibold text-sidebar-accent-foreground text-[15px]">{appName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 pt-4 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto">
          <div className="space-y-0.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
        <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
          {(isSuperAdmin || isOrgAdmin) && (
            <NavLink
              to="/admin"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                location.pathname === "/admin"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              <span>Admin</span>
            </NavLink>
          )}

          {isSuperAdmin && (
            <NavLink
              to="/feature-flags"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                location.pathname === "/feature-flags"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Flag className="w-5 h-5 flex-shrink-0" />
              <span>Feature Flags</span>
            </NavLink>
          )}

          <NavLink
            to="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
              location.pathname === "/settings"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <DesktopSidebar />
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
