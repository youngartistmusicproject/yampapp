import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Task, User, Project, RecurrenceSettings as RecurrenceSettingsType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { tagLibrary, effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
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

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  availableMembers: User[];
  statuses: StatusItem[];
  projects: Project[];
  task?: Task; // For editing
}

export function TaskDialog({ open, onOpenChange, onSubmit, availableMembers, statuses, projects, task }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("not-started");
  const [effort, setEffort] = useState<Task["effort"] | undefined>(undefined);
  const [importance, setImportance] = useState<Task["importance"] | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSettingsType | undefined>();
  const [howToLink, setHowToLink] = useState("");
  const [howToLinkError, setHowToLinkError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isEditing = !!task;

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
      setIsRecurring(task.isRecurring || false);
      setRecurrence(task.recurrence);
      setHowToLink(task.howToLink || "");
    } else {
      resetForm();
    }
  }, [task, open]);

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
    resetForm();
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/50">
          <DialogTitle className="text-lg font-semibold">{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing ? "Update the task details below." : "Fill in the details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Project & Title row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Project <span className="text-destructive">*</span></Label>
                <Select 
                  value={selectedProjectId || "none"} 
                  onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-10 text-sm border-border/50 bg-transparent">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
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

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Task <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to get done?"
                  className={cn(
                    "h-10 text-sm border-border/50 bg-transparent",
                    hasAttemptedSubmit && validationErrors.title && "border-destructive"
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Details</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add helpful details..."
                className="text-sm border-border/50 bg-transparent resize-none min-h-[80px]"
              />
            </div>

            {/* Due Date & Assignees row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Due Date with NLP */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Due Date <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-2">
                  <NaturalDateInput
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="e.g. next friday, Apr 15"
                    hasError={hasAttemptedSubmit && !!validationErrors.dueDate}
                    className="flex-1 h-10"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant={isRecurring ? "default" : "ghost"}
                        size="icon"
                        className="h-10 w-10 shrink-0"
                      >
                        <Repeat className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 z-[70]" align="end">
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

              {/* Assignees */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Responsible <span className="text-destructive">*</span></Label>
                <div className={cn(
                  "rounded-md",
                  hasAttemptedSubmit && validationErrors.assignees && "ring-1 ring-destructive"
                )}>
                  <SearchableAssigneeSelect
                    members={availableMembers}
                    selectedAssignees={selectedAssignees}
                    onAssigneesChange={setSelectedAssignees}
                    placeholder="Add..."
                  />
                </div>
              </div>
            </div>

            {isRecurring && recurrence && (
              <p className="text-sm text-muted-foreground">
                {getRecurrenceDescription(recurrence)}
              </p>
            )}

            {/* Separator */}
            <Separator className="my-2" />

            {/* Effort, Importance, Tags - 3 columns */}
            <div className="grid grid-cols-3 gap-4">
              {/* Effort */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
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
                    "h-10 text-sm border-border/50 bg-transparent",
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
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
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
                    "h-10 text-sm border-border/50 bg-transparent",
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

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tags</Label>
                <SearchableTagSelect
                  tags={tagLibrary}
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  placeholder="Add tags..."
                />
              </div>
            </div>

            {/* Connect SOP */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">SOP Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="howToLink"
                  type="url"
                  placeholder="https://..."
                  value={howToLink}
                  onChange={(e) => handleHowToLinkChange(e.target.value)}
                  className={cn(
                    "h-10 text-sm border-border/50 bg-transparent flex-1",
                    howToLinkError && "border-destructive"
                  )}
                />
                {howToLink && !howToLinkError && (
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
              {howToLinkError && (
                <p className="text-sm text-destructive">{howToLinkError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 bg-muted/30">
            <Button type="button" variant="ghost" size="default" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="default">{isEditing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getRecurrenceDescription(recurrence: RecurrenceSettingsType): string {
  const { frequency, interval, daysOfWeek, dayOfMonth, endDate } = recurrence;

  let description = "Repeats ";

  if (interval === 1) {
    description += frequency.replace("ly", "");
  } else {
    description += `every ${interval} ${frequency.replace("ly", "")}s`;
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