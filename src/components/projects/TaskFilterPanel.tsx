import { useState } from "react";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { User } from "@/types";
import { StatusItem } from "./StatusManager";
import { UserAvatar } from "@/components/ui/user-avatar";
import { effortLibrary, importanceLibrary, TagItem } from "@/data/workManagementConfig";

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
}

export function TaskFilterPanel({
  filters,
  onFiltersChange,
  statuses,
  availableMembers,
}: TaskFilterPanelProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = 
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

  const handleClearFilters = () => {
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
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Additional Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
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
        
        <ScrollArea className="h-[400px]">
          <div className="p-3 space-y-4">
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
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Responsible
              </Label>
              <div className="space-y-1.5">
                {availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                      filters.assignees.includes(member.id) && "bg-muted"
                    )}
                    onClick={() => handleAssigneeToggle(member.id)}
                  >
                    <Checkbox
                      checked={filters.assignees.includes(member.id)}
                      className="pointer-events-none"
                    />
                    <UserAvatar user={member} size="sm" />
                    <span className="text-sm">{member.name}</span>
                  </div>
                ))}
              </div>
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
