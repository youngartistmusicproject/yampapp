import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SearchableAssigneeSelect } from "./SearchableAssigneeSelect";
import { SearchableTagSelect } from "./SearchableTagSelect";
import { RecurrenceSettings } from "./RecurrenceSettings";
import { NaturalDateInput } from "./NaturalDateInput";
import {
  Calendar as CalendarIcon,
  Clock,
  FolderOpen,
  Circle,
  Repeat,
  BookOpen,
  Link,
  ExternalLink,
  Trash2,
  Send,
  Paperclip,
  Plus,
  Check,
  Users,
  Gauge,
  Flag,
  BarChart3,
  Tag,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import type { Task, Project, Status } from "@/types";
import { cn } from "@/lib/utils";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskComplete: (taskId: string) => void;
  projects: Project[];
  statuses: Status[];
  availableTags: string[];
  projectMembers?: { user_name: string; role: string }[];
  areas?: { id: string; name: string; color: string }[];
}

const EditableText = ({ 
  value, 
  onSave, 
  placeholder = "Add text...",
  multiline = false,
  className = ""
}: { 
  value: string; 
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className={cn("min-h-[60px] resize-none border-0 bg-muted/30 focus-visible:ring-1", className)}
          placeholder={placeholder}
        />
      );
    }
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn("border-0 bg-muted/30 focus-visible:ring-1", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-muted/40 transition-colors",
        !value && "text-muted-foreground",
        className
      )}
    >
      {value || placeholder}
    </div>
  );
};

const EFFORT_OPTIONS = [
  { id: 'easy', label: 'Easy', color: 'text-emerald-600 bg-emerald-500/10', description: 'Quick, just do it' },
  { id: 'light', label: 'Light', color: 'text-blue-600 bg-blue-500/10', description: 'Can multitask' },
  { id: 'focused', label: 'Focused', color: 'text-amber-600 bg-amber-500/10', description: 'Needs focus' },
  { id: 'deep', label: 'Deep', color: 'text-red-600 bg-red-500/10', description: 'Deep work required' },
];

const IMPORTANCE_OPTIONS = [
  { id: 'low', label: 'Low', color: 'text-slate-600 bg-slate-500/10', description: 'Nice to have' },
  { id: 'routine', label: 'Routine', color: 'text-blue-600 bg-blue-500/10', description: 'Baseline work' },
  { id: 'important', label: 'Important', color: 'text-amber-600 bg-amber-500/10', description: 'Must be done' },
  { id: 'critical', label: 'Critical', color: 'text-red-600 bg-red-500/10', description: 'Top priority' },
];

const TIME_OPTIONS = [
  { value: '15m', label: '15 min' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hour' },
  { value: '2h', label: '2 hours' },
  { value: '4h', label: '4 hours' },
  { value: '1d', label: '1 day' },
  { value: '2d', label: '2 days' },
  { value: '1w', label: '1 week' },
];

const PROGRESS_OPTIONS = [0, 10, 25, 50, 75, 90, 100];

const formatEstimatedTime = (time: string) => {
  const map: Record<string, string> = {
    '15m': '15m', '30m': '30m', '1h': '1h', '2h': '2h',
    '4h': '4h', '1d': '1d', '2d': '2d', '1w': '1w'
  };
  return map[time] || time;
};

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdate,
  onTaskComplete,
  projects,
  statuses,
  availableTags,
  projectMembers = [],
  areas = [],
}: TaskDetailDialogProps) {
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [sopPopoverOpen, setSopPopoverOpen] = useState(false);
  const [sopUrl, setSopUrl] = useState("");

  const subtasks: Subtask[] = (() => {
    if (!task?.subtasks) return [];
    if (Array.isArray(task.subtasks)) return task.subtasks as Subtask[];
    if (typeof task.subtasks === 'string') {
      try {
        const parsed = JSON.parse(task.subtasks);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    return [];
  })();

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const hasIncompleteSubtasks = subtasks.some(s => !s.completed);

  const selectedProject = projects.find(p => p.id === task?.projectId);
  const projectAreas = selectedProject?.areaIds
    ?.map(areaId => areas.find(a => a.id === areaId))
    .filter(Boolean) || [];

  const availableAssignees = projectMembers.map(m => m.user_name);

  const handleComplete = () => {
    if (!task) return;
    if (hasIncompleteSubtasks) {
      setShowIncompleteWarning(true);
    } else {
      onTaskComplete(task.id);
      onOpenChange(false);
    }
  };

  const handleConfirmComplete = () => {
    if (!task) return;
    onTaskComplete(task.id);
    setShowIncompleteWarning(false);
    onOpenChange(false);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!task) return;
    const updated = subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onTaskUpdate(task.id, { subtasks: updated as any });
  };

  const handleAddSubtask = () => {
    if (!task || !newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    onTaskUpdate(task.id, { subtasks: [...subtasks, newSubtask] as any });
    setNewSubtaskTitle("");
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!task) return;
    const updated = subtasks.filter(s => s.id !== subtaskId);
    onTaskUpdate(task.id, { subtasks: updated as any });
  };

  const handleSopSave = () => {
    if (!task) return;
    onTaskUpdate(task.id, { howToLink: sopUrl || null });
    setSopPopoverOpen(false);
  };

  const handleSopRemove = () => {
    if (!task) return;
    onTaskUpdate(task.id, { howToLink: null });
    setSopUrl("");
    setSopPopoverOpen(false);
  };

  useEffect(() => {
    if (task?.howToLink) {
      setSopUrl(task.howToLink);
    } else {
      setSopUrl("");
    }
  }, [task?.howToLink]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'MMM d, yyyy') : null;
    } catch { return null; }
  };

  const getStatusColor = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    return status?.color || '#6b7280';
  };

  const getStatusLabel = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    return status?.name || 'Not Started';
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-[900px] max-h-[85vh] p-0 gap-0 overflow-hidden rounded-xl border shadow-xl flex flex-col bg-background">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              <div className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={handleComplete}
                    className="mt-1 w-5 h-5 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center shrink-0"
                  >
                    {task.completedAt && <Check className="w-3 h-3 text-primary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <EditableText
                        value={task.title}
                        onSave={(value) => onTaskUpdate(task.id, { title: value })}
                        placeholder="Task title..."
                        className="text-lg font-semibold leading-tight"
                      />
                      {task.isRecurring && (
                        <Repeat className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="mt-2">
                      <EditableText
                        value={task.description || ""}
                        onSave={(value) => onTaskUpdate(task.id, { description: value })}
                        placeholder="Add a description..."
                        multiline
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subtasks</span>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">{completedSubtasks}/{subtasks.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {subtasks.map((subtask) => (
                    <div key={subtask.id} className="group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/40">
                      <Checkbox checked={subtask.completed} onCheckedChange={() => handleSubtaskToggle(subtask.id)} className="h-4 w-4" />
                      <span className={cn("flex-1 text-sm", subtask.completed && "line-through text-muted-foreground")}>{subtask.title}</span>
                      <button onClick={() => handleDeleteSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="Add subtask..."
                      className="flex-1 h-8 border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              <div className="flex-1 px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comments</span>
                </div>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground/60 italic">No comments yet</p>
                </div>
                <div className="flex items-start gap-3">
                  <UserAvatar name="You" size="sm" />
                  <div className="flex-1 relative">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." className="min-h-[80px] pr-20 resize-none text-sm" />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Paperclip className="w-4 h-4" /></Button>
                      <Button size="icon" className="h-7 w-7" disabled={!newComment.trim()}><Send className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</span>
                </div>
                <div className="flex items-center justify-center py-6 border-2 border-dashed border-border/50 rounded-lg">
                  <div className="text-center">
                    <Paperclip className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground/60">Drop files here or click to upload</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[280px] border-l border-border/40 bg-muted/20 overflow-y-auto shrink-0">
              <div className="p-4 space-y-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Project</p>
                        {selectedProject ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color || '#6b7280' }} />
                            <span className="text-sm truncate">{selectedProject.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      <button onClick={() => onTaskUpdate(task.id, { projectId: null })} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted", !task.projectId && "bg-muted")}>No Project</button>
                      {projects.map((project) => (
                        <button key={project.id} onClick={() => onTaskUpdate(task.id, { projectId: project.id })} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.projectId === project.id && "bg-muted")}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#6b7280' }} />
                          {project.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Stage</p>
                        <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${getStatusColor(task.status)}20`, color: getStatusColor(task.status) }}>{getStatusLabel(task.status)}</Badge>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      {statuses.map((status) => (
                        <button key={status.id} onClick={() => onTaskUpdate(task.id, { status: status.id })} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.status === status.id && "bg-muted")}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Responsible</p>
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {task.assignees.slice(0, 3).map((name, i) => (<UserAvatar key={i} name={name} size="xs" />))}
                            {task.assignees.length > 3 && (<span className="text-xs text-muted-foreground">+{task.assignees.length - 3}</span>)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <SearchableAssigneeSelect value={task.assignees || []} onChange={(assignees) => onTaskUpdate(task.id, { assignees })} availableAssignees={availableAssignees} projectMembers={projectMembers} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Due Date</p>
                        <span className="text-sm">{formatDate(task.dueDate) || <span className="text-muted-foreground">No date</span>}</span>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b"><NaturalDateInput value={task.dueDate} onChange={(date) => onTaskUpdate(task.id, { dueDate: date })} /></div>
                    <Calendar mode="single" selected={task.dueDate ? parseISO(task.dueDate) : undefined} onSelect={(date) => { if (date) { onTaskUpdate(task.id, { dueDate: format(date, 'yyyy-MM-dd') }); }}} />
                    {task.dueDate && (<div className="p-3 border-t"><RecurrenceSettings isRecurring={task.isRecurring} frequency={task.recurrenceFrequency} interval={task.recurrenceInterval} daysOfWeek={task.recurrenceDaysOfWeek} dayOfMonth={task.recurrenceDayOfMonth} endDate={task.recurrenceEndDate} onChange={(settings) => onTaskUpdate(task.id, settings)} /></div>)}
                  </PopoverContent>
                </Popover>

                <div className="border-t border-border/30 my-2" />

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <Gauge className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Effort</p>
                        {task.effort ? (<Badge className={cn("text-xs", EFFORT_OPTIONS.find(e => e.id === task.effort)?.color)}>{EFFORT_OPTIONS.find(e => e.id === task.effort)?.label}</Badge>) : (<span className="text-sm text-muted-foreground">Not set</span>)}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {EFFORT_OPTIONS.map((effort) => (<button key={effort.id} onClick={() => onTaskUpdate(task.id, { effort: effort.id as 'easy' | 'light' | 'focused' | 'deep' })} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.effort === effort.id && "bg-muted")}><span>{effort.label}</span><span className="text-xs text-muted-foreground">{effort.description}</span></button>))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Importance</p>
                        {task.importance ? (<Badge className={cn("text-xs", IMPORTANCE_OPTIONS.find(i => i.id === task.importance)?.color)}>{IMPORTANCE_OPTIONS.find(i => i.id === task.importance)?.label}</Badge>) : (<span className="text-sm text-muted-foreground">Not set</span>)}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      {IMPORTANCE_OPTIONS.map((imp) => (<button key={imp.id} onClick={() => onTaskUpdate(task.id, { importance: imp.id as 'low' | 'routine' | 'important' | 'critical' })} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.importance === imp.id && "bg-muted")}><span>{imp.label}</span><span className="text-xs text-muted-foreground">{imp.description}</span></button>))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Est. Time</p>
                        <span className="text-sm">{task.estimatedTime ? formatEstimatedTime(task.estimatedTime) : <span className="text-muted-foreground">Not set</span>}</span>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2" align="start">
                    <div className="grid grid-cols-2 gap-1">
                      {TIME_OPTIONS.map((time) => (<button key={time.value} onClick={() => onTaskUpdate(task.id, { estimatedTime: time.value })} className={cn("px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.estimatedTime === time.value && "bg-muted")}>{time.label}</button>))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <BarChart3 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Progress</p>
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress || 0} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-8">{task.progress || 0}%</span>
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="grid grid-cols-4 gap-1">
                      {PROGRESS_OPTIONS.map((p) => (<button key={p} onClick={() => onTaskUpdate(task.id, { progress: p })} className={cn("px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.progress === p && "bg-muted")}>{p}%</button>))}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="border-t border-border/30 my-2" />

                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Areas</p>
                  </div>
                  {projectAreas.length > 0 ? (
                    <div className="flex flex-wrap gap-1 pl-6">
                      {projectAreas.map((area) => area && (<Badge key={area.id} variant="secondary" className="text-xs" style={{ backgroundColor: `${area.color}15`, color: area.color }}>{area.name}</Badge>))}
                    </div>
                  ) : (<p className="text-sm text-muted-foreground pl-6">No areas</p>)}
                </div>

                <Popover open={sopPopoverOpen} onOpenChange={setSopPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">SOP Link</p>
                        {task.howToLink ? (<div className="flex items-center gap-1 text-sm text-primary"><Link className="w-3 h-3" /><span className="truncate">View SOP</span></div>) : (<span className="text-sm text-muted-foreground">Add link</span>)}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-3">
                      <Input value={sopUrl} onChange={(e) => setSopUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSopSave} className="flex-1">Save</Button>
                        {task.howToLink && (<><Button size="sm" variant="outline" onClick={() => window.open(task.howToLink!, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" onClick={handleSopRemove} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></>)}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left">
                      <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Tags</p>
                        {task.tags && task.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.slice(0, 3).map((tag) => (<Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>))}
                            {task.tags.length > 3 && (<span className="text-xs text-muted-foreground">+{task.tags.length - 3}</span>)}
                          </div>
                        ) : (<span className="text-sm text-muted-foreground">No tags</span>)}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <SearchableTagSelect value={task.tags || []} onChange={(tags) => onTaskUpdate(task.id, { tags })} availableTags={availableTags} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showIncompleteWarning} onOpenChange={setShowIncompleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Subtasks</AlertDialogTitle>
            <AlertDialogDescription>This task has {subtasks.filter(s => !s.completed).length} incomplete subtask(s). Are you sure you want to mark it as complete?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>Complete Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}