import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Task, User, TaskComment, TaskAttachment, CommentReaction, Subtask } from "@/types";
import { getProgressColor } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronRight,
  Plus,
  ListTodo,
  Clock,
  Repeat,
  BookOpen,
  Info,
  Zap,
  Target,
  Users,
  Tag,
  ExternalLink,
  CheckCircle2,
  Circle,
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
          className={`w-full min-h-[60px] resize-none bg-transparent border-none outline-none p-0 ${className}`}
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
        className={`w-full bg-transparent border-none outline-none p-0 ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-muted/30 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors ${className}`}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  );
}

// Editable subtask component - compact version
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
    <div className="flex items-center gap-2 py-1.5 group hover:bg-muted/30 rounded px-2 -mx-2 transition-colors">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={onToggle}
        className="h-4 w-4 rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={`flex-1 text-sm bg-transparent border-none outline-none ${
            subtask.completed ? 'line-through text-muted-foreground' : ''
          }`}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-sm cursor-text ${
            subtask.completed ? 'line-through text-muted-foreground' : ''
          }`}
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
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3" />
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
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activityTab, setActivityTab] = useState<'comments' | 'files'>('comments');
  const [showSubtaskWarning, setShowSubtaskWarning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
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
      setActivityTab('comments');
    }
  }, [open]);

  useEffect(() => {
    setMentionIndex(0);
  }, [filteredMembers.length]);

  if (!task) return null;

  const taskStatus = statuses.find(s => s.id === task.status);
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
    // Check if changing to a "done" status and has incomplete subtasks
    const doneStatus = statuses.find(s => s.id === newStatus);
    const isDoneStatus = doneStatus?.name.toLowerCase().includes('done') || 
                         doneStatus?.name.toLowerCase().includes('complete') ||
                         newStatus === 'done';
    
    if (isDoneStatus && incompleteSubtasks > 0) {
      setPendingStatus(newStatus);
      setShowSubtaskWarning(true);
    } else {
      onTaskUpdate(task.id, { status: newStatus });
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      onTaskUpdate(task.id, { status: pendingStatus });
      setPendingStatus(null);
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

  const effortConfig: Record<string, { bg: string; text: string }> = {
    easy: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    light: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
    focused: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    deep: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  };

  const importanceConfig: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
    routine: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
    important: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    critical: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  };

  const progressPercent = task.progress || 0;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[900px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-xl flex flex-col">
        {/* Header - matches TaskDialog */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1 min-w-0">
              <EditableText
                value={task.title}
                onSave={(value) => onTaskUpdate(task.id, { title: value })}
                placeholder="What needs to get done?"
                className="text-xl font-semibold"
              />
              <EditableText
                value={task.description || ""}
                onSave={(value) => onTaskUpdate(task.id, { description: value })}
                placeholder="Add helpful details..."
                multiline
                className="text-sm text-muted-foreground mt-2"
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Complete Button */}
              <Button
                variant={task.status === 'done' ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 gap-2",
                  task.status === 'done' 
                    ? "bg-green-600 text-white hover:bg-green-700" 
                    : "text-muted-foreground hover:text-green-600 hover:border-green-600"
                )}
                onClick={() => handleStatusChange(task.status === 'done' ? 'not-started' : 'done')}
              >
                {task.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{task.status === 'done' ? 'Completed' : 'Complete'}</span>
              </Button>

              {/* SOP Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={task.howToLink ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 gap-2 shrink-0",
                    task.howToLink 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "text-muted-foreground border-dashed"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">SOP</span>
                  {!task.howToLink && <Plus className="w-3 h-3" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-popover z-[70]" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Standard Operating Procedure</span>
                  </div>
                  {task.howToLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{task.howToLink}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(task.howToLink, '_blank')}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          View SOP
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const newUrl = prompt('Edit SOP URL:', task.howToLink);
                            if (newUrl !== null) {
                              onTaskUpdate(task.id, { howToLink: newUrl.trim() || undefined });
                            }
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onTaskUpdate(task.id, { howToLink: undefined })}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Remove SOP
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://..."
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
                      <p className="text-xs text-muted-foreground">
                        Link to documentation, wiki, or procedure guide
                      </p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            </div>
          </div>
        </div>

        {/* Main content - 2-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] flex-1 min-h-0 overflow-hidden">
          {/* Left side - Properties */}
          <div className="px-6 py-5 border-r border-border/50 overflow-y-auto">
            <div className="space-y-3">
              {/* Project Row */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Project</span>
                <Select 
                  value={task.projectId || '__none__'} 
                  onValueChange={(value) => onTaskUpdate(task.id, { projectId: value === '__none__' ? null : value })}
                >
                  <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent flex-1">
                    {task.projectId ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: projects.find(p => p.id === task.projectId)?.color || '#6b7280' }} 
                        />
                        {projects.find(p => p.id === task.projectId)?.name || 'Unknown Project'}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No Project</span>
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[60]">
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">No Project</span>
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Areas Row - inherited from project or editable if no project */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Areas</span>
                <div className="flex-1">
                  {task.projectId ? (
                    // Project assigned - show inherited areas as read-only badges
                    (() => {
                      const inheritedAreas = task.inheritedAreas || [];
                      return inheritedAreas.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {inheritedAreas.map((area) => (
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
                      selectedTags={task.tags || []}
                      onTagsChange={(tags) => onTaskUpdate(task.id, { tags })}
                      placeholder="Add areas..."
                    />
                  )}
                </div>
              </div>

              {/* Stage Row */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Stage</span>
                <Select value={task.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent flex-1">
                    {taskStatus && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskStatus.color }} />
                        {taskStatus.name}
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[60]">
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date Row */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Due Date</span>
                <div className="flex items-center gap-2 flex-1">
                  <NaturalDateInput
                    value={task.dueDate}
                    onChange={(date) => onTaskUpdate(task.id, { dueDate: date })}
                    onRecurrenceChange={(rec) => {
                      if (rec) {
                        onTaskUpdate(task.id, { isRecurring: true, recurrence: rec });
                      }
                    }}
                    placeholder="e.g. next friday, every Monday"
                    className="flex-1 h-9"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant={task.isRecurring ? "default" : "ghost"}
                        size="icon"
                        className="h-9 w-9 shrink-0"
                      >
                        <Repeat className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-[70] max-h-[400px] overflow-y-auto" align="end">
                      <RecurrenceSettings
                        isRecurring={task.isRecurring || false}
                        onIsRecurringChange={(value) => {
                          if (value && !task.recurrence) {
                            onTaskUpdate(task.id, { 
                              isRecurring: true, 
                              recurrence: { frequency: 'weekly', interval: 1 } 
                            });
                          } else if (!value) {
                            onTaskUpdate(task.id, { isRecurring: false, recurrence: undefined });
                          } else {
                            onTaskUpdate(task.id, { isRecurring: value });
                          }
                        }}
                        recurrence={task.recurrence}
                        onRecurrenceChange={(rec) => onTaskUpdate(task.id, { recurrence: rec })}
                        compact
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {task.isRecurring && task.recurrence && (
                <p className="text-xs text-muted-foreground pl-[124px] -mt-1">
                  {getRecurrenceDescription(task.recurrence)}
                </p>
              )}

              {/* Responsible Row */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Responsible</span>
                <div className="flex-1">
                  <SearchableAssigneeSelect
                    members={availableMembers}
                    selectedAssignees={task.assignees || []}
                    onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })}
                    placeholder="Add..."
                  />
                </div>
              </div>

              {/* Effort Row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <span className="text-sm text-muted-foreground">Effort</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
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
                <Select value={task.effort || ""} onValueChange={(value: Task['effort']) => onTaskUpdate(task.id, { effort: value })}>
                  <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[60]">
                    {effortLibrary.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Importance Row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <span className="text-sm text-muted-foreground">Importance</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
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
                <Select value={task.importance || ""} onValueChange={(value: Task['importance']) => onTaskUpdate(task.id, { importance: value })}>
                  <SelectTrigger className="h-9 text-sm border-border/50 bg-transparent flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[60]">
                    {importanceLibrary.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Progress Row */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Progress</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-3 flex-1">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${getProgressColor(progressPercent)}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-10">{progressPercent}%</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3 z-[70]" align="start">
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {[0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map((value) => (
                        <Button
                          key={value}
                          variant={progressPercent === value ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 w-10 text-xs"
                          onClick={() => onTaskUpdate(task.id, { progress: value })}
                        >
                          {value}%
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Subtasks Section */}
              <div className="pt-4 border-t border-border/50">
                <Collapsible open={subtasksOpen} onOpenChange={setSubtasksOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full group">
                      <div className="flex items-center gap-2">
                        {subtasksOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <ListTodo className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Subtasks</span>
                        {subtasks.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {completedSubtasks}/{subtasks.length}
                          </span>
                        )}
                      </div>
                      {subtasks.length > 0 && (
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                          />
                        </div>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-3">
                    <div className="space-y-0.5">
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

                      {/* Add subtask input */}
                      <div className="flex items-center gap-2 py-1.5">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        <Input
                          ref={subtaskInputRef}
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={handleSubtaskKeyDown}
                          placeholder="Add subtask..."
                          className="h-7 text-sm flex-1 border-none shadow-none bg-transparent px-0"
                        />
                        {newSubtaskTitle.trim() && (
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={handleAddSubtask}>
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>

          {/* Right side - Activity */}
          <div className="flex flex-col min-h-0 h-full bg-muted/20 overflow-hidden">
            {/* Tabs */}
            <div className="px-4 py-3 border-b border-border/50 shrink-0">
              <div className="flex gap-1">
                <button
                  onClick={() => setActivityTab('comments')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activityTab === 'comments' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Comments
                  {comments.length > 0 && (
                    <span className="text-xs opacity-60">{comments.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActivityTab('files')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activityTab === 'files' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                  Files
                  {allAttachments.length > 0 && (
                    <span className="text-xs opacity-60">{allAttachments.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Comments Tab */}
            {activityTab === 'comments' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {comments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                      <p className="text-xs text-muted-foreground/60">Start the conversation</p>
                    </div>
                  )}
                  {comments.filter(c => !c.parentCommentId).map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      {/* Comment Card */}
                      <div className="bg-background rounded-lg p-3 group shadow-sm">
                        <div className="flex items-start gap-3">
                          <UserAvatar user={comment.author} className="w-7 h-7 text-xs flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
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
                              <p className="text-sm whitespace-pre-wrap">{renderCommentContent(comment.content)}</p>
                            )}
                            
                            {/* Attachments */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {comment.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center gap-2 p-2 rounded border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => handleDownload(attachment)}
                                  >
                                    {attachment.type.startsWith('image/') ? (
                                      <img src={attachment.url} alt={attachment.name} className="w-12 h-12 object-cover rounded" />
                                    ) : (
                                      <>
                                        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                                          {getFileIcon(attachment.type)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-medium truncate max-w-[80px]">{attachment.name}</p>
                                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reactions */}
                            {comment.reactions && comment.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {comment.reactions.map((reaction) => {
                                  const hasReacted = reaction.users.some(u => u.id === currentUser.id);
                                  return (
                                    <button
                                      key={reaction.emoji}
                                      onClick={() => onToggleReaction(task.id, comment.id, reaction.emoji)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                        hasReacted 
                                          ? 'bg-primary/10 border-primary/30 text-primary' 
                                          : 'bg-muted hover:bg-muted/80 border-transparent'
                                      }`}
                                      title={reaction.users.map(u => u.name).join(', ')}
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span>{reaction.users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1 mt-2 -ml-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onToggleReaction(task.id, comment.id, '👍')}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                                    <Smile className="w-3.5 h-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" align="start">
                                  <div className="flex gap-1">
                                    {QUICK_REACTIONS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => onToggleReaction(task.id, comment.id, emoji)}
                                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
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
                              {comment.replies && comment.replies.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-8 space-y-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-background rounded-lg p-3 group shadow-sm">
                              <div className="flex items-start gap-3">
                                <UserAvatar user={reply.author} className="w-6 h-6 text-xs flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">{reply.author.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                    </span>
                                    {reply.author.id === currentUser.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive ml-auto"
                                        onClick={() => onDeleteComment(task.id, reply.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                  {reply.content && (
                                    <p className="text-sm whitespace-pre-wrap">{renderCommentContent(reply.content)}</p>
                                  )}
                                  {reply.reactions && reply.reactions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {reply.reactions.map((reaction) => {
                                        const hasReacted = reaction.users.some(u => u.id === currentUser.id);
                                        return (
                                          <button
                                            key={reaction.emoji}
                                            onClick={() => onToggleReaction(task.id, reply.id, reaction.emoji)}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                              hasReacted 
                                                ? 'bg-primary/10 border-primary/30 text-primary' 
                                                : 'bg-muted hover:bg-muted/80 border-transparent'
                                            }`}
                                          >
                                            <span>{reaction.emoji}</span>
                                            <span>{reaction.users.length}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-2 -ml-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      onClick={() => onToggleReaction(task.id, reply.id, '👍')}
                                    >
                                      <ThumbsUp className="w-3 h-3" />
                                    </Button>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                                          <Smile className="w-3 h-3" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-2" align="start">
                                        <div className="flex gap-1">
                                          {QUICK_REACTIONS.map((emoji) => (
                                            <button
                                              key={emoji}
                                              onClick={() => onToggleReaction(task.id, reply.id, emoji)}
                                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
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
                <div className="p-4 border-t border-border/40 bg-background space-y-2">
                  {replyingTo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                      <CornerDownRight className="w-3 h-3" />
                      <span>Replying to <span className="font-medium text-foreground">{replyingTo.author.name}</span></span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => setReplyingTo(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <UserAvatar user={currentUser} className="w-7 h-7 text-xs flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="relative">
                        <Textarea
                          ref={textareaRef}
                          placeholder={replyingTo ? `Reply to ${replyingTo.author.name}...` : "Write a comment... Use @ to mention"}
                          value={newComment}
                          onChange={handleCommentChange}
                          onKeyDown={handleKeyDown}
                          className="min-h-[50px] resize-none text-sm pr-20 bg-muted/30 border-border/50"
                          rows={2}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => fileInputRef.current?.click()} type="button">
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Button onClick={handleSubmitComment} disabled={!newComment.trim() && pendingAttachments.length === 0} size="sm" className="h-7 w-7 p-0">
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {showMentions && filteredMembers.length > 0 && (
                          <div className="absolute left-0 bottom-full mb-1 w-full bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {filteredMembers.map((member, index) => (
                              <button
                                key={member.id}
                                type="button"
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors ${
                                  index === mentionIndex ? 'bg-muted' : ''
                                }`}
                                onClick={() => insertMention(member)}
                                onMouseEnter={() => setMentionIndex(index)}
                              >
                                <UserAvatar user={member} className="w-6 h-6 text-xs" />
                                <span className="font-medium">{member.name}</span>
                                {member.role && (
                                  <span className="text-xs text-muted-foreground ml-auto">{member.role}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {pendingAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pendingAttachments.map((pending, index) => (
                            <div key={index} className="flex items-center gap-2 px-2 py-1 rounded bg-secondary text-sm group">
                              {pending.preview ? (
                                <img src={pending.preview} alt={pending.file.name} className="w-6 h-6 object-cover rounded" />
                              ) : (
                                getFileIcon(pending.file.type)
                              )}
                              <span className="max-w-[80px] truncate text-xs">{pending.file.name}</span>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={() => handleRemovePending(index)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Files Tab */}
            {activityTab === 'files' && (
              <div className="flex-1 overflow-y-auto p-4">
                {allAttachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Paperclip className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No files yet</p>
                    <p className="text-xs text-muted-foreground/60">Add files through comments</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => handleDownload(attachment)}
                      >
                        {attachment.type.startsWith('image/') ? (
                          <img src={attachment.url} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                            {getFileIcon(attachment.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(attachment.size)}</span>
                            {attachment.commentAuthor && (
                              <>
                                <span>•</span>
                                <span>by {attachment.commentAuthor.name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{format(new Date(attachment.commentDate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                          <Download className="w-4 h-4" />
                        </Button>
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

    {/* Warning dialog for completing task with unfinished subtasks */}
    <AlertDialog open={showSubtaskWarning} onOpenChange={setShowSubtaskWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Incomplete Subtasks</AlertDialogTitle>
          <AlertDialogDescription>
            This task has {subtasks.filter(s => !s.completed).length} unfinished subtask{subtasks.filter(s => !s.completed).length !== 1 ? 's' : ''}. 
            Are you sure you want to mark this task as complete?
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
