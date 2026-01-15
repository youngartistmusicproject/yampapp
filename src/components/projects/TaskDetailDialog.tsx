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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'files'>('subtasks');
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
      setActiveTab('subtasks');
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
  const inheritedAreas = task.inheritedAreas || [];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[900px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-xl flex flex-col">
        {/* Header Row - Table-like layout */}
        <div className="px-4 py-3 border-b border-border/50 shrink-0">
          {/* Main row */}
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isDone}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleStatusChange('done');
                } else {
                  onTaskUpdate(task.id, { status: 'not-started' });
                }
              }}
              className="shrink-0 border-muted-foreground/40"
            />
            
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <EditableText
                value={task.title}
                onSave={(value) => onTaskUpdate(task.id, { title: value })}
                placeholder="What needs to get done?"
                className={cn(
                  "text-[14px] font-medium",
                  isDone && "line-through text-muted-foreground"
                )}
              />
              {task.isRecurring && (
                <Repeat className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              )}
              {comments.length > 0 && (
                <span className="flex items-center gap-0.5 text-muted-foreground/60">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{comments.length}</span>
                </span>
              )}
              {allAttachments.length > 0 && (
                <span className="flex items-center gap-0.5 text-muted-foreground/60">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{allAttachments.length}</span>
                </span>
              )}
              {/* SOP indicator */}
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors",
                      task.howToLink 
                        ? "text-primary bg-primary/10 hover:bg-primary/20" 
                        : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {!task.howToLink && <Plus className="w-2.5 h-2.5" />}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-popover z-[70]" align="start">
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

            {/* Right side - Status, Assignees, Due Date */}
            <div className="flex items-center gap-2 flex-shrink-0 pr-8">
              {/* Status Badge */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="text-[11px] font-medium px-2 py-1 rounded min-w-[70px] text-center truncate"
                    style={{
                      backgroundColor: taskStatus ? `${taskStatus.color}15` : undefined,
                      color: taskStatus?.color,
                    }}
                  >
                    {taskStatus?.name || task.status}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 z-[70]" align="end">
                  <div className="space-y-1">
                    {statuses.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleStatusChange(s.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                          task.status === s.id && "bg-muted"
                        )}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Assignees */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center">
                    <UserAvatarGroup users={task.assignees} max={2} size="sm" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 z-[70]" align="end">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Responsible</span>
                    <SearchableAssigneeSelect
                      members={availableMembers}
                      selectedAssignees={task.assignees || []}
                      onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })}
                      placeholder="Add responsible..."
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Due Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "text-[12px] min-w-[60px] text-right",
                    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' 
                      ? 'text-destructive font-medium' 
                      : 'text-muted-foreground'
                  )}>
                    {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 z-[70]" align="end">
                  <div className="space-y-2">
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
                        {task.isRecurring ? 'Recurring' : 'Make Recurring'}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description row */}
          {(task.description || true) && (
            <div className="mt-2 pl-7">
              <EditableText
                value={task.description || ""}
                onSave={(value) => onTaskUpdate(task.id, { description: value })}
                placeholder="Add description..."
                multiline
                className="text-sm text-muted-foreground"
              />
            </div>
          )}
        </div>

        {/* Properties Bar - Horizontal strip */}
        <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30 shrink-0">
          <div className="flex items-center gap-4 flex-wrap text-[12px]">
            {/* Project */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 hover:bg-muted rounded px-1.5 py-0.5 transition-colors">
                  {taskProject ? (
                    <>
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: taskProject.color }}
                      />
                      <span className="truncate max-w-[100px]">{taskProject.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No Project</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[70]" align="start">
                <div className="space-y-1">
                  <button
                    onClick={() => onTaskUpdate(task.id, { projectId: null })}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
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
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                        task.projectId === project.id && "bg-muted"
                      )}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Areas */}
            {(inheritedAreas.length > 0 || (!task.projectId && (task.tags?.length || 0) > 0)) && (
              <div className="flex items-center gap-1">
                {(task.projectId ? inheritedAreas : (task.tags || []).map(tagId => tags.find(t => t.id === tagId)).filter(Boolean)).slice(0, 2).map((area: any) => (
                  <span
                    key={area.id}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ 
                      backgroundColor: `${area.color}15`,
                      color: area.color,
                    }}
                  >
                    {area.name}
                  </span>
                ))}
                {(task.projectId ? inheritedAreas : (task.tags || []).map(tagId => tags.find(t => t.id === tagId)).filter(Boolean)).length > 2 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{(task.projectId ? inheritedAreas.length : (task.tags || []).length) - 2}
                  </span>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="h-4 w-px bg-border" />

            {/* Effort */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:bg-muted rounded px-1.5 py-0.5 transition-colors">
                  <span className="text-muted-foreground">Effort:</span>
                  <span className={cn(
                    "font-medium capitalize",
                    task.effort && effortConfig[task.effort]?.text
                  )}>
                    {task.effort || '—'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 z-[70]" align="start">
                <div className="space-y-1">
                  {effortLibrary.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onTaskUpdate(task.id, { effort: e.id as 'easy' | 'light' | 'focused' | 'deep' })}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                        task.effort === e.id && "bg-muted"
                      )}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Importance */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:bg-muted rounded px-1.5 py-0.5 transition-colors">
                  <span className="text-muted-foreground">Importance:</span>
                  <span className={cn(
                    "font-medium capitalize",
                    task.importance && importanceConfig[task.importance]?.text
                  )}>
                    {task.importance || '—'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 z-[70]" align="start">
                <div className="space-y-1">
                  {importanceLibrary.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => onTaskUpdate(task.id, { importance: i.id as 'low' | 'routine' | 'important' | 'critical' })}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                        task.importance === i.id && "bg-muted"
                      )}
                    >
                      {i.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Est. Time */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:bg-muted rounded px-1.5 py-0.5 transition-colors">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">
                    {task.estimatedTime ? formatEstimatedTime(task.estimatedTime) : '—'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 z-[70]" align="start">
                <div className="grid grid-cols-3 gap-1">
                  {[2, 5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 480].map((mins) => (
                    <Button
                      key={mins}
                      variant={task.estimatedTime === mins ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onTaskUpdate(task.id, { estimatedTime: mins })}
                    >
                      {formatEstimatedTime(mins)}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Progress Bar */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-muted rounded px-1.5 py-0.5 transition-colors min-w-[100px]">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${getProgressColor(progressPercent)}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium w-7 text-right">{progressPercent}%</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 z-[70]" align="end">
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
        </div>

        {/* Full-width Tabs for Subtasks, Comments, Files */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-4 h-10 shrink-0">
              <TabsTrigger value="subtasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
                <ListTodo className="w-4 h-4" />
                Subtasks
                {subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedSubtasks}/{subtasks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
                {comments.length > 0 && (
                  <span className="text-xs text-muted-foreground">{comments.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
                <Paperclip className="w-4 h-4" />
                Files
                {allAttachments.length > 0 && (
                  <span className="text-xs text-muted-foreground">{allAttachments.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Subtasks Tab */}
            <TabsContent value="subtasks" className="flex-1 overflow-y-auto p-4 mt-0 border-0">
              <div className="space-y-0.5">
                {subtasks.length === 0 && !newSubtaskTitle && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ListTodo className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No subtasks yet</p>
                    <p className="text-xs text-muted-foreground/60">Break down this task into smaller steps</p>
                  </div>
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
                {/* Add subtask input - always visible */}
                <div className="flex items-center gap-2 py-1.5 mt-2">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={subtaskInputRef}
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    placeholder="Add subtask..."
                    className="h-8 text-sm flex-1 border-none shadow-none bg-transparent px-0"
                  />
                  {newSubtaskTitle.trim() && (
                    <Button size="sm" className="h-7 px-3 text-xs" onClick={handleAddSubtask}>
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 mt-0 border-0">
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
                    <div className="bg-muted/30 rounded-lg p-3 group">
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
                                  className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
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
                                        : 'bg-background hover:bg-muted/80 border-transparent'
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
                          <div key={reply.id} className="bg-muted/30 rounded-lg p-3 group">
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
                                              : 'bg-background hover:bg-muted/80 border-transparent'
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
              <div className="p-4 border-t border-border/50 bg-background shrink-0">
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <CornerDownRight className="w-4 h-4" />
                    <span>Replying to {replyingTo.author.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={handleCommentChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a comment... Use @ to mention"
                    className="min-h-[60px] pr-20 resize-none"
                  />
                  
                  {/* Mention suggestions */}
                  {showMentions && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 w-full max-w-[250px] bg-popover border rounded-lg shadow-lg z-[80] max-h-[200px] overflow-y-auto">
                      {filteredMembers.map((member, index) => (
                        <button
                          key={member.id}
                          onClick={() => insertMention(member)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors ${
                            index === mentionIndex ? 'bg-muted' : ''
                          }`}
                        >
                          <UserAvatar user={member} className="w-6 h-6 text-xs" />
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
                            className="w-14 h-14 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded border bg-muted flex items-center justify-center">
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
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 overflow-y-auto p-4 mt-0 border-0">
              {allAttachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Paperclip className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No files attached</p>
                  <p className="text-xs text-muted-foreground/60">Add files through comments</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {allAttachments.map((attachment, index) => (
                    <div
                      key={`${attachment.id}-${index}`}
                      className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
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
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                            {getFileIcon(attachment.type)}
                          </div>
                        </div>
                      )}
                      <div className="p-2 border-t">
                        <p className="text-xs font-medium truncate">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                      </div>
                      <button
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(attachment);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
