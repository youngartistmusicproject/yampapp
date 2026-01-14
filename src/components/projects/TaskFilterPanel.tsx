import { useState, useMemo } from "react";
import { Filter, X, Calendar as CalendarIcon, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { User, Project } from "@/types";
import { StatusItem } from "./StatusManager";
import { UserAvatar } from "@/components/ui/user-avatar";
import { effortLibrary, importanceLibrary, TagItem } from "@/data/workManagementConfig";

interface Area {
  id: string;
  name: string;
  color: string;
}

export interface TaskFilters {
  statuses: string[];
  efforts: string[];
  importances: string[];
  assignees: string[];
  tags: string[];
  showRecurring: boolean | null; // null = show all, true = only recurring, false = only non-recurring
  dueDateFrom?: Date;
  dueDateTo?: Date;
  showOverdueOnly?: boolean;
  /** @deprecated Use efforts instead */
  priorities?: string[];
}

interface TaskFilterPanelProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  statuses: StatusItem[];
  availableMembers: User[];
  frequentAssigneeNames?: string[];
  // New props for areas and projects
  areas: Area[];
  selectedAreaIds: string[];
  onAreasChange: (areaIds: string[]) => void;
  projects: { id: string; name: string; color: string }[];
  selectedProjectIds: string[];
  onProjectsChange: (projectIds: string[]) => void;
}

export function TaskFilterPanel({
  filters,
  onFiltersChange,
  statuses,
  availableMembers,
  frequentAssigneeNames = [],
  areas,
  selectedAreaIds,
  onAreasChange,
  projects,
  selectedProjectIds,
  onProjectsChange,
}: TaskFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [areasSearch, setAreasSearch] = useState("");
  const [projectsSearch, setProjectsSearch] = useState("");
  const [responsibleSearch, setResponsibleSearch] = useState("");

  // Filtered lists based on search
  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(areasSearch.toLowerCase())
  );
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectsSearch.toLowerCase())
  );

  // Get frequent member objects from names
  const frequentMembers = useMemo(() => {
    return frequentAssigneeNames
      .map(name => availableMembers.find(m => m.name === name))
      .filter((m): m is User => m !== undefined)
      .slice(0, 6);
  }, [frequentAssigneeNames, availableMembers]);

  // When searching, search ALL members
  const searchResults = useMemo(() => {
    if (!responsibleSearch.trim()) return [];
    return availableMembers.filter(member =>
      member.name.toLowerCase().includes(responsibleSearch.toLowerCase())
    );
  }, [responsibleSearch, availableMembers]);

  const activeFilterCount = 
    selectedAreaIds.length +
    selectedProjectIds.length +
    filters.statuses.length +
    filters.efforts.length +
    filters.importances.length +
    filters.assignees.length +
    (filters.showRecurring !== null ? 1 : 0) +
    (filters.dueDateFrom ? 1 : 0) +
    (filters.dueDateTo ? 1 : 0) +
    (filters.showOverdueOnly ? 1 : 0);

  const handleStatusToggle = (statusId: string) => {
    const newStatuses = filters.statuses.includes(statusId)
      ? filters.statuses.filter(s => s !== statusId)
      : [...filters.statuses, statusId];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const handleEffortToggle = (effortId: string) => {
    const newEfforts = filters.efforts.includes(effortId)
      ? filters.efforts.filter(e => e !== effortId)
      : [...filters.efforts, effortId];
    onFiltersChange({ ...filters, efforts: newEfforts });
  };

  const handleImportanceToggle = (importanceId: string) => {
    const newImportances = filters.importances.includes(importanceId)
      ? filters.importances.filter(i => i !== importanceId)
      : [...filters.importances, importanceId];
    onFiltersChange({ ...filters, importances: newImportances });
  };

  const handleAssigneeToggle = (assigneeId: string) => {
    const newAssignees = filters.assignees.includes(assigneeId)
      ? filters.assignees.filter(a => a !== assigneeId)
      : [...filters.assignees, assigneeId];
    onFiltersChange({ ...filters, assignees: newAssignees });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const handleRecurringChange = (value: boolean | null) => {
    onFiltersChange({ ...filters, showRecurring: value });
  };

  const toggleArea = (areaId: string) => {
    if (selectedAreaIds.includes(areaId)) {
      onAreasChange(selectedAreaIds.filter((id) => id !== areaId));
    } else {
      onAreasChange([...selectedAreaIds, areaId]);
    }
  };

  const toggleProject = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onProjectsChange(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      onProjectsChange([...selectedProjectIds, projectId]);
    }
  };

  const handleClearFilters = () => {
    onAreasChange([]);
    onProjectsChange([]);
    onFiltersChange({
      statuses: [],
      efforts: [],
      importances: [],
      assignees: [],
      tags: [],
      showRecurring: null,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      showOverdueOnly: false,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-md border border-border/50 bg-transparent hover:bg-muted/50 transition-colors",
            activeFilterCount > 0 && "border-primary/50"
          )}
        >
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={activeFilterCount > 0 ? "text-foreground" : "text-muted-foreground"}>
            Filter
          </span>
          {activeFilterCount > 0 && (
            <>
              <Badge 
                variant="secondary" 
                className="h-5 px-1.5 text-[11px] font-medium bg-primary/15 text-primary border-primary/30"
              >
                {activeFilterCount}
              </Badge>
              <X
                className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFilters();
                }}
              />
            </>
          )}
          {activeFilterCount === 0 && (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover" align="start">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium text-sm">Filters</h4>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleClearFilters}
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[450px]">
          <div className="p-3 space-y-4">
            {/* Areas Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Areas
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Search areas..."
                  value={areasSearch}
                  onChange={(e) => setAreasSearch(e.target.value)}
                  className="h-7 text-xs pl-7"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {areas.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No areas configured</span>
                ) : filteredAreas.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No matching areas</span>
                ) : (
                  filteredAreas.map((area) => {
                    const isSelected = selectedAreaIds.includes(area.id);
                    return (
                      <Badge
                        key={area.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer gap-1.5 transition-colors"
                        onClick={() => toggleArea(area.id)}
                        style={isSelected ? { backgroundColor: area.color } : {}}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? "white" : area.color }}
                        />
                        {area.name}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            <Separator />

            {/* Projects Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Projects
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={projectsSearch}
                  onChange={(e) => setProjectsSearch(e.target.value)}
                  className="h-7 text-xs pl-7"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {projects.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No projects configured</span>
                ) : filteredProjects.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No matching projects</span>
                ) : (
                  filteredProjects.map((project) => {
                    const isSelected = selectedProjectIds.includes(project.id);
                    const color = project.color || '#6b7280';
                    return (
                      <Badge
                        key={project.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer gap-1.5 transition-colors"
                        onClick={() => toggleProject(project.id)}
                        style={isSelected ? { backgroundColor: color } : {}}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? "white" : color }}
                        />
                        {project.name}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            <Separator />

            {/* Stage Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Stage
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((status) => (
                  <Badge
                    key={status.id}
                    variant={filters.statuses.includes(status.id) ? "default" : "outline"}
                    className="cursor-pointer gap-1.5"
                    onClick={() => handleStatusToggle(status.id)}
                    style={filters.statuses.includes(status.id) ? { backgroundColor: status.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: filters.statuses.includes(status.id) ? "white" : status.color 
                      }}
                    />
                    {status.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Effort Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Effort
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {effortLibrary.map((effort) => (
                  <Badge
                    key={effort.id}
                    variant={filters.efforts.includes(effort.id) ? "default" : "outline"}
                    className="cursor-pointer gap-1.5"
                    onClick={() => handleEffortToggle(effort.id)}
                    style={filters.efforts.includes(effort.id) ? { backgroundColor: effort.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: filters.efforts.includes(effort.id) ? "white" : effort.color 
                      }}
                    />
                    {effort.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Importance Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Importance
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {importanceLibrary.map((importance) => (
                  <Badge
                    key={importance.id}
                    variant={filters.importances.includes(importance.id) ? "default" : "outline"}
                    className="cursor-pointer gap-1.5"
                    onClick={() => handleImportanceToggle(importance.id)}
                    style={filters.importances.includes(importance.id) ? { backgroundColor: importance.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: filters.importances.includes(importance.id) ? "white" : importance.color 
                      }}
                    />
                    {importance.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Responsible Filter */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Responsible
              </Label>
              
              {/* Search All Section */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="Search all people..."
                    value={responsibleSearch}
                    onChange={(e) => setResponsibleSearch(e.target.value)}
                    className="h-7 text-xs pl-7"
                  />
                </div>
                
                {/* Show results only when searching */}
                {responsibleSearch.trim() && (
                  <div className="flex flex-wrap gap-1.5">
                    {searchResults.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No matching people</span>
                    ) : (
                      searchResults.map((member) => {
                        const isSelected = filters.assignees.includes(member.id);
                        return (
                          <Badge
                            key={member.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer gap-1.5 pl-1 transition-colors"
                            onClick={() => handleAssigneeToggle(member.id)}
                          >
                            <UserAvatar user={member} size="xs" showTooltip={false} />
                            {member.name}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Most Frequent Section */}
              {frequentMembers.length > 0 && !responsibleSearch.trim() && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Most Frequent
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {frequentMembers.map((member) => {
                      const isSelected = filters.assignees.includes(member.id);
                      return (
                        <Badge
                          key={member.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer gap-1.5 pl-1 transition-colors"
                          onClick={() => handleAssigneeToggle(member.id)}
                        >
                          <UserAvatar user={member} size="xs" showTooltip={false} />
                          {member.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Show first 8 members if no frequent and no search */}
              {!responsibleSearch.trim() && frequentMembers.length === 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableMembers.slice(0, 8).map((member) => {
                    const isSelected = filters.assignees.includes(member.id);
                    return (
                      <Badge
                        key={member.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer gap-1.5 pl-1 transition-colors"
                        onClick={() => handleAssigneeToggle(member.id)}
                      >
                        <UserAvatar user={member} size="xs" showTooltip={false} />
                        {member.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Recurring Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recurring Tasks
              </Label>
              <div className="flex gap-2">
                <Badge
                  variant={filters.showRecurring === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleRecurringChange(null)}
                >
                  All
                </Badge>
                <Badge
                  variant={filters.showRecurring === true ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleRecurringChange(true)}
                >
                  Recurring Only
                </Badge>
                <Badge
                  variant={filters.showRecurring === false ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleRecurringChange(false)}
                >
                  Non-Recurring
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Due Date Range */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Due Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal h-8 text-xs",
                        !filters.dueDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {filters.dueDateFrom ? format(filters.dueDateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateFrom}
                      onSelect={(date) => onFiltersChange({ ...filters, dueDateFrom: date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal h-8 text-xs",
                        !filters.dueDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" />
                      {filters.dueDateTo ? format(filters.dueDateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateTo}
                      onSelect={(date) => onFiltersChange({ ...filters, dueDateTo: date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {(filters.dueDateFrom || filters.dueDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs w-full"
                  onClick={() => onFiltersChange({ ...filters, dueDateFrom: undefined, dueDateTo: undefined })}
                >
                  Clear dates
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
