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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { UserAvatar, UserAvatarGroup } from "@/components/ui/user-avatar";
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
  MessageSquare,
  File,
  Info,
} from "lucide-react";
import { effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { format, parseISO, isValid } from "date-fns";
import type { Task, Project, User, RecurrenceSettings as RecurrenceSettingsType } from "@/types";
import { cn } from "@/lib/utils";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface StatusOption {
  id: string;
  name: string;
  color: string;
}

// Simple project type for the dialog (subset of full Project)
interface ProjectOption {
  id: string;
  name: string;
  color: string;
  areaIds?: string[];
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskComplete?: (taskId: string) => void;
  projects: ProjectOption[];
  statuses: StatusOption[];
  availableTags?: string[];
  projectMembers?: User[];
  areas?: { id: string; name: string; color: string }[];
  // Additional props that pages may pass (kept for compatibility)
  currentUser?: User;
  availableMembers?: User[];
  onAddComment?: (taskId: string, content: any, parentCommentId?: string) => void;
  onDeleteComment?: (taskId: string, commentId: string) => void;
  onToggleReaction?: (taskId: string, commentId: string, emoji: string) => void;
  tags?: any[];
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
          className={cn("min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0", className)}
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
        className={cn("border-0 bg-transparent focus-visible:ring-0 p-0 h-auto", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-text hover:text-foreground/80 transition-colors",
        !value && "text-muted-foreground",
        className
      )}
    >
      {value || placeholder}
    </div>
  );
};

// Use the shared effort/importance libraries from config
const EFFORT_OPTIONS = effortLibrary.map(e => ({
  id: e.id,
  label: e.name,
  color: e.id === 'easy' ? 'text-emerald-600 bg-emerald-500/10' 
       : e.id === 'light' ? 'text-blue-600 bg-blue-500/10'
       : e.id === 'focused' ? 'text-amber-600 bg-amber-500/10'
       : 'text-red-600 bg-red-500/10',
  description: e.description,
}));

const IMPORTANCE_OPTIONS = importanceLibrary.map(i => ({
  id: i.id,
  label: i.name,
  color: i.id === 'low' ? 'text-slate-600 bg-slate-500/10'
       : i.id === 'routine' ? 'text-blue-600 bg-blue-500/10'
       : i.id === 'important' ? 'text-amber-600 bg-amber-500/10'
       : 'text-red-600 bg-red-500/10',
  description: i.description,
}));

const TIME_UNITS = [
  { value: 'min', label: 'min', multiplier: 1 },
  { value: 'hour', label: 'hour', multiplier: 60 },
  { value: 'day', label: 'day', multiplier: 480 },
  { value: 'week', label: 'week', multiplier: 2400 },
];

const PROGRESS_OPTIONS = [0, 10, 25, 50, 75, 90, 100];

const parseEstimatedTime = (minutes: number | undefined): { value: number; unit: string } => {
  if (!minutes) return { value: 0, unit: 'min' };
  if (minutes >= 2400 && minutes % 2400 === 0) return { value: minutes / 2400, unit: 'week' };
  if (minutes >= 480 && minutes % 480 === 0) return { value: minutes / 480, unit: 'day' };
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: 'hour' };
  return { value: minutes, unit: 'min' };
};

const formatEstimatedTime = (minutes: number) => {
  if (!minutes) return '';
  if (minutes >= 2400 && minutes % 2400 === 0) return `${minutes / 2400}w`;
  if (minutes >= 480 && minutes % 480 === 0) return `${minutes / 480}d`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
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
  const [activeTab, setActiveTab] = useState<'comments' | 'files'>('comments');

  const subtasks: Subtask[] = (() => {
    if (!task?.subtasks) return [];
    if (Array.isArray(task.subtasks)) return task.subtasks as Subtask[];
    return [];
  })();

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const hasIncompleteSubtasks = subtasks.some(s => !s.completed);

  const selectedProject = projects.find(p => p.id === task?.projectId);
  const projectAreas = selectedProject?.areaIds
    ?.map(areaId => areas.find(a => a.id === areaId))
    .filter(Boolean) || [];

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
    onTaskUpdate(task.id, { howToLink: sopUrl || undefined });
    setSopPopoverOpen(false);
  };

  const handleSopRemove = () => {
    if (!task) return;
    onTaskUpdate(task.id, { howToLink: undefined });
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

  const formatDate = (date: Date | undefined) => {
    if (!date) return null;
    try {
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

  // Create a dummy user for comment avatar
  const dummyUser: User = { id: 'current', name: 'You', email: '', role: 'staff' };

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
                        placeholder="What needs to get done?"
                        className="text-xl font-semibold leading-tight"
                      />
                      {task.isRecurring && (
                        <Repeat className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <Popover open={sopPopoverOpen} onOpenChange={setSopPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={task.howToLink ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 gap-1.5 shrink-0",
                              !task.howToLink && "text-muted-foreground border-dashed"
                            )}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {task.howToLink ? "SOP" : <Plus className="w-3 h-3" />}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                          <div className="space-y-3">
                            <Input value={sopUrl} onChange={(e) => setSopUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={handleSopSave} className="flex-1">Save</Button>
                              {task.howToLink && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => window.open(task.howToLink!, '_blank')}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={handleSopRemove} className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="mt-2">
                      <EditableText
                        value={task.description || ""}
                        onSave={(value) => onTaskUpdate(task.id, { description: value })}
                        placeholder="Add helpful details..."
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

              {/* Comments & Files Tabs */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-1 px-6 pt-3 border-b border-border/30">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                      activeTab === 'comments' 
                        ? "border-muted-foreground/50 text-foreground" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Comments
                    {task.comments && task.comments.length > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{task.comments.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                      activeTab === 'files' 
                        ? "border-muted-foreground/50 text-foreground" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <File className="w-4 h-4" />
                    Files
                    {task.attachments && task.attachments.length > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{task.attachments.length}</span>
                    )}
                  </button>
                </div>

                <div className="flex-1 px-6 py-4 overflow-y-auto">
                  {activeTab === 'comments' ? (
                    <>
                      {/* Comments list */}
                      <div className="space-y-3 mb-4">
                        {(!task.comments || task.comments.length === 0) ? (
                          <p className="text-sm text-muted-foreground/60 italic">No comments yet</p>
                        ) : (
                          task.comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <UserAvatar user={comment.author} size="sm" showTooltip={false} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{comment.author.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                                <p className="text-sm mt-0.5">{comment.content}</p>
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {comment.attachments.map((file) => (
                                      <a 
                                        key={file.id} 
                                        href={file.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs hover:bg-muted/80"
                                      >
                                        <Paperclip className="w-3 h-3" />
                                        {file.name}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment input */}
                      <div className="flex items-start gap-3">
                        <UserAvatar user={dummyUser} size="sm" showTooltip={false} />
                        <div className="flex-1 relative">
                          <Textarea 
                            value={newComment} 
                            onChange={(e) => setNewComment(e.target.value)} 
                            placeholder="Write a comment... Use @ to mention someone" 
                            className="min-h-[80px] pr-20 resize-none text-sm" 
                          />
                          <div className="absolute bottom-2 right-2 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Paperclip className="w-4 h-4" />
                            </Button>
                            <Button size="icon" className="h-7 w-7" disabled={!newComment.trim()}>
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Files tab - shows all attachments from comments */
                    <div>
                      {(() => {
                        // Collect all files from comments
                        const allFiles = (task.comments || []).flatMap(c => c.attachments || []);
                        const taskFiles = task.attachments || [];
                        const combinedFiles = [...taskFiles, ...allFiles];
                        
                        if (combinedFiles.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <File className="w-8 h-8 text-muted-foreground/40 mb-2" />
                              <p className="text-sm text-muted-foreground/60">No files yet</p>
                              <p className="text-xs text-muted-foreground/40 mt-1">
                                Attach files through comments
                              </p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            {combinedFiles.map((file) => (
                              <a
                                key={file.id}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-[280px] border-l border-border/40 bg-muted/20 overflow-y-auto shrink-0">
              <div className="p-4">
                {/* STATUS & PRIORITY */}
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 px-3">Status & Priority</p>
                  <div className="space-y-0.5">
                    {/* Stage */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                          <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${getStatusColor(task.status)}20`, color: getStatusColor(task.status) }}>{getStatusLabel(task.status)}</Badge>
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

                    {/* Due Date - click to reveal NLP input */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1">{formatDate(task.dueDate) || <span className="text-muted-foreground">No date</span>}</span>
                          {task.isRecurring && <Repeat className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3" align="start">
                        <div className="space-y-3">
                          <NaturalDateInput
                            value={task.dueDate}
                            onChange={(date) => onTaskUpdate(task.id, { dueDate: date })}
                            onRecurrenceChange={(rec) => {
                              if (rec) {
                                onTaskUpdate(task.id, { isRecurring: true, recurrence: rec });
                              }
                            }}
                            placeholder="e.g. next friday, every Monday"
                            className="w-full"
                          />
                          <div className="border-t pt-3">
                            <RecurrenceSettings
                              isRecurring={task.isRecurring || false}
                              onIsRecurringChange={(value) => onTaskUpdate(task.id, { isRecurring: value })}
                              recurrence={task.recurrence}
                              onRecurrenceChange={(recurrence) => onTaskUpdate(task.id, { recurrence })}
                              compact
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Importance */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
                          {task.importance ? (<Badge className={cn("text-xs", IMPORTANCE_OPTIONS.find(i => i.id === task.importance)?.color)}>{IMPORTANCE_OPTIONS.find(i => i.id === task.importance)?.label}</Badge>) : (<span className="text-sm text-muted-foreground">Not set</span>)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                          {IMPORTANCE_OPTIONS.map((imp) => (<button key={imp.id} onClick={() => onTaskUpdate(task.id, { importance: imp.id as 'low' | 'routine' | 'important' | 'critical' })} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.importance === imp.id && "bg-muted")}><span>{imp.label}</span><span className="text-xs text-muted-foreground">{imp.description}</span></button>))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Progress with colorByValue */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <BarChart3 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex items-center gap-2 flex-1">
                            <Progress value={task.progress || 0} colorByValue className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">{task.progress || 0}%</span>
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="grid grid-cols-4 gap-1">
                          {PROGRESS_OPTIONS.map((p) => (<button key={p} onClick={() => onTaskUpdate(task.id, { progress: p })} className={cn("px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.progress === p && "bg-muted")}>{p}%</button>))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* WORKLOAD */}
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 px-3">Workload</p>
                  <div className="space-y-0.5">
                    {/* Est. Time */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">{task.estimatedTime ? formatEstimatedTime(task.estimatedTime) : <span className="text-muted-foreground">Not set</span>}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-3" align="start">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            placeholder="0"
                            defaultValue={parseEstimatedTime(task.estimatedTime).value || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const unit = parseEstimatedTime(task.estimatedTime).unit;
                              const multiplier = TIME_UNITS.find(u => u.value === unit)?.multiplier || 1;
                              onTaskUpdate(task.id, { estimatedTime: val * multiplier });
                            }}
                            className="w-16 h-8 text-sm"
                          />
                          <Select
                            defaultValue={parseEstimatedTime(task.estimatedTime).unit}
                            onValueChange={(unit) => {
                              const val = parseEstimatedTime(task.estimatedTime).value || 1;
                              const multiplier = TIME_UNITS.find(u => u.value === unit)?.multiplier || 1;
                              onTaskUpdate(task.id, { estimatedTime: val * multiplier });
                            }}
                          >
                            <SelectTrigger className="flex-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              {TIME_UNITS.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {task.estimatedTime ? (
                          <button
                            onClick={() => onTaskUpdate(task.id, { estimatedTime: undefined })}
                            className="text-xs text-muted-foreground hover:text-destructive mt-2"
                          >
                            Clear
                          </button>
                        ) : null}
                      </PopoverContent>
                    </Popover>

                    {/* Effort */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <Gauge className="w-4 h-4 text-muted-foreground shrink-0" />
                          {task.effort ? (<Badge className={cn("text-xs", EFFORT_OPTIONS.find(e => e.id === task.effort)?.color)}>{EFFORT_OPTIONS.find(e => e.id === task.effort)?.label}</Badge>) : (<span className="text-sm text-muted-foreground">Not set</span>)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                          {EFFORT_OPTIONS.map((effort) => (<button key={effort.id} onClick={() => onTaskUpdate(task.id, { effort: effort.id as 'easy' | 'light' | 'focused' | 'deep' })} className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.effort === effort.id && "bg-muted")}><span>{effort.label}</span><span className="text-xs text-muted-foreground">{effort.description}</span></button>))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* CONTEXT */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 px-3">Context</p>
                  <div className="space-y-0.5">
                    {/* Project */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                          {selectedProject ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color || '#6b7280' }} />
                              <span className="text-sm truncate">{selectedProject.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                          <button onClick={() => onTaskUpdate(task.id, { projectId: undefined })} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted", !task.projectId && "bg-muted")}>No Project</button>
                          {projects.map((project) => (
                            <button key={project.id} onClick={() => onTaskUpdate(task.id, { projectId: project.id })} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted", task.projectId === project.id && "bg-muted")}>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#6b7280' }} />
                              {project.name}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Areas */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                      {projectAreas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {projectAreas.map((area) => area && (<Badge key={area.id} variant="secondary" className="text-xs" style={{ backgroundColor: `${area.color}15`, color: area.color }}>{area.name}</Badge>))}
                        </div>
                      ) : (<span className="text-sm text-muted-foreground">No areas</span>)}
                    </div>

                    {/* Responsible */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                          <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                          {task.assignees && task.assignees.length > 0 ? (
                            <UserAvatarGroup users={task.assignees} max={3} size="xs" />
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start">
                        <SearchableAssigneeSelect 
                          members={projectMembers} 
                          selectedAssignees={task.assignees || []} 
                          onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })} 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
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