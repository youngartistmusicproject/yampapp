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

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ProjectFilterSelectProps {
  projects: Project[];
  selectedProjectIds: string[];
  onProjectsChange: (projectIds: string[]) => void;
  placeholder?: string;
}

export function ProjectFilterSelect({
  projects,
  selectedProjectIds,
  onProjectsChange,
  placeholder = "Projects",
}: ProjectFilterSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleProject = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onProjectsChange(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      onProjectsChange([...selectedProjectIds, projectId]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProjectsChange([]);
  };

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-md border border-border/50 bg-transparent hover:bg-muted/50 transition-colors",
            selectedProjectIds.length > 0 && "border-primary/50"
          )}
        >
          {selectedProjects.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {selectedProjects.slice(0, 2).map((project) => (
                  <Badge
                    key={project.id}
                    variant="outline"
                    className="h-5 px-1.5 text-[11px] font-medium gap-1"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </Badge>
                ))}
                {selectedProjects.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{selectedProjects.length - 2}
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
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => toggleProject(project.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProjectIds.includes(project.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span
                    className="w-3 h-3 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
