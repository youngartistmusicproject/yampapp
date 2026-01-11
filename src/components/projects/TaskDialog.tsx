import { useState, useEffect } from "react";
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
import { tagLibrary } from "@/data/workManagementConfig";
import { SearchableTagSelect } from "./SearchableTagSelect";
import { SearchableAssigneeSelect } from "./SearchableAssigneeSelect";
import { RecurrenceSettings } from "./RecurrenceSettings";
import { Repeat, BookOpen, Plus } from "lucide-react";

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
  const [status, setStatus] = useState<string>("todo");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceSettingsType | undefined>();
  const [howToLink, setHowToLink] = useState("");
  const [howToLinkError, setHowToLinkError] = useState("");

  const isEditing = !!task;

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
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
    setStatus("todo");
    setPriority("medium");
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
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
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
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="project">Project</Label>
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
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

            {/* Due Date with Recurrence */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1"
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

            <div className="space-y-2">
              <Label>Assign To</Label>
              <SearchableAssigneeSelect
                members={availableMembers}
                selectedAssignees={selectedAssignees}
                onAssigneesChange={setSelectedAssignees}
                placeholder="Search and select assignees..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <SearchableTagSelect
                tags={tagLibrary}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                placeholder="Search and select tags..."
              />
              <p className="text-xs text-muted-foreground">
                Search or select from the tag library
              </p>
            </div>

            {/* How To Link */}
            <div className="space-y-2">
              <Label htmlFor="howToLink">How To (SOP Link)</Label>
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