import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface Area {
  id: string;
  name: string;
  color: string;
}

interface AreaFilterSelectProps {
  areas: Area[];
  selectedAreaIds: string[];
  onAreasChange: (areaIds: string[]) => void;
  placeholder?: string;
}

export function AreaFilterSelect({
  areas,
  selectedAreaIds,
  onAreasChange,
  placeholder = "Areas",
}: AreaFilterSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleArea = (areaId: string) => {
    if (selectedAreaIds.includes(areaId)) {
      onAreasChange(selectedAreaIds.filter((id) => id !== areaId));
    } else {
      onAreasChange([...selectedAreaIds, areaId]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAreasChange([]);
  };

  const selectedAreas = areas.filter((a) => selectedAreaIds.includes(a.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-md border border-border/50 bg-transparent hover:bg-muted/50 transition-colors",
            selectedAreaIds.length > 0 && "border-primary/50"
          )}
        >
          {selectedAreas.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {selectedAreas.slice(0, 2).map((area) => (
                  <Badge
                    key={area.id}
                    variant="outline"
                    className="h-5 px-1.5 text-[11px] font-medium"
                    style={{ 
                      backgroundColor: `${area.color}20`,
                      borderColor: `${area.color}40`,
                      color: area.color
                    }}
                  >
                    {area.name}
                  </Badge>
                ))}
                {selectedAreas.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{selectedAreas.length - 2}
                  </span>
                )}
              </div>
              <X 
                className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" 
                onClick={clearAll}
              />
            </div>
          ) : (
            <>
              <span className="text-muted-foreground">{placeholder}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[70]" align="start">
        <Command>
          <CommandInput placeholder="Search areas..." />
          <CommandList>
            <CommandEmpty>No areas found.</CommandEmpty>
            <CommandGroup>
              {areas.map((area) => (
                <CommandItem
                  key={area.id}
                  value={area.name}
                  onSelect={() => toggleArea(area.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedAreaIds.includes(area.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div
                    className="w-3 h-3 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: area.color }}
                  />
                  <span className="truncate">{area.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
