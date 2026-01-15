import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Task, User, TaskComment, TaskAttachment, CommentReaction, Subtask } from "@/types";
import { getProgressColor } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserAvatarGroup } from "@/components/ui/user-avatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MessageSquare, 
  Paperclip, 
  Send, 
  FileText, 
  Image, 
  File, 
  Download,
  Trash2,
  Calendar,
  X,
  ThumbsUp,
  Smile,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Plus,
  ListTodo,
  Clock,
  Repeat,
  BookOpen,
  FolderOpen,
  Tag,
  ExternalLink,
  MoreHorizontal,
  GripVertical,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { SearchableAssigneeSelect } from "./SearchableAssigneeSelect";
import { SearchableTagSelect } from "./SearchableTagSelect";
import { NaturalDateInput } from "./NaturalDateInput";
import { RecurrenceSettings } from "./RecurrenceSettings";
import { effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { RecurrenceSettings as RecurrenceSettingsType } from "@/types";

interface StatusItem {
  id: string;
  name: string;
  color: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😄', '🎉', '🚀', '👀', '💯', '🔥'];

interface ProjectOption {
  id: string;
  name: string;
  color: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  projects: ProjectOption[];
  currentUser: User;
  availableMembers: User[];
  statuses: StatusItem[];
  tags: TagItem[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>, parentCommentId?: string) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
  onToggleReaction: (taskId: string, commentId: string, emoji: string) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Inline editable text component
function EditableText({ 
  value, 
  onSave, 
  className = "",
  placeholder = "Click to add...",
  multiline = false,
}: { 
  value: string; 
  onSave: (value: string) => void; 
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
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
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn("w-full min-h-[60px] resize-none bg-transparent border-none outline-none p-0", className)}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={cn("w-full bg-transparent border-none outline-none p-0", className)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn("cursor-text hover:bg-muted/50 rounded px-1 -mx-1 transition-colors", className)}
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
    </div>
  );
}

// Editable subtask component
function EditableSubtask({
  subtask,
  onToggle,
  onUpdate,
  onDelete,
}: {
  subtask: Subtask;
  onToggle: () => void;
  onUpdate: (title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(subtask.title);
  }, [subtask.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== subtask.title) {
      onUpdate(editValue.trim());
    } else {
      setEditValue(subtask.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(subtask.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 group hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-all">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={onToggle}
        className="h-[18px] w-[18px] rounded-full border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            "flex-1 text-sm bg-transparent border-none outline-none",
            subtask.completed && "line-through text-muted-foreground"
          )}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={cn(
            "flex-1 text-sm cursor-text",
            subtask.completed && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>
      )}
      {subtask.assignee && (
        <UserAvatar user={subtask.assignee} className="w-5 h-5 text-[9px]" />
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

interface PendingAttachment {
  file: File;
  preview?: string;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  projects,
  currentUser,
  availableMembers,
  statuses,
  tags,
  onTaskUpdate,
  onAddComment,
  onDeleteComment,
  onToggleReaction,
}: TaskDetailDialogProps) {
  const [newComment, setNewComment] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showSubtaskWarning, setShowSubtaskWarning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'subtasks' | 'comments' | 'files' | null>('subtasks');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  useEffect(() => {
    if (!open) {
      setPendingAttachments([]);
      setNewComment("");
      setShowMentions(false);
      setMentionSearch("");
      setReplyingTo(null);
      setExpandedSection('subtasks');
    }
  }, [open]);

  useEffect(() => {
    setMentionIndex(0);
  }, [filteredMembers.length]);

  if (!task) return null;

  const taskStatus = statuses.find(s => s.id === task.status);
  const taskProject = projects.find(p => p.id === task.projectId);
  const comments = [...(task.comments || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const legacyAttachments = task.attachments || [];
  const commentAttachments = comments.flatMap(c => {
    const mainAttachments = (c.attachments || []).map(a => ({ ...a, commentAuthor: c.author, commentDate: c.createdAt }));
    const replyAttachments = (c.replies || []).flatMap(r => 
      (r.attachments || []).map(a => ({ ...a, commentAuthor: r.author, commentDate: r.createdAt }))
    );
    return [...mainAttachments, ...replyAttachments];
  });
  const allAttachments = [...legacyAttachments.map(a => ({ ...a, commentAuthor: undefined, commentDate: a.uploadedAt })), ...commentAttachments];
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const isDone = task.status === 'done';
  const progressPercent = task.progress || 0;
  const inheritedAreas = task.inheritedAreas || [];

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: new Date(),
    };
    onTaskUpdate(task.id, { subtasks: [...subtasks, newSubtask] });
    setNewSubtaskTitle("");
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onTaskUpdate(task.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.filter(s => s.id !== subtaskId);
    onTaskUpdate(task.id, { subtasks: updatedSubtasks });
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle("");
    }
  };

  const handleStatusChange = (newStatus: string) => {
    const incompleteSubtasks = subtasks.filter(s => !s.completed).length;
    const doneStatus = statuses.find(s => s.id === newStatus);
    const isDoneStatus = doneStatus?.name.toLowerCase().includes('done') || 
                         doneStatus?.name.toLowerCase().includes('complete') ||
                         newStatus === 'done';
    
    if (isDoneStatus && incompleteSubtasks > 0) {
      setPendingStatus(newStatus);
      setShowSubtaskWarning(true);
    } else {
      onTaskUpdate(task.id, { status: newStatus });
      if (isDoneStatus) {
        onOpenChange(false);
      }
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      onTaskUpdate(task.id, { status: pendingStatus });
      setPendingStatus(null);
      onOpenChange(false);
    }
    setShowSubtaskWarning(false);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() && pendingAttachments.length === 0) return;
    const attachmentsToAdd: Omit<TaskAttachment, 'id' | 'uploadedAt'>[] = [];
    
    const processAttachments = async () => {
      for (const pending of pendingAttachments) {
        const url = await readFileAsDataURL(pending.file);
        attachmentsToAdd.push({
          name: pending.file.name,
          type: pending.file.type,
          size: pending.file.size,
          url,
          uploadedBy: currentUser,
        });
      }
      
      onAddComment(task.id, {
        content: newComment.trim(),
        author: currentUser,
        attachments: attachmentsToAdd.length > 0 ? attachmentsToAdd.map((a, i) => ({
          ...a,
          id: `pending-${i}`,
          uploadedAt: new Date(),
        })) : undefined,
      }, replyingTo?.id);
      
      setNewComment("");
      setPendingAttachments([]);
      setReplyingTo(null);
      setTimeout(scrollToBottom, 100);
    };
    
    processAttachments();
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);
    setCursorPosition(cursorPos);

    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }
  };

  const insertMention = (member: User) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition);
    const textAfterCursor = newComment.slice(cursorPosition);
    
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newText = `${beforeMention}@${member.name} ${textAfterCursor}`;
      setNewComment(newText);
      
      const newCursorPos = beforeMention.length + member.name.length + 2;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
    
    setShowMentions(false);
    setMentionSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const renderCommentContent = (content: string) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      const mentionName = match[1];
      const isMember = availableMembers.some(m => 
        m.name.toLowerCase() === mentionName.toLowerCase()
      );
      
      parts.push(
        <span 
          key={match.index} 
          className={isMember ? "text-primary font-medium bg-primary/10 rounded px-1" : ""}
        >
          @{mentionName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPending: PendingAttachment[] = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    
    setPendingAttachments(prev => [...prev, ...newPending]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePending = (index: number) => {
    setPendingAttachments(prev => {
      const item = prev[index];
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDownload = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const effortConfig: Record<string, { color: string }> = {
    easy: { color: '#10b981' },
    light: { color: '#0ea5e9' },
    focused: { color: '#f59e0b' },
    deep: { color: '#ef4444' },
  };

  const importanceConfig: Record<string, { color: string }> = {
    low: { color: '#64748b' },
    routine: { color: '#0ea5e9' },
    important: { color: '#f59e0b' },
    critical: { color: '#ef4444' },
  };

  const toggleSection = (section: 'subtasks' | 'comments' | 'files') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[680px] max-h-[85vh] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl flex flex-col bg-background">
        {/* Header */}
        <div className="p-5 pb-4 shrink-0">
          {/* Title row */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isDone}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleStatusChange('done');
                } else {
                  onTaskUpdate(task.id, { status: 'not-started' });
                }
              }}
              className="mt-1 h-5 w-5 rounded-full border-2 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
            />
            <div className="flex-1 min-w-0">
              <EditableText
                value={task.title}
                onSave={(value) => onTaskUpdate(task.id, { title: value })}
                placeholder="Task name"
                className={cn(
                  "text-lg font-semibold leading-tight",
                  isDone && "line-through text-muted-foreground"
                )}
              />
            </div>
            {task.isRecurring && (
              <Repeat className="w-4 h-4 text-primary/60 mt-1.5 shrink-0" />
            )}
          </div>
          
          {/* Description */}
          <div className="mt-3 pl-8">
            <EditableText
              value={task.description || ""}
              onSave={(value) => onTaskUpdate(task.id, { description: value })}
              placeholder="Add description..."
              multiline
              className="text-sm text-muted-foreground leading-relaxed"
            />
          </div>
        </div>

        {/* Properties section */}
        <div className="px-5 pb-4 space-y-2.5 shrink-0">
          {/* Row 1: Project + Status + Assignees */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Project */}
            <div className="inline-flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Project:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                    taskProject 
                      ? "bg-muted/60 hover:bg-muted text-foreground" 
                      : "border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30"
                  )}>
                    {taskProject ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: taskProject.color }} />
                        <span className="max-w-[120px] truncate">{taskProject.name}</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>None</span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5 z-[70] bg-popover" align="start">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => onTaskUpdate(task.id, { projectId: null })}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                        !task.projectId && "bg-muted"
                      )}
                    >
                      <span className="text-muted-foreground">No Project</span>
                    </button>
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => onTaskUpdate(task.id, { projectId: project.id })}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                          task.projectId === project.id && "bg-muted"
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="inline-flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Stage:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center h-7 px-2.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: taskStatus ? `${taskStatus.color}18` : undefined,
                      color: taskStatus?.color,
                    }}
                  >
                    {taskStatus?.name || task.status}
                  </button>
                </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5 z-[70] bg-popover" align="start">
                <div className="space-y-0.5">
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleStatusChange(s.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                        task.status === s.id && "bg-muted"
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assignees */}
            <div className="inline-flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Responsible:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    {task.assignees && task.assignees.length > 0 ? (
                      <UserAvatarGroup users={task.assignees} max={3} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground border border-dashed border-muted-foreground/30 px-2 py-0.5 rounded">None</span>
                    )}
                  </button>
                </PopoverTrigger>
              <PopoverContent className="w-64 p-3 z-[70] bg-popover" align="start">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsible</span>
                  <SearchableAssigneeSelect
                    members={availableMembers}
                    selectedAssignees={task.assignees || []}
                    onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })}
                    placeholder="Search people..."
                  />
                </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="inline-flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Due:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                    task.dueDate 
                      ? new Date(task.dueDate) < new Date() && task.status !== 'done'
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted/60 hover:bg-muted text-foreground"
                      : "border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30"
                  )}>
                    <Calendar className="w-3.5 h-3.5" />
                    {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "None"}
                  </button>
                </PopoverTrigger>
              <PopoverContent className="w-auto p-3 z-[70] bg-popover" align="start">
                <div className="space-y-3">
                  <NaturalDateInput
                    value={task.dueDate}
                    onChange={(date) => onTaskUpdate(task.id, { dueDate: date })}
                    placeholder="e.g. next friday"
                    className="w-[200px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={task.isRecurring ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (!task.isRecurring) {
                          onTaskUpdate(task.id, { 
                            isRecurring: true, 
                            recurrence: { frequency: 'weekly', interval: 1 } 
                          });
                        }
                      }}
                    >
                      <Repeat className="w-3.5 h-3.5 mr-1.5" />
                      {task.isRecurring ? 'Recurring' : 'Repeat'}
                    </Button>
                  </div>
                </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* SOP */}
            <div className="inline-flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">SOP:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                    task.howToLink 
                      ? "bg-primary/10 text-primary hover:bg-primary/15" 
                      : "border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30"
                  )}>
                    <BookOpen className="w-3.5 h-3.5" />
                    {task.howToLink ? 'Linked' : 'None'}
                  </button>
                </PopoverTrigger>
              <PopoverContent className="w-72 p-3 z-[70] bg-popover" align="start">
                <div className="space-y-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Standard Operating Procedure</span>
                  {task.howToLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{task.howToLink}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => window.open(task.howToLink, '_blank')}
                        >
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => onTaskUpdate(task.id, { howToLink: undefined })}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="url"
                      placeholder="Paste URL..."
                      className="h-9 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          if (target.value.trim()) {
                            onTaskUpdate(task.id, { howToLink: target.value.trim() });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onTaskUpdate(task.id, { howToLink: e.target.value.trim() });
                        }
                      }}
                    />
                  )}
                </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Areas */}
          {(inheritedAreas.length > 0 || (!task.projectId && (task.tags?.length || 0) > 0) || !task.projectId) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Areas:</span>
              {task.projectId ? (
                // Show inherited areas
                inheritedAreas.map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-medium"
                    style={{ 
                      backgroundColor: `${area.color}15`,
                      color: area.color,
                    }}
                  >
                    {area.name}
                  </span>
                ))
              ) : (
                // Area selector for tasks without project
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors">
                      <Tag className="w-3.5 h-3.5" />
                      {(task.tags?.length || 0) > 0 ? `${task.tags?.length} areas` : 'Add areas'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 z-[70] bg-popover" align="start">
                    <SearchableTagSelect
                      tags={tags}
                      selectedTags={task.tags || []}
                      onTagsChange={(newTags) => onTaskUpdate(task.id, { tags: newTags })}
                      placeholder="Search areas..."
                    />
                  </PopoverContent>
                </Popover>
              )}
              {!task.projectId && (task.tags || []).map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tag.id}
                    className="inline-flex items-center h-6 px-2 rounded-md text-[11px] font-medium"
                    style={{ 
                      backgroundColor: `${tag.color}15`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Row 3: Effort, Importance, Est Time, Progress */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Effort */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 py-1 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
                  <span className="text-muted-foreground">Effort:</span>
                  <span 
                    className="font-medium capitalize"
                    style={{ color: task.effort ? effortConfig[task.effort]?.color : undefined }}
                  >
                    {task.effort || '—'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1.5 z-[70] bg-popover" align="start">
                <div className="space-y-0.5">
                  {effortLibrary.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onTaskUpdate(task.id, { effort: e.id as 'easy' | 'light' | 'focused' | 'deep' })}
                      className={cn(
                        "w-full px-2.5 py-2 rounded-md text-sm text-left hover:bg-muted transition-colors",
                        task.effort === e.id && "bg-muted"
                      )}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground/30">•</span>

            {/* Importance */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 py-1 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
                  <span className="text-muted-foreground">Importance:</span>
                  <span 
                    className="font-medium capitalize"
                    style={{ color: task.importance ? importanceConfig[task.importance]?.color : undefined }}
                  >
                    {task.importance || '—'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1.5 z-[70] bg-popover" align="start">
                <div className="space-y-0.5">
                  {importanceLibrary.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => onTaskUpdate(task.id, { importance: i.id as 'low' | 'routine' | 'important' | 'critical' })}
                      className={cn(
                        "w-full px-2.5 py-2 rounded-md text-sm text-left hover:bg-muted transition-colors",
                        task.importance === i.id && "bg-muted"
                      )}
                    >
                      {i.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground/30">•</span>

            {/* Est. Time */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 py-1 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
                  <span className="text-muted-foreground">Est. Time:</span>
                  <span className="font-medium">
                    {task.estimatedTime ? formatEstimatedTime(task.estimatedTime) : '—'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[70] bg-popover" align="start">
                <div className="grid grid-cols-4 gap-1">
                  {[2, 5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 480].map((mins) => (
                    <Button
                      key={mins}
                      variant={task.estimatedTime === mins ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => onTaskUpdate(task.id, { estimatedTime: mins })}
                    >
                      {formatEstimatedTime(mins)}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground/30">•</span>

            {/* Progress */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-1.5 -mx-1.5 transition-colors">
                  <span className="text-muted-foreground">Progress:</span>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden w-12">
                    <div 
                      className={cn("h-full rounded-full transition-all", getProgressColor(progressPercent))}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium">{progressPercent}%</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 z-[70] bg-popover" align="start">
                <div className="flex gap-1 flex-wrap max-w-[220px]">
                  {[0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map((value) => (
                    <Button
                      key={value}
                      variant={progressPercent === value ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-11 text-xs"
                      onClick={() => onTaskUpdate(task.id, { progress: value })}
                    >
                      {value}%
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60 mx-5" />

        {/* Expandable Sections */}
        <div className="flex-1 overflow-y-auto">
          {/* Subtasks Section */}
          <div className="border-b border-border/40">
            <button
              onClick={() => toggleSection('subtasks')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Subtasks</span>
                {subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {completedSubtasks}/{subtasks.length}
                  </span>
                )}
              </div>
              {expandedSection === 'subtasks' ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSection === 'subtasks' && (
              <div className="px-5 pb-4">
                {subtasks.length === 0 && !newSubtaskTitle && (
                  <p className="text-sm text-muted-foreground py-2">No subtasks yet</p>
                )}
                {subtasks.map((subtask) => (
                  <EditableSubtask
                    key={subtask.id}
                    subtask={subtask}
                    onToggle={() => handleToggleSubtask(subtask.id)}
                    onUpdate={(title) => {
                      const updatedSubtasks = subtasks.map(s =>
                        s.id === subtask.id ? { ...s, title } : s
                      );
                      onTaskUpdate(task.id, { subtasks: updatedSubtasks });
                    }}
                    onDelete={() => handleDeleteSubtask(subtask.id)}
                  />
                ))}
                <div className="flex items-center gap-3 mt-2">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={subtaskInputRef}
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    placeholder="Add subtask..."
                    className="h-8 flex-1 border-0 shadow-none bg-transparent px-0 text-sm placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-b border-border/40">
            <button
              onClick={() => toggleSection('comments')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Comments</span>
                {comments.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {comments.length}
                  </span>
                )}
              </div>
              {expandedSection === 'comments' ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSection === 'comments' && (
              <div className="px-5 pb-4">
                {/* Comments list */}
                <div className="space-y-3 mb-4">
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">No comments yet</p>
                  )}
                  {comments.filter(c => !c.parentCommentId).map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start gap-3 group">
                        <UserAvatar user={comment.author} className="w-7 h-7 text-xs shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">{comment.author.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                            {comment.author.id === currentUser.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive ml-auto"
                                onClick={() => onDeleteComment(task.id, comment.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {comment.content && (
                            <p className="text-sm text-foreground/90">{renderCommentContent(comment.content)}</p>
                          )}
                          
                          {/* Attachments */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {comment.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                  onClick={() => handleDownload(attachment)}
                                >
                                  {attachment.type.startsWith('image/') ? (
                                    <img src={attachment.url} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                      {getFileIcon(attachment.type)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate max-w-[80px]">{attachment.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reactions & Actions */}
                          <div className="flex items-center gap-1 mt-1.5">
                            {comment.reactions && comment.reactions.length > 0 && (
                              <div className="flex gap-1 mr-2">
                                {comment.reactions.map((reaction) => {
                                  const hasReacted = reaction.users.some(u => u.id === currentUser.id);
                                  return (
                                    <button
                                      key={reaction.emoji}
                                      onClick={() => onToggleReaction(task.id, comment.id, reaction.emoji)}
                                      className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                                        hasReacted 
                                          ? "bg-primary/10 border-primary/30 text-primary" 
                                          : "bg-muted hover:bg-muted/80 border-transparent"
                                      )}
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span>{reaction.users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => onToggleReaction(task.id, comment.id, '👍')}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                                  <Smile className="w-3 h-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2 z-[80] bg-popover" align="start">
                                <div className="flex gap-1">
                                  {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => onToggleReaction(task.id, comment.id, emoji)}
                                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setReplyingTo(comment);
                                textareaRef.current?.focus();
                              }}
                            >
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-10 space-y-2 border-l-2 border-muted pl-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2 group">
                              <UserAvatar user={reply.author} className="w-6 h-6 text-[10px] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium">{reply.author.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/90">{renderCommentContent(reply.content)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>

                {/* Comment Input */}
                <div className="relative">
                  {replyingTo && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <CornerDownRight className="w-3 h-3" />
                      <span>Replying to {replyingTo.author.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
                    <Textarea
                      ref={textareaRef}
                      value={newComment}
                      onChange={handleCommentChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Write a comment... @ to mention"
                      className="min-h-[80px] border-0 bg-transparent resize-none pr-16"
                    />
                    
                    {/* Mention suggestions */}
                    {showMentions && filteredMembers.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 w-full max-w-[220px] bg-popover border rounded-lg shadow-lg z-[80] overflow-hidden">
                        {filteredMembers.map((member, index) => (
                          <button
                            key={member.id}
                            onClick={() => insertMention(member)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors",
                              index === mentionIndex && "bg-muted"
                            )}
                          >
                            <UserAvatar user={member} className="w-5 h-5 text-[10px]" />
                            {member.name}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() && pendingAttachments.length === 0}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Pending attachments */}
                  {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pendingAttachments.map((pending, index) => (
                        <div key={index} className="relative group">
                          {pending.preview ? (
                            <img 
                              src={pending.preview} 
                              alt={pending.file.name}
                              className="w-12 h-12 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center">
                              {getFileIcon(pending.file.type)}
                            </div>
                          )}
                          <button
                            onClick={() => handleRemovePending(index)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Files Section */}
          <div>
            <button
              onClick={() => toggleSection('files')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Files</span>
                {allAttachments.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {allAttachments.length}
                  </span>
                )}
              </div>
              {expandedSection === 'files' ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSection === 'files' && (
              <div className="px-5 pb-4">
                {allAttachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No files attached</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {allAttachments.map((attachment, index) => (
                      <div
                        key={`${attachment.id}-${index}`}
                        className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleDownload(attachment)}
                      >
                        {attachment.type.startsWith('image/') ? (
                          <div className="aspect-square">
                            <img 
                              src={attachment.url} 
                              alt={attachment.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square flex items-center justify-center bg-muted/30">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              {getFileIcon(attachment.type)}
                            </div>
                          </div>
                        )}
                        <div className="p-2 border-t">
                          <p className="text-[11px] font-medium truncate">{attachment.name}</p>
                        </div>
                        <button
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(attachment);
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Subtask Warning Dialog */}
    <AlertDialog open={showSubtaskWarning} onOpenChange={setShowSubtaskWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete with Incomplete Subtasks?</AlertDialogTitle>
          <AlertDialogDescription>
            This task has {subtasks.filter(s => !s.completed).length} incomplete subtask(s). 
            Are you sure you want to mark it as complete?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmStatusChange}>Complete Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
