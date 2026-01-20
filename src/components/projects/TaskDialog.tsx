import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Task, User, Project, RecurrenceSettings as RecurrenceSettingsType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { SearchableTagSelect } from "./SearchableTagSelect";
import { SearchableAssigneeSelect } from "./SearchableAssigneeSelect";
import { RecurrenceSettings } from "./RecurrenceSettings";
import { NaturalDateInput } from "./NaturalDateInput";
import { Repeat, BookOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";
export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  availableMembers: User[];
  statuses: StatusItem[];
  projects: Project[];
  tags: TagItem[];
  task?: Task; // For editing
}

export function TaskDialog({ open, onOpenChange, onSubmit, availableMembers, statuses, projects, tags, task }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("not-started");
  const [effort, setEffort] = useState<Task["effort"] | undefined>(undefined);
  const [importance, setImportance] = useState<Task["importance"] | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [hasSelectedProject, setHasSelectedProject] = useState(false); // tracks if user made a selection
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSettingsType | undefined>();
  const [howToLink, setHowToLink] = useState("");
  const [howToLinkError, setHowToLinkError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isEditing = !!task;

  // Get project members (owners + members) for the selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectMembers: User[] = selectedProject
    ? [...(selectedProject.owners || []), ...(selectedProject.members || [])]
        .filter((user, index, self) => self.findIndex(u => u.id === user.id) === index) // dedupe
    : [];
  
  // Use project members if project is selected, otherwise show all available
  const filteredAssignees = selectedProjectId ? projectMembers : availableMembers;

  // Parse a date string (YYYY-MM-DD) into a local Date
  const parseInputDate = (value: string): Date => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Convert Date to YYYY-MM-DD string for storage
  const formatDateForStorage = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
  };

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setEffort(task.effort);
      setImportance(task.importance);
      setDueDate(task.dueDate ? (typeof task.dueDate === 'string' ? parseInputDate(task.dueDate as string) : task.dueDate) : undefined);
      setSelectedTags(task.tags);
      setSelectedAssignees(task.assignees);
      setSelectedProjectId(task.projectId || "");
      setHasSelectedProject(true); // editing means already selected
      setIsRecurring(task.isRecurring || false);
      setRecurrence(task.recurrence);
      setHowToLink(task.howToLink || "");
    } else {
      resetForm();
    }
  }, [task, open]);

  // Clear assignees when project changes (members differ between projects)
  useEffect(() => {
    if (!isEditing) {
      // Filter out assignees that are not in the new project's members
      const validAssignees = selectedAssignees.filter(a => 
        projectMembers.some(pm => pm.id === a.id)
      );
      if (validAssignees.length !== selectedAssignees.length) {
        setSelectedAssignees(validAssignees);
      }
    }
  }, [selectedProjectId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("not-started");
    setEffort(undefined);
    setImportance(undefined);
    setDueDate(undefined);
    setSelectedTags([]);
    setSelectedAssignees([]);
    setSelectedProjectId("");
    setHasSelectedProject(false);
    setIsRecurring(false);
    setRecurrence(undefined);
    setHowToLink("");
    setHowToLinkError("");
    setValidationErrors({});
    setHasAttemptedSubmit(false);
  };

  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleHowToLinkChange = (value: string) => {
    setHowToLink(value);
    if (value.trim() && !isValidUrl(value)) {
      setHowToLinkError("Please enter a valid URL (e.g., https://example.com)");
    } else {
      setHowToLinkError("");
    }
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!title.trim()) {
      errors.title = "Task title is required";
    }
    if (!hasSelectedProject) {
      errors.project = "Project selection is required";
    }
    if (!dueDate) {
      errors.dueDate = "Due date is required";
    }
    if (selectedAssignees.length === 0) {
      errors.assignees = "At least one assignee is required";
    }
    if (!effort) {
      errors.effort = "Effort is required";
    }
    if (!importance) {
      errors.importance = "Importance is required";
    }
    if (howToLink.trim() && !isValidUrl(howToLink)) {
      errors.howToLink = "Please enter a valid URL (e.g., https://example.com)";
    }
    
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    const errors = validateForm();
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    onSubmit({
      title,
      description,
      status,
      effort,
      importance,
      dueDate: dueDate || undefined,
      tags: selectedTags,
      assignees: selectedAssignees,
      projectId: selectedProjectId || undefined,
      isRecurring,
      recurrence,
      howToLink: howToLink.trim() || undefined,
    });
  };

  const handleToggleRecurring = (value: boolean) => {
    setIsRecurring(value);
    if (value && !recurrence) {
      setRecurrence({
        frequency: "weekly",
        interval: 1,
      });
    } else if (!value) {
      setRecurrence(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[640px] max-sm:max-h-[90vh] sm:max-h-[90vh] overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          {/* Header area - editable title & description */}
          <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/50">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className={cn(
                "w-full text-lg sm:text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/60",
                hasAttemptedSubmit && validationErrors.title && "placeholder:text-destructive/60"
              )}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add helpful details..."
              rows={2}
              className="w-full mt-2 text-sm text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Form fields */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">

            {/* Property rows - clean inline layout */}
            <div className="space-y-4 sm:space-y-3">
              {/* Project */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Label className="text-sm text-muted-foreground sm:w-28 shrink-0">Project <span className="text-destructive">*</span></Label>
                <Select 
                  value={hasSelectedProject ? (selectedProjectId || "none") : ""} 
                  onValueChange={(v) => {
                    setHasSelectedProject(true);
                    setSelectedProjectId(v === "none" ? "" : v);
                  }}
                >
                  <SelectTrigger className={cn(
                    "text-base sm:text-sm border-border/50 bg-transparent flex-1",
                    hasAttemptedSubmit && validationErrors.project && "border-destructive"
                  )}>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground italic">No Project</span>
                    </SelectItem>
                    {(projects || []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Areas - inherited from project or editable if no project */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Areas</Label>
                <div className="flex-1">
                  {selectedProjectId ? (
                    // Project selected - show inherited areas as read-only badges
                    (() => {
                      const project = projects.find(p => p.id === selectedProjectId);
                      const projectAreas = project?.areas || [];
                      return projectAreas.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {projectAreas.map((area) => (
                            <Badge
                              key={area.id}
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: `${area.color}20`,
                                color: area.color,
                                borderColor: `${area.color}40`,
                              }}
                            >
                              {area.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No areas assigned to project</span>
                      );
                    })()
                  ) : (
                    // No project - allow area selection
                    <SearchableTagSelect
                      tags={tags}
                      selectedTags={selectedTags}
                      onTagsChange={setSelectedTags}
                    />
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Due Date <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-2 flex-1">
                  <NaturalDateInput
                    value={dueDate}
                    onChange={setDueDate}
                    onRecurrenceChange={(rec) => {
                      if (rec) {
                        setIsRecurring(true);
                        setRecurrence(rec);
                      }
                    }}
                    placeholder="e.g. next friday, every Monday"
                    hasError={hasAttemptedSubmit && !!validationErrors.dueDate}
                    className="flex-1 h-9"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant={isRecurring ? "default" : "ghost"}
                        size="icon"
                        className="h-9 w-9 shrink-0"
                      >
                        <Repeat className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-[70] max-h-[400px] overflow-y-auto" align="end">
                      <RecurrenceSettings
                        isRecurring={isRecurring}
                        onIsRecurringChange={handleToggleRecurring}
                        recurrence={recurrence}
                        onRecurrenceChange={setRecurrence}
                        compact
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {isRecurring && recurrence && (
                <p className="text-xs text-muted-foreground pl-[124px] -mt-1">
                  {getRecurrenceDescription(recurrence)}
                </p>
              )}

              {/* Responsible */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">Responsible <span className="text-destructive">*</span></Label>
                <div className={cn(
                  "rounded-md flex-1",
                  hasAttemptedSubmit && validationErrors.assignees && "ring-1 ring-destructive"
                )}>
                  <SearchableAssigneeSelect
                    members={filteredAssignees}
                    selectedAssignees={selectedAssignees}
                    onAssigneesChange={setSelectedAssignees}
                    placeholder="Add..."
                  />
                </div>
              </div>

              {/* Effort */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <Label className="text-sm text-muted-foreground">Effort <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 z-[70]" align="start">
                      <p className="text-sm font-medium mb-2">Effort Levels</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {effortLibrary.map((e) => (
                          <li key={e.id} className="flex">
                            <span className="font-medium text-foreground shrink-0">{e.name}</span>
                            <span className="ml-1">— {e.description}</span>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
                <Select value={effort || ""} onValueChange={(v) => setEffort(v as Task["effort"])}>
                  <SelectTrigger className={cn(
                    "h-9 text-sm border-border/50 bg-transparent flex-1",
                    hasAttemptedSubmit && validationErrors.effort && "border-destructive"
                  )}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {effortLibrary.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Importance */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <Label className="text-sm text-muted-foreground">Importance <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 z-[70]" align="start">
                      <p className="text-sm font-medium mb-2">Importance Levels</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {importanceLibrary.map((i) => (
                          <li key={i.id} className="flex">
                            <span className="font-medium text-foreground shrink-0">{i.name}</span>
                            <span className="ml-1">— {i.description}</span>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
                <Select value={importance || ""} onValueChange={(v) => setImportance(v as Task["importance"])}>
                  <SelectTrigger className={cn(
                    "h-9 text-sm border-border/50 bg-transparent flex-1",
                    hasAttemptedSubmit && validationErrors.importance && "border-destructive"
                  )}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {importanceLibrary.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              {/* SOP Link */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground w-28 shrink-0">SOP Link</Label>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    id="howToLink"
                    type="url"
                    placeholder="https://..."
                    value={howToLink}
                    onChange={(e) => handleHowToLinkChange(e.target.value)}
                    className={cn(
                      "h-9 text-sm border-border/50 bg-transparent flex-1",
                      howToLinkError && "border-destructive"
                    )}
                  />
                  {howToLink && !howToLinkError && (
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
              </div>
              {howToLinkError && (
                <p className="text-sm text-destructive pl-[124px]">{howToLinkError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-border/50 bg-muted/30 safe-area-pb">
            <Button type="button" variant="ghost" className="w-full sm:w-auto max-sm:h-12 max-sm:text-base" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto max-sm:h-12 max-sm:text-base">{isEditing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getRecurrenceDescription(recurrence: RecurrenceSettingsType): string {
  const { frequency, interval, daysOfWeek, dayOfMonth, endDate } = recurrence;

  const frequencyLabels: Record<string, { singular: string; plural: string }> = {
    daily: { singular: "day", plural: "days" },
    weekly: { singular: "week", plural: "weeks" },
    monthly: { singular: "month", plural: "months" },
    yearly: { singular: "year", plural: "years" },
  };

  const label = frequencyLabels[frequency] || { singular: frequency, plural: frequency };
  
  let description = "Repeats every ";

  if (interval === 1) {
    description += label.singular;
  } else {
    description += `${interval} ${label.plural}`;
  }

  if (frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = daysOfWeek.map((d) => dayNames[d]).join(", ");
    description += ` on ${days}`;
  }

  if (frequency === "monthly" && dayOfMonth) {
    description += ` on day ${dayOfMonth}`;
  }

  if (endDate) {
    description += ` until ${endDate.toLocaleDateString()}`;
  }

  return description;
}