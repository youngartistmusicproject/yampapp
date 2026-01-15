import { Building2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, OrganizationMembership } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization } = useAuth();

  if (!organizations || organizations.length <= 1) {
    // Don't show switcher if user only belongs to one org
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 px-2 text-[13px] font-normal"
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[120px] truncate">
            {currentOrganization?.name || "Select Organization"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Switch Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((membership: OrganizationMembership) => (
          <DropdownMenuItem
            key={membership.organization_id}
            onClick={() => switchOrganization(membership.organization_id)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              currentOrganization?.id === membership.organization_id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px]">{membership.organization.name}</span>
            </div>
            {currentOrganization?.id === membership.organization_id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
