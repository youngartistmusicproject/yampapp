import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
  placeholder = "Select assignees...",
}: SearchableAssigneeSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleAssignee = (member: User) => {
    if (selectedAssignees.find((m) => m.id === member.id)) {
      onAssigneesChange(selectedAssignees.filter((m) => m.id !== member.id));
    } else {
      onAssigneesChange([...selectedAssignees, member]);
    }
  };

  const removeAssignee = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAssigneesChange(selectedAssignees.filter((m) => m.id !== memberId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedAssignees.length > 0 ? (
              selectedAssignees.map((member) => (
                <Badge
                  key={member.id}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {member.name}
                  <button
                    type="button"
                    className="ml-1 hover:bg-muted rounded-full"
                    onClick={(e) => removeAssignee(member.id, e)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
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
