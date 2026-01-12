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
  DialogFooter,
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
import { Repeat, BookOpen, Plus, Info } from "lucide-react";
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
  const [effort, setEffort] = useState<Task["effort"]>("easy");
  const [importance, setImportance] = useState<Task["importance"]>("routine");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSettingsType | undefined>();
  const [howToLink, setHowToLink] = useState("");
  const [howToLinkError, setHowToLinkError] = useState("");

  const isEditing = !!task;

  // Parse an <input type="date" /> value (YYYY-MM-DD) into a local Date
  const parseInputDate = (value: string): Date => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setEffort(task.effort);
      setImportance(task.importance);
      setDueDate(task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : "");
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
    setEffort("easy");
    setImportance("routine");
    setDueDate("");
    setSelectedTags([]);
    setSelectedAssignees([]);
    setSelectedProjectId("");
    setIsRecurring(false);
    setRecurrence(undefined);
    setHowToLink("");
    setHowToLinkError("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL before submitting
    if (howToLink.trim() && !isValidUrl(howToLink)) {
      setHowToLinkError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }
    
    onSubmit({
      title,
      description,
      status,
      effort,
      importance,
      dueDate: dueDate ? parseInputDate(dueDate) : undefined,
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the task details below." : "Add a new task to your project. Fill in the details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="project">What project does this belong to?</Label>
              <Select 
                value={selectedProjectId || "none"} 
                onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {(projects || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
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
              <Label htmlFor="title">What needs to get done? <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Any context or details for this task? <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Due Date with Recurrence */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">When is the deadline for this task?</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-auto"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={isRecurring ? "default" : "outline"}
                      size="icon"
                      className="shrink-0"
                    >
                      <Repeat className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
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
              {isRecurring && recurrence && (
                <p className="text-xs text-muted-foreground">
                  {getRecurrenceDescription(recurrence)}
                </p>
              )}
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <Label>Who is responsible for this task?</Label>
              <SearchableAssigneeSelect
                members={availableMembers}
                selectedAssignees={selectedAssignees}
                onAssigneesChange={setSelectedAssignees}
                placeholder="Search and select assignees..."
              />
            </div>

            {/* Separator */}
            <Separator className="my-4" />

            {/* Stage (Status) */}
            <div className="space-y-2">
              <Label htmlFor="status">Stage <span className="text-destructive">*</span></Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span>{s.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Effort */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="effort">Effort <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="View effort definitions"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3 z-[70]" align="start">
                    <p className="text-sm font-medium">Effort</p>
                    <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
                      {effortLibrary.map((e) => (
                        <li key={e.id}>
                          <span className="font-medium text-foreground">{e.name}</span> — {e.description}
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <Select value={effort} onValueChange={(v) => setEffort(v as Task["effort"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select effort" />
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
              <div className="flex items-center gap-1">
                <Label htmlFor="importance">Importance <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="View importance definitions"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3 z-[70]" align="start">
                    <p className="text-sm font-medium">Importance</p>
                    <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
                      {importanceLibrary.map((i) => (
                        <li key={i.id}>
                          <span className="font-medium text-foreground">{i.name}</span> — {i.description}
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <Select value={importance} onValueChange={(v) => setImportance(v as Task["importance"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
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
              <Label>Tags</Label>
              <SearchableTagSelect
                tags={tagLibrary}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                placeholder="Search and select tags..."
              />
            </div>

            {/* Connect SOP */}
            <div className="space-y-2">
              <Label htmlFor="howToLink">Connect SOP</Label>
              <div className="flex items-center gap-2">
                {howToLink && !howToLinkError ? (
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <Input
                  id="howToLink"
                  type="url"
                  placeholder="Add link to SOP documentation..."
                  value={howToLink}
                  onChange={(e) => handleHowToLinkChange(e.target.value)}
                  className={`flex-1 ${howToLinkError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
              </div>
              {howToLinkError && (
                <p className="text-xs text-destructive">{howToLinkError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Create Task"}</Button>
          </DialogFooter>
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