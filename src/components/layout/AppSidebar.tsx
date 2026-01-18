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
  ChevronDown,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Navigation grouped into sections (Notion-style)
const sections = [
  {
    label: "MAIN",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Work Management", href: "/projects", icon: FolderKanban },
      { name: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
      { name: "Content Hub", href: "/content", icon: FolderOpen },
      { name: "Community", href: "/community", icon: Users },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { name: "Requests", href: "/requests", icon: ClipboardList },
      { name: "CRM", href: "/crm", icon: UserCircle },
    ],
  },
];

// Flatten for mobile/collapsed views
const allNavItems = sections.flatMap((s) => s.items);

// Desktop Sidebar - Notion minimalist style
function DesktopSidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const [isHovered, setIsHovered] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    MAIN: true,
    RESOURCES: true,
    TOOLS: true,
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItem = ({ item, isActive }: { item: typeof allNavItems[0]; isActive: boolean }) => {
    const content = (
      <NavLink
        to={item.href}
        className={cn(
          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
          isActive
            ? "bg-muted/50 text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        )}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "hidden md:flex flex-col h-screen bg-background border-r border-border/30 transition-all duration-200",
        collapsed ? "w-[48px]" : "w-[240px]"
      )}
    >
      {/* Workspace Switcher */}
      <div className="flex items-center justify-between h-12 px-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0 px-1 py-1 rounded-md hover:bg-muted/40 cursor-pointer transition-colors">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-primary flex-shrink-0">
            <span className="text-primary-foreground font-semibold text-xs">W</span>
          </div>
          {!collapsed && (
            <>
              <span className="font-medium text-foreground text-[13px] truncate">WorkOS</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
            </>
          )}
        </div>
        
        {/* Collapse toggle - hover reveal */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-6 w-6 text-muted-foreground hover:text-foreground transition-opacity flex-shrink-0",
            !collapsed && (isHovered ? "opacity-100" : "opacity-0")
          )}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {collapsed ? (
          // Collapsed: just show icons
          <div className="space-y-0.5">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return <NavItem key={item.name} item={item} isActive={isActive} />;
            })}
          </div>
        ) : (
          // Expanded: show sections with collapsible groups
          <div className="space-y-4">
            {sections.map((section) => (
              <Collapsible
                key={section.label}
                open={openSections[section.label]}
                onOpenChange={() => toggleSection(section.label)}
              >
                <CollapsibleTrigger className="group flex items-center w-full px-2.5 py-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-all",
                      !openSections[section.label] && "-rotate-90"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return <NavItem key={item.name} item={item} isActive={isActive} />;
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-2 border-t border-border/30 space-y-0.5">
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
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}

// Mobile Sheet Navigation - Notion style
function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    MAIN: true,
    RESOURCES: true,
    TOOLS: true,
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 bg-background">
        {/* Workspace Switcher */}
        <div className="flex items-center h-12 px-3 border-b border-border/30">
          <div className="flex items-center gap-2 flex-1 px-1 py-1 rounded-md hover:bg-muted/40 cursor-pointer transition-colors">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary">
              <span className="text-primary-foreground font-semibold text-xs">W</span>
            </div>
            <span className="font-medium text-foreground text-[13px]">WorkOS</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="space-y-4">
            {sections.map((section) => (
              <Collapsible
                key={section.label}
                open={openSections[section.label]}
                onOpenChange={() => toggleSection(section.label)}
              >
                <CollapsibleTrigger className="group flex items-center w-full px-2.5 py-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 ml-auto text-muted-foreground transition-transform",
                      !openSections[section.label] && "-rotate-90"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                          isActive
                            ? "bg-muted/50 text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-2 py-3 border-t border-border/30 space-y-0.5">
          {isSuperAdmin && (
            <NavLink
              to="/users"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
                location.pathname === "/users"
                  ? "bg-muted/50 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>User Management</span>
            </NavLink>
          )}

          <NavLink
            to="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
              location.pathname === "/settings"
                ? "bg-muted/50 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>

          <button
            onClick={() => {
              signOut();
              onOpenChange(false);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
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
