import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatPopover } from "@/components/chat/ChatPopover";
import { NotificationPopover } from "@/components/layout/NotificationPopover";
import { OrganizationSwitcher } from "@/components/layout/OrganizationSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { getFullName, getInitials } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
  const { profile, signOut, currentOrganization } = useAuth();
  const navigate = useNavigate();
  
  const isDemo = currentOrganization?.slug === 'demo' 
    || currentOrganization?.name?.toLowerCase().includes('demo')
    || currentOrganization?.name?.toLowerCase().includes('staging');
  
  const fullName = profile ? getFullName(profile.first_name, profile.last_name) : "User";
  const initials = profile ? getInitials(profile.first_name, profile.last_name) : "?";

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-5 border-b border-border/40 bg-background gap-3">
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden flex-shrink-0 h-8 w-8"
        onClick={onMobileMenuToggle}
      >
        <Menu className="w-[18px] h-[18px]" />
      </Button>

      {/* Organization Switcher */}
      <div className="flex items-center gap-2">
        <OrganizationSwitcher />
        {isDemo && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-semibold px-1.5 py-0">
            DEMO
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-8 h-9 bg-muted/40 border-0 text-sm placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="flex items-center gap-1">
        <ChatPopover />
        
        <NotificationPopover />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-7 w-7">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={fullName} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px]" onClick={() => navigate("/settings")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13px]" onClick={() => navigate("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px]" onClick={() => signOut()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
