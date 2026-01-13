import { useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@/types";
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

interface SearchableUserMultiSelectProps {
  items: User[];
  selected: User[];
  onToggle: (user: User) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  prependItem?: {
    label: ReactNode;
    onSelect: () => void;
    value?: string;
  };
}

export function SearchableUserMultiSelect({
  items,
  selected,
  onToggle,
  placeholder = "Add...",
  searchPlaceholder = "Search...",
  disabled = false,
  prependItem,
}: SearchableUserMultiSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-9 w-full flex items-center justify-between rounded-md border border-border/50 bg-transparent px-3 text-sm",
            "hover:bg-muted/30 transition-colors",
            disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
          )}
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 z-[60] bg-popover"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {prependItem && (
                <CommandItem
                  value={prependItem.value ?? "__prepend__"}
                  onSelect={() => {
                    prependItem.onSelect();
                    setOpen(false);
                  }}
                >
                  {prependItem.label}
                </CommandItem>
              )}

              {items.map((user) => {
                const isSelected = !!selected.find((s) => s.id === user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => onToggle(user)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate">{user.name}</span>
                    {user.role && (
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {user.role.replace('-', ' ')}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
