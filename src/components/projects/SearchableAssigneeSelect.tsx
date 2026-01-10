import { useState } from "react";
import { Check, Plus } from "lucide-react";
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
}

export function SearchableAssigneeSelect({
  members,
  selectedAssignees,
  onAssigneesChange,
  placeholder = "Add...",
}: SearchableAssigneeSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleAssignee = (member: User) => {
    if (selectedAssignees.find((m) => m.id === member.id)) {
      onAssigneesChange(selectedAssignees.filter((m) => m.id !== member.id));
    } else {
      onAssigneesChange([...selectedAssignees, member]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 hover:bg-muted/50 rounded px-2 py-1 -mr-2 transition-colors">
          {selectedAssignees.length > 0 ? (
            <div className="flex items-center">
              <div className="flex -space-x-1.5">
                {selectedAssignees.slice(0, 3).map((member) => (
                  <UserAvatar 
                    key={member.id} 
                    user={member} 
                    className="w-6 h-6 text-[10px] ring-2 ring-background" 
                  />
                ))}
              </div>
              {selectedAssignees.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1.5">
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
      <PopoverContent className="w-64 p-0 z-50 bg-popover" align="end">
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
                  <UserAvatar user={member} size="sm" showTooltip={false} />
                  <span className="ml-2">{member.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {member.role}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
