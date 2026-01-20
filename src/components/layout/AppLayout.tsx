import { ReactNode, useState } from "react";
import { AppSidebar, MobileSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <AppSidebar />
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Header - simplified on mobile */}
        <AppHeader onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        
        {/* Main content - add bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - only visible on mobile */}
      <MobileBottomNav />
    </div>
  );
}
