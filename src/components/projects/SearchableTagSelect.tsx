import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
  placeholder = "Select tags...",
}: SearchableTagSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((t) => t !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const removeTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(selectedTags.filter((t) => t !== tagId));
  };

  const selectedTagObjects = tags.filter((t) => selectedTags.includes(t.id));

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
            {selectedTagObjects.length > 0 ? (
              selectedTagObjects.map((tag) => (
                <Badge
                  key={tag.id}
                  className="mr-1"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    type="button"
                    className="ml-1 hover:bg-white/20 rounded-full"
                    onClick={(e) => removeTag(tag.id, e)}
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
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
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
