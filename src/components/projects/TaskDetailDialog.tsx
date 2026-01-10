import { useState, useRef, useEffect } from "react";
import { Task, User, TaskComment, TaskAttachment, CommentReaction, Subtask } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Dialog,
  DialogContent,
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
  Users,
  Tag,
  AlignLeft,
  X,
  ThumbsUp,
  Smile,
  Reply,
  CornerDownRight,
  ChevronDown,
  ChevronRight,
  Plus,
  ListTodo,
  Clock,
  Repeat,
  Flag,
  Circle,
  BookOpen
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { SearchableAssigneeSelect } from "./SearchableAssigneeSelect";
import { SearchableTagSelect } from "./SearchableTagSelect";
import { tagLibrary } from "@/data/workManagementConfig";

interface StatusItem {
  id: string;
  name: string;
  color: string;
}

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😄', '🎉', '🚀', '👀', '💯', '🔥'];

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  currentUser: User;
  availableMembers: User[];
  statuses: StatusItem[];
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
  inputClassName = ""
}: { 
  value: string; 
  onSave: (value: string) => void; 
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  inputClassName?: string;
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

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
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
          className={`w-full min-h-[80px] resize-none text-sm bg-transparent border-none outline-none focus:outline-none focus:ring-0 ${className} ${inputClassName}`}
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
        className={`w-full bg-transparent border-none outline-none focus:outline-none ${className} ${inputClassName}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors ${className}`}
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
    <div className="flex items-center gap-3 px-3 py-2.5 group hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={`flex-1 text-sm bg-transparent border-none outline-none focus:outline-none ${
            subtask.completed ? 'line-through text-muted-foreground' : ''
          }`}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 ${
            subtask.completed ? 'line-through text-muted-foreground' : ''
          }`}
        >
          {subtask.title}
        </span>
      )}
      {subtask.assignee && (
        <UserAvatar user={subtask.assignee} className="w-5 h-5 text-[10px]" />
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

// Pending attachment type for before submission
interface PendingAttachment {
  file: File;
  preview?: string;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  currentUser,
  availableMembers,
  statuses,
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
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [activityTab, setActivityTab] = useState<'comments' | 'attachments'>('comments');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  // Filter members based on mention search
  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Reset state when dialog closes
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

  // Reset mention index when filtered members change
  useEffect(() => {
    setMentionIndex(0);
  }, [filteredMembers.length]);

  if (!task) return null;

  const taskStatus = statuses.find(s => s.id === task.status);
  // Sort comments oldest first so newest appear at bottom
  const comments = [...(task.comments || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  // Legacy attachments (attached directly to task, not through comments)
  const legacyAttachments = task.attachments || [];
  // Collect all attachments from comments
  const commentAttachments = comments.flatMap(c => {
    const mainAttachments = (c.attachments || []).map(a => ({ ...a, commentAuthor: c.author, commentDate: c.createdAt }));
    const replyAttachments = (c.replies || []).flatMap(r => 
      (r.attachments || []).map(a => ({ ...a, commentAuthor: r.author, commentDate: r.createdAt }))
    );
    return [...mainAttachments, ...replyAttachments];
  });
  const allAttachments = [...legacyAttachments.map(a => ({ ...a, commentAuthor: undefined, commentDate: a.uploadedAt })), ...commentAttachments];
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  // Scroll to bottom of comments
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Subtask handlers
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: new Date(),
    };
    
    onTaskUpdate(task.id, {
      subtasks: [...subtasks, newSubtask],
    });
    
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
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
      setIsAddingSubtask(false);
    }
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() && pendingAttachments.length === 0) return;
    
    // Convert pending attachments to TaskAttachment format
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
      
      // Scroll to bottom after adding comment
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

    // Check for @ mentions
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
    
    // Find the @ symbol position
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newText = `${beforeMention}@${member.name} ${textAfterCursor}`;
      setNewComment(newText);
      
      // Move cursor after the inserted mention
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

  // Render comment content with highlighted mentions
  const renderCommentContent = (content: string) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      // Add the mention with styling
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
    
    // Add remaining text
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

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[90vh] !grid !grid-rows-[auto_1fr] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <EditableText
            value={task.title}
            onSave={(value) => onTaskUpdate(task.id, { title: value })}
            placeholder="Task title"
            className="text-xl font-semibold"
          />
          {task.howToLink ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 mt-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  How To
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-sm"
                    onClick={() => window.open(task.howToLink, '_blank')}
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-2" />
                    Open Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-sm"
                    onClick={() => {
                      const link = prompt("Edit How To link:", task.howToLink);
                      if (link?.trim()) {
                        onTaskUpdate(task.id, { howToLink: link.trim() });
                      }
                    }}
                  >
                    <AlignLeft className="w-3.5 h-3.5 mr-2" />
                    Edit Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8 px-2 text-sm text-destructive hover:text-destructive"
                    onClick={() => onTaskUpdate(task.id, { howToLink: undefined })}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Remove
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 mt-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => {
                const link = prompt("Enter How To link (SOP URL):");
                if (link?.trim()) {
                  onTaskUpdate(task.id, { howToLink: link.trim() });
                }
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add How To
            </Button>
          )}
        </div>

        {/* Main content - two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] min-h-0">
          {/* Left side - Task details */}
          <div className="overflow-y-auto border-r bg-background">
            <div className="p-6 space-y-5">
              {/* Properties as clean rows */}
              <div className="space-y-0">
                {/* Status */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Circle className="w-4 h-4" />
                    <span className="text-sm">Status</span>
                  </div>
                  <Select 
                    value={task.status} 
                    onValueChange={(value) => onTaskUpdate(task.id, { status: value })}
                  >
                    <SelectTrigger className="w-auto h-8 text-sm gap-1.5 border-none shadow-none bg-transparent hover:bg-muted/50">
                      {taskStatus && (
                        <>
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: taskStatus.color }}
                          />
                          {taskStatus.name}
                        </>
                      )}
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
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

                {/* Priority */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Flag className="w-4 h-4" />
                    <span className="text-sm">Priority</span>
                  </div>
                  <Select 
                    value={task.priority} 
                    onValueChange={(value: Task['priority']) => onTaskUpdate(task.id, { priority: value })}
                  >
                    <SelectTrigger className="w-auto h-8 text-sm gap-1 border-none shadow-none bg-transparent hover:bg-muted/50">
                      <Badge className={`${priorityColors[task.priority]} text-xs capitalize`}>
                        {task.priority}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date with Recurring */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Due date</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      value={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
                      onChange={(e) => onTaskUpdate(task.id, { 
                        dueDate: e.target.value ? new Date(e.target.value) : undefined 
                      })}
                      className="h-8 text-sm w-auto border-none shadow-none bg-transparent text-right cursor-pointer hover:bg-muted/50 rounded px-2"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={`h-8 w-8 p-0 ${task.isRecurring ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground`}
                          title={task.isRecurring && task.recurrence 
                            ? `Repeats every ${task.recurrence.interval > 1 ? `${task.recurrence.interval} ` : ''}${task.recurrence.frequency.replace('ly', task.recurrence.interval > 1 ? 's' : '')}`
                            : 'Set recurring'
                          }
                        >
                          <Repeat className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Repeating task</span>
                            <Button
                              variant={task.isRecurring ? "secondary" : "outline"}
                              size="sm"
                              className="h-7"
                              onClick={() => {
                                if (task.isRecurring) {
                                  onTaskUpdate(task.id, { isRecurring: false, recurrence: undefined });
                                } else {
                                  onTaskUpdate(task.id, { 
                                    isRecurring: true, 
                                    recurrence: { frequency: 'weekly', interval: 1 } 
                                  });
                                }
                              }}
                            >
                              {task.isRecurring ? 'On' : 'Off'}
                            </Button>
                          </div>
                          
                          {task.isRecurring && task.recurrence && (
                            <div className="space-y-3 pt-2 border-t">
                              <div className="space-y-2">
                                <span className="text-xs text-muted-foreground">Repeat every</span>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={task.recurrence.interval}
                                    onChange={(e) => onTaskUpdate(task.id, {
                                      recurrence: { ...task.recurrence!, interval: parseInt(e.target.value) || 1 }
                                    })}
                                    className="w-16 h-8"
                                  />
                                  <Select
                                    value={task.recurrence.frequency}
                                    onValueChange={(v) => onTaskUpdate(task.id, {
                                      recurrence: { ...task.recurrence!, frequency: v as any }
                                    })}
                                  >
                                    <SelectTrigger className="flex-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="daily">Day(s)</SelectItem>
                                      <SelectItem value="weekly">Week(s)</SelectItem>
                                      <SelectItem value="monthly">Month(s)</SelectItem>
                                      <SelectItem value="yearly">Year(s)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <span className="text-xs text-muted-foreground">End date (optional)</span>
                                <Input
                                  type="date"
                                  value={task.recurrence.endDate ? format(new Date(task.recurrence.endDate), "yyyy-MM-dd") : ""}
                                  onChange={(e) => onTaskUpdate(task.id, {
                                    recurrence: { 
                                      ...task.recurrence!, 
                                      endDate: e.target.value ? new Date(e.target.value) : undefined 
                                    }
                                  })}
                                  className="h-8"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Estimated time</span>
                  </div>
                  <Select 
                    value={task.estimatedTime?.toString() || ""} 
                    onValueChange={(value) => onTaskUpdate(task.id, { estimatedTime: value ? parseInt(value) : undefined })}
                  >
                    <SelectTrigger className="w-auto h-8 text-sm gap-1 border-none shadow-none bg-transparent hover:bg-muted/50">
                      <SelectValue placeholder="No estimate" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="2">2 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Circle className="w-4 h-4" />
                    <span className="text-sm">Progress</span>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 px-2 text-sm font-normal hover:bg-muted/50 gap-2"
                      >
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{task.progress || 0}%</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <div className="grid grid-cols-4 gap-1">
                        {[0, 10, 20, 30, 40, 50, 60, 70, 75, 80, 90, 100].map((value) => (
                          <Button
                            key={value}
                            variant={(task.progress || 0) === value ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => onTaskUpdate(task.id, { progress: value })}
                          >
                            {value}%
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Assignees */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Assignees</span>
                  </div>
                  <SearchableAssigneeSelect
                    members={availableMembers}
                    selectedAssignees={task.assignees || []}
                    onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })}
                    placeholder="Add..."
                  />
                </div>

                {/* Tags */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm">Tags</span>
                  </div>
                  <SearchableTagSelect
                    tags={tagLibrary}
                    selectedTags={task.tags || []}
                    onTagsChange={(tags) => onTaskUpdate(task.id, { tags })}
                    placeholder="Add..."
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlignLeft className="w-4 h-4" />
                  <span className="text-sm font-medium text-foreground">Description</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 min-h-[80px]">
                  <EditableText
                    value={task.description || ""}
                    onSave={(value) => onTaskUpdate(task.id, { description: value })}
                    placeholder="Add a description..."
                    multiline
                    className="text-sm whitespace-pre-wrap"
                  />
                </div>
              </div>

              {/* Subtasks Section - Collapsible */}
              <div className="space-y-3">
                <Collapsible open={subtasksOpen} onOpenChange={setSubtasksOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left group">
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                        {subtasksOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <ListTodo className="w-4 h-4" />
                        <span className="text-sm font-medium text-foreground">Subtasks</span>
                      </div>
                      {subtasks.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {completedSubtasks} of {subtasks.length}
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-3">
                    {/* Progress bar at top */}
                    {subtasks.length > 0 && (
                      <div className="mb-3">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Subtask list */}
                    <div className="space-y-1 bg-muted/30 rounded-lg overflow-hidden">
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

                      {/* Always visible add subtask input */}
                      <div className="flex items-center gap-3 px-3 py-2 border-t border-border/30">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        <Input
                          ref={subtaskInputRef}
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={handleSubtaskKeyDown}
                          placeholder="Add subtask..."
                          className="h-7 text-sm flex-1 border-none shadow-none bg-transparent focus-visible:ring-0 px-0"
                        />
                        {newSubtaskTitle.trim() && (
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={handleAddSubtask}
                          >
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
          <div className="flex flex-col min-h-0 bg-muted/30">
            <div className="px-4 py-3 border-b bg-background">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActivityTab('comments')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activityTab === 'comments' 
                      ? 'bg-muted text-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Comments
                  {comments.length > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 ml-1">
                      {comments.length}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => setActivityTab('attachments')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activityTab === 'attachments' 
                      ? 'bg-muted text-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                  Attachments
                  {allAttachments.length > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 ml-1">
                      {allAttachments.length}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Comments tab */}
            {activityTab === 'comments' && (
              <>
                {/* Comments list - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity yet. Be the first to comment!
                    </p>
                  )}
                  {comments.filter(c => !c.parentCommentId).map((comment) => (
                <div key={comment.id} className="space-y-2">
                  {/* Main comment card - ClickUp style */}
                  <div className="bg-card border rounded-lg border-l-4 border-l-primary/40 group">
                    {/* Card header with avatar and name */}
                    <div className="flex items-center gap-3 p-3 pb-0">
                      <UserAvatar user={comment.author} className="w-8 h-8 text-xs flex-shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-sm font-semibold">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {comment.author.id === currentUser.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteComment(task.id, comment.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Comment content */}
                    <div className="px-3 py-2">
                      {comment.content && (
                        <p className="text-sm whitespace-pre-wrap">{renderCommentContent(comment.content)}</p>
                      )}
                      
                      {/* Comment attachments */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {comment.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handleDownload(attachment)}
                            >
                              {attachment.type.startsWith('image/') ? (
                                <img 
                                  src={attachment.url} 
                                  alt={attachment.name}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ) : (
                                <>
                                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                    {getFileIcon(attachment.type)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate max-w-[100px]">
                                      {attachment.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(attachment.size)}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions display */}
                      {comment.reactions && comment.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {comment.reactions.map((reaction) => {
                            const hasReacted = reaction.users.some(u => u.id === currentUser.id);
                            return (
                              <button
                                key={reaction.emoji}
                                onClick={() => onToggleReaction(task.id, comment.id, reaction.emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
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
                    </div>
                    
                    {/* Divider and action bar */}
                    <div className="border-t mx-3" />
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onToggleReaction(task.id, comment.id, '👍')}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Smile className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="flex gap-1">
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => onToggleReaction(task.id, comment.id, emoji)}
                                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex items-center gap-2">
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                            <div className="flex -space-x-1">
                              {comment.replies.slice(0, 3).map((reply) => (
                                <UserAvatar 
                                  key={reply.id} 
                                  user={reply.author} 
                                  className="w-5 h-5 text-[10px] border-2 border-card" 
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-sm text-muted-foreground hover:text-foreground"
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
                    <div className="ml-6 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-card border rounded-lg border-l-4 border-l-muted group">
                          {/* Reply header */}
                          <div className="flex items-center gap-2 p-3 pb-0">
                            <UserAvatar user={reply.author} className="w-6 h-6 text-xs flex-shrink-0" />
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-semibold">{reply.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            {reply.author.id === currentUser.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => onDeleteComment(task.id, reply.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Reply content */}
                          <div className="px-3 py-2">
                            {reply.content && (
                              <p className="text-sm whitespace-pre-wrap">{renderCommentContent(reply.content)}</p>
                            )}

                            {/* Reply reactions */}
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

                          {/* Reply action bar */}
                          <div className="border-t mx-3" />
                          <div className="flex items-center px-3 py-1.5">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onToggleReaction(task.id, reply.id, '👍')}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </Button>
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Smile className="w-3.5 h-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" align="start">
                                  <div className="flex gap-1">
                                    {QUICK_REACTIONS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => onToggleReaction(task.id, reply.id, emoji)}
                                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
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
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Scroll anchor */}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment input - fixed at bottom */}
            <div className="p-4 border-t bg-background space-y-2">
              {/* Reply indicator */}
              {replyingTo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                  <CornerDownRight className="w-3 h-3" />
                  <span>Replying to <span className="font-medium text-foreground">{replyingTo.author.name}</span></span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-auto"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-3">
                <UserAvatar user={currentUser} className="w-8 h-8 text-xs flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder={replyingTo ? `Reply to ${replyingTo.author.name}...` : "Write a comment... Use @ to mention"}
                      value={newComment}
                      onChange={handleCommentChange}
                      onKeyDown={handleKeyDown}
                      className="min-h-[60px] resize-none text-sm pr-20"
                      rows={2}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={handleSubmitComment} 
                        disabled={!newComment.trim() && pendingAttachments.length === 0} 
                        size="sm"
                        className="h-7 w-7 p-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Mention autocomplete dropdown */}
                    {showMentions && filteredMembers.length > 0 && (
                      <div className="absolute left-0 bottom-full mb-1 w-full bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
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
                              <span className="text-xs text-muted-foreground ml-auto">
                                {member.role}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Pending attachments preview */}
                  {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pendingAttachments.map((pending, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-2 py-1 rounded bg-secondary text-sm group"
                        >
                          {pending.preview ? (
                            <img 
                              src={pending.preview} 
                              alt={pending.file.name} 
                              className="w-6 h-6 object-cover rounded"
                            />
                          ) : (
                            getFileIcon(pending.file.type)
                          )}
                          <span className="max-w-[100px] truncate text-xs">
                            {pending.file.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemovePending(index)}
                          >
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

            {/* Attachments tab */}
            {activityTab === 'attachments' && (
              <div className="flex-1 overflow-y-auto p-4">
                {allAttachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No attachments yet. Add files through comments.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {allAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => handleDownload(attachment)}
                      >
                        {attachment.type.startsWith('image/') ? (
                          <img 
                            src={attachment.url} 
                            alt={attachment.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center flex-shrink-0">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        >
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
  );
}
