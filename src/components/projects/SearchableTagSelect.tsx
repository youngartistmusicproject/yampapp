import { useState } from "react";
import { Check, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SearchableTagSelectProps {
  tags: Tag[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export function SearchableTagSelect({
  tags,
  selectedTags,
  onTagsChange,
  placeholder = "Add...",
}: SearchableTagSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((t) => t !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const selectedTagObjects = tags.filter((t) => selectedTags.includes(t.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 hover:bg-muted/50 rounded px-2 py-1 -mr-2 transition-colors">
          {selectedTagObjects.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedTagObjects.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
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
          <CommandInput placeholder="Search areas..." />
          <CommandList>
            <CommandEmpty>No areas found.</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.name}
                  onSelect={() => toggleTag(tag.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
