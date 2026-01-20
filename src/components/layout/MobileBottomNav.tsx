import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Calendar,
  MoreHorizontal,
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
import {
  BookOpen,
  FolderOpen,
  ClipboardList,
  UserCircle,
  Settings,
} from "lucide-react";

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {primaryNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-primary/10")} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}

        {/* More button - opens sheet with secondary navigation */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors",
                isSecondaryRoute
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 pb-6">
              {secondaryNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setMoreSheetOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center leading-tight">
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
