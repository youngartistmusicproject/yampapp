import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Calendar,
  MoreHorizontal,
  BookOpen,
  FolderOpen,
  ClipboardList,
  UserCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

// Primary navigation items for bottom tabs (most used)
const primaryNavItems = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Work", href: "/projects", icon: FolderKanban },
  { name: "Community", href: "/community", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

// Secondary navigation items (accessible via "More" sheet)
const secondaryNavItems = [
  { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { name: "Content Hub", href: "/content", icon: FolderOpen },
  { name: "Requests", href: "/requests", icon: ClipboardList },
  { name: "CRM", href: "/crm", icon: UserCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Check if current route is in secondary nav
  const isSecondaryRoute = secondaryNavItems.some(
    (item) => location.pathname === item.href
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.05)] safe-area-pb">
      <div className="flex items-center justify-around h-[68px]">
        {primaryNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-all active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-primary/10")} />
              <span className="font-medium text-[11px]">{item.name}</span>
            </NavLink>
          );
        })}

        {/* More button - opens sheet with secondary navigation */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-all active:scale-95",
                isSecondaryRoute
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="font-medium text-[11px]">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl px-6 pb-8">
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-2 pb-4">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
            <SheetHeader className="pb-5">
              <SheetTitle className="text-lg font-semibold text-left">More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3">
              {secondaryNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setMoreSheetOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all active:scale-95 min-h-[88px]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-7 h-7" />
                    <span className="text-[11px] font-medium text-center leading-tight">
                      {item.name}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
