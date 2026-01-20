import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Upload,
  Loader2,
} from "lucide-react";
import { effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { format, parseISO, isValid } from "date-fns";
import type { Task, Project, User, RecurrenceSettings as RecurrenceSettingsType } from "@/types";
import { cn } from "@/lib/utils";
import { triggerConfetti } from "@/lib/confetti";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskComments, useAddTaskComment, useDeleteTaskComment, useUpdateTaskComment, useTaskAttachments, useUploadTaskAttachment, useToggleCommentReaction } from "@/hooks/useTaskComments";
import { MentionInput, renderMentionContent } from "./MentionInput";
import { CommentReactions } from "./CommentReactions";
import { ThreadedComment } from "./ThreadedComment";

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
  onTaskUpdate: (taskId: string, updates: Partial<Task>, bypassSubtaskWarning?: boolean) => void;
  onTaskComplete?: (taskId: string) => void;
  projects: ProjectOption[];
  statuses: StatusOption[];
  availableTags?: string[];
  projectMembers?: User[];
  projectLeads?: User[];
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

// Searchable project select component with auto-close
const ProjectSearchSelect = ({
  projects,
  selectedProjectId,
  onSelect,
}: {
  projects: { id: string; name: string; color: string }[];
  selectedProjectId?: string;
  onSelect: (projectId: string | undefined) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onSelect(undefined);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <span className={cn(!selectedProjectId && "font-medium")}>No Project</span>
                {!selectedProjectId && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    onSelect(project.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: project.color || '#6b7280' }} />
                  <span className={cn(selectedProjectId === project.id && "font-medium")}>{project.name}</span>
                  {selectedProjectId === project.id && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  projectLeads = [],
  areas = [],
}: TaskDetailDialogProps) {
  const { profile } = useAuth();
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [sopPopoverOpen, setSopPopoverOpen] = useState(false);
  const [sopUrl, setSopUrl] = useState("");
  const [activeTab, setActiveTab] = useState<'comments' | 'files'>('comments');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [seenCommentCount, setSeenCommentCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastPostedCommentId, setLastPostedCommentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  
  // Hooks for comments and attachments
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(task?.id || null);
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(task?.id || null);
  const addComment = useAddTaskComment();
  const deleteComment = useDeleteTaskComment();
  const updateComment = useUpdateTaskComment();
  const uploadAttachment = useUploadTaskAttachment();
  const toggleReaction = useToggleCommentReaction();
  
  // Calculate new comments since last seen
  const newCommentCount = comments.length - seenCommentCount;
  
  // Check if element is visible in the scroll container
  const isElementVisible = (element: HTMLElement | null) => {
    if (!element || !commentsContainerRef.current) return false;
    const container = commentsContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
  };
  
  // Scroll to bottom of comments only if not already visible
  const scrollToBottomIfNeeded = () => {
    // Wait for DOM to update, then check if bottom is visible
    requestAnimationFrame(() => {
      if (commentsEndRef.current && !isElementVisible(commentsEndRef.current)) {
        commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      setSeenCommentCount(comments.length);
      setIsAtBottom(true);
    });
  };
  
  // Force scroll to bottom (for initial load)
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setSeenCommentCount(comments.length);
    setIsAtBottom(true);
  };
  
  // Handle scroll to detect if user is at bottom
  const handleCommentsScroll = () => {
    if (!commentsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = commentsContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setSeenCommentCount(comments.length);
    }
  };
  
  // Initialize seen count when dialog opens or task changes
  useEffect(() => {
    if (open && task) {
      setSeenCommentCount(comments.length);
      // Scroll to bottom on initial open
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [open, task?.id]);
  
  // Auto-scroll when user is at bottom and new comments arrive (from others)
  useEffect(() => {
    // Only auto-scroll if we're at bottom AND there's no pending scroll to a specific comment
    if (isAtBottom && comments.length > 0 && !lastPostedCommentId) {
      requestAnimationFrame(() => {
        scrollToBottomIfNeeded();
      });
    }
  }, [comments.length]);
  
  // Scroll to the specific comment that was just posted
  useEffect(() => {
    if (lastPostedCommentId && commentsContainerRef.current) {
      // Wait for DOM to update with the new comment
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const commentElement = commentsContainerRef.current?.querySelector(
            `[data-comment-id="${lastPostedCommentId}"]`
          );
          if (commentElement) {
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setLastPostedCommentId(null);
          setSeenCommentCount(comments.length);
          setIsAtBottom(true);
        });
      });
    }
  }, [lastPostedCommentId, comments]);

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
    
  // Current user for comment avatar
  const currentUser: User = profile 
    ? { id: profile.id, name: `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`, email: profile.email || '', role: 'staff' as const }
    : { id: 'current', name: 'You', email: '', role: 'staff' as const };

  const handleComplete = () => {
    if (!task) return;
    if (hasIncompleteSubtasks) {
      setShowIncompleteWarning(true);
    } else {
      completeTask();
    }
  };

  const completeTask = (bypassWarning = false) => {
    if (!task) return;
    triggerConfetti();
    if (onTaskComplete) {
      onTaskComplete(task.id);
    } else {
      // Use onTaskUpdate with bypass flag to prevent parent warning from triggering
      onTaskUpdate(task.id, { 
        status: 'done', 
        completedAt: new Date() 
      }, bypassWarning);
    }
    onOpenChange(false);
  };

  const handleConfirmComplete = () => {
    if (!task) return;
    setShowIncompleteWarning(false);
    completeTask(true); // Pass true to bypass parent's subtask warning
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

  const handleAddComment = async () => {
    if (!task || (!newComment.trim() && pendingFiles.length === 0)) return;
    
    try {
      const newCommentData = await addComment.mutateAsync({
        taskId: task.id,
        content: newComment.trim() || '(file attachment)',
        files: pendingFiles.length > 0 ? pendingFiles : undefined,
      });
      setNewComment("");
      setPendingFiles([]);
      // Set the ID of the newly posted comment to scroll to it
      setLastPostedCommentId(newCommentData.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;
    try {
      await deleteComment.mutateAsync({ taskId: task.id, commentId });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setPendingFiles(prev => [...prev, ...Array.from(files)]);
    }
    e.target.value = '';
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    const files = e.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        try {
          await uploadAttachment.mutateAsync({ taskId: task.id, file });
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    }
    e.target.value = '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          // Mobile: Full-height bottom sheet
          "max-sm:h-[95vh] max-sm:max-h-[95vh] max-sm:p-0 max-sm:pb-0 max-sm:gap-0",
          // Desktop: Centered large modal  
          "sm:max-w-[900px] sm:max-h-[85vh] sm:p-0 sm:gap-0 sm:rounded-xl",
          // Shared styles
          "w-full overflow-hidden border shadow-xl flex flex-col bg-background"
        )}>
          <div className="flex flex-col sm:flex-row flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                <div className="p-4 sm:p-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <CircularCheckbox 
                      checked={!!task.completedAt}
                      onCheckedChange={handleComplete}
                    />
                  </div>
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
                      <CircularCheckbox checked={subtask.completed} onCheckedChange={() => handleSubtaskToggle(subtask.id)} size="sm" />
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
                    {comments.length > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{comments.length}</span>
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
                    {attachments.length > 0 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{attachments.length}</span>
                    )}
                  </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
                  {activeTab === 'comments' ? (
                    <>
                      {/* New comments indicator */}
                      {newCommentCount > 0 && !isAtBottom && (
                        <button
                          onClick={scrollToBottom}
                          className="mb-2 mx-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium shadow-md hover:bg-primary/90 transition-colors animate-in slide-in-from-top-2"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {newCommentCount} new {newCommentCount === 1 ? 'comment' : 'comments'}
                        </button>
                      )}
                      
                      {/* Comments list - scrollable area with newest at bottom */}
                      <div 
                        ref={commentsContainerRef}
                        onScroll={handleCommentsScroll}
                        className="flex-1 overflow-y-auto space-y-3 mb-3"
                      >
                        {commentsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : comments.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground/60 italic">No comments yet</p>
                          </div>
                        ) : (
                          (() => {
                            // Separate top-level comments and replies
                            const topLevelComments = comments.filter(c => !c.parentCommentId);
                            const repliesMap = new Map<string, typeof comments>();
                            comments.forEach(c => {
                              if (c.parentCommentId) {
                                const existing = repliesMap.get(c.parentCommentId) || [];
                                existing.push(c);
                                repliesMap.set(c.parentCommentId, existing);
                              }
                            });

                            return (
                              <>
                                {topLevelComments.map((comment) => (
                                  <ThreadedComment
                                    key={comment.id}
                                    comment={comment}
                                    replies={repliesMap.get(comment.id) || []}
                                    currentUserId={profile?.id}
                                    currentUserName={currentUser.name}
                                    onDelete={handleDeleteComment}
                                    onReply={async (content, parentId, files) => {
                                      if (task) {
                                        const newReply = await addComment.mutateAsync({
                                          taskId: task.id,
                                          content,
                                          parentCommentId: parentId,
                                          files,
                                        });
                                        // Set the ID of the newly posted reply to scroll to it
                                        setLastPostedCommentId(newReply.id);
                                      }
                                    }}
                                    onToggleReaction={(commentId, emoji) => {
                                      if (task) {
                                        toggleReaction.mutate({ taskId: task.id, commentId, emoji });
                                      }
                                    }}
                                    onEdit={async (commentId, content) => {
                                      if (task) {
                                        await updateComment.mutateAsync({
                                          taskId: task.id,
                                          commentId,
                                          content,
                                        });
                                      }
                                    }}
                                  />
                                ))}
                                <div ref={commentsEndRef} />
                              </>
                            );
                          })()
                        )}
                      </div>

                      {/* Fixed comment input at bottom */}
                      <div className="border-t border-border/30 pt-3">
                        {/* Pending files preview */}
                        {pendingFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {pendingFiles.map((file, index) => (
                              <div 
                                key={index}
                                className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="max-w-[100px] truncate">{file.name}</span>
                                <button
                                  onClick={() => handleRemovePendingFile(index)}
                                  className="p-0.5 hover:bg-destructive/20 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comment input */}
                        <div className="flex items-start gap-2">
                          <UserAvatar user={currentUser} size="sm" showTooltip={false} />
                          <div className="flex-1 relative">
                            <MentionInput 
                              value={newComment} 
                              onChange={setNewComment} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment();
                                }
                              }}
                              placeholder={`Commenting as ${currentUser.name}`} 
                              className="min-h-[60px] pr-16 text-sm" 
                            />
                            <input 
                              ref={fileInputRef}
                              type="file" 
                              multiple 
                              className="hidden" 
                              onChange={handleFileSelect}
                            />
                            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                className="h-6 w-6" 
                                disabled={(!newComment.trim() && pendingFiles.length === 0) || addComment.isPending}
                                onClick={handleAddComment}
                              >
                                {addComment.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Files tab - shows all attachments */
                    <div>
                      {attachmentsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : attachments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <File className="w-8 h-8 text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground/60">No files yet</p>
                          <p className="text-xs text-muted-foreground/40 mt-1 mb-3">
                            Attach files through comments or upload directly
                          </p>
                          <input 
                            ref={directFileInputRef}
                            type="file" 
                            multiple 
                            className="hidden" 
                            onChange={handleDirectFileUpload}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => directFileInputRef.current?.click()}
                            disabled={uploadAttachment.isPending}
                          >
                            {uploadAttachment.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload File
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end mb-3">
                            <input 
                              ref={directFileInputRef}
                              type="file" 
                              multiple 
                              className="hidden" 
                              onChange={handleDirectFileUpload}
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => directFileInputRef.current?.click()}
                              disabled={uploadAttachment.isPending}
                            >
                              {uploadAttachment.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              Upload
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {attachments.map((file) => (
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full sm:w-[280px] border-t sm:border-t-0 sm:border-l border-border/40 bg-muted/20 overflow-y-auto shrink-0 max-sm:max-h-[40vh]">
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
                          {task.importance ? (<Badge variant="outline" className={cn("text-xs border-0", IMPORTANCE_OPTIONS.find(i => i.id === task.importance)?.color)}>{IMPORTANCE_OPTIONS.find(i => i.id === task.importance)?.label}</Badge>) : (<span className="text-sm text-muted-foreground">Not set</span>)}
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
                          {task.effort ? (<Badge variant="outline" className={cn("text-xs border-0", EFFORT_OPTIONS.find(e => e.id === task.effort)?.color)}>{EFFORT_OPTIONS.find(e => e.id === task.effort)?.label}</Badge>) : (<span className="text-sm text-muted-foreground">Not set</span>)}
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
                    <ProjectSearchSelect
                      projects={projects}
                      selectedProjectId={task.projectId}
                      onSelect={(projectId) => onTaskUpdate(task.id, { projectId })}
                    />

                    {/* Areas */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                      {task.projectId ? (
                        // Show read-only inherited areas from project
                        projectAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {projectAreas.map((area) => area && (
                              <Badge 
                                key={area.id} 
                                variant="secondary" 
                                className="text-xs cursor-default" 
                                style={{ backgroundColor: `${area.color}15`, color: area.color }}
                              >
                                {area.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (<span className="text-sm text-muted-foreground">No areas</span>)
                      ) : (
                        // Show editable area selector when no project
                        <div className="flex-1">
                          <SearchableTagSelect
                            tags={areas || []}
                            selectedTags={task.tags || []}
                            onTagsChange={(tags) => onTaskUpdate(task.id, { tags })}
                            placeholder="Add areas..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Responsible */}
                    <div className="flex items-center gap-3 px-3 py-2">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <SearchableAssigneeSelect 
                          members={projectMembers} 
                          selectedAssignees={task.assignees || []} 
                          onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })} 
                          placeholder="Unassigned"
                          projectLeads={projectLeads}
                        />
                      </div>
                    </div>
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