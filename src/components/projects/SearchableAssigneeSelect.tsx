import { useState } from "react";
import { Check, Plus, Crown } from "lucide-react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

interface SearchableAssigneeSelectProps {
  members: User[];
  selectedAssignees: User[];
  onAssigneesChange: (assignees: User[]) => void;
  placeholder?: string;
  disabled?: boolean;
  projectLeads?: User[];
}

export function SearchableAssigneeSelect({
  members,
  selectedAssignees,
  onAssigneesChange,
  placeholder = "Add...",
  disabled = false,
  projectLeads = [],
}: SearchableAssigneeSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleAssignee = (member: User) => {
    if (selectedAssignees.find((m) => m.id === member.id)) {
      onAssigneesChange(selectedAssignees.filter((m) => m.id !== member.id));
    } else {
      onAssigneesChange([...selectedAssignees, member]);
    }
  };

  const isProjectLead = (userId: string) => 
    projectLeads.some((lead) => lead.id === userId);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-1 hover:bg-muted/50 rounded px-2 py-1 -mr-2 transition-colors",
            disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
          )}
          disabled={disabled}
        >
          {selectedAssignees.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {selectedAssignees.slice(0, 3).map((member) => (
                  <div key={member.id} className="relative">
                    <UserAvatar 
                      user={member} 
                      className="w-6 h-6 text-[10px] ring-2 ring-background" 
                    />
                    {isProjectLead(member.id) && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center ring-1 ring-background">
                        <Crown className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedAssignees.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedAssignees.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              {placeholder}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[60] bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() => toggleAssignee(member)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedAssignees.find((m) => m.id === member.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                   />
                  <div className="relative">
                    <UserAvatar user={member} size="sm" showTooltip={false} />
                    {isProjectLead(member.id) && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                        <Crown className="w-1.5 h-1.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="ml-2">{member.name}</span>
                  {isProjectLead(member.id) ? (
                    <span className="ml-auto text-xs text-amber-600 font-medium">Lead</span>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {member.role.replace('-', ' ')}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
