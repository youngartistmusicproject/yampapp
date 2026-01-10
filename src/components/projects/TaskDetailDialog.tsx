import { useState, useRef, useEffect } from "react";
import { Task, User, TaskComment, TaskAttachment, CommentReaction } from "@/types";
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
  CornerDownRight
} from "lucide-react";
import { format } from "date-fns";
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
  multiline = false
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
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="min-h-[80px] resize-none"
          placeholder={placeholder}
        />
      );
    }
    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={className}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom of comments
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <div className="px-6 pt-6 pb-4 border-b space-y-3">
          <EditableText
            value={task.title}
            onSave={(value) => onTaskUpdate(task.id, { title: value })}
            placeholder="Task title"
            className="text-xl font-semibold"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select 
              value={task.status} 
              onValueChange={(value) => onTaskUpdate(task.id, { status: value })}
            >
              <SelectTrigger className="w-auto h-7 text-xs gap-1.5 border-dashed">
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
            
            <Select 
              value={task.priority} 
              onValueChange={(value: Task['priority']) => onTaskUpdate(task.id, { priority: value })}
            >
              <SelectTrigger className="w-auto h-7 text-xs gap-1 border-dashed">
                <Badge className={`${priorityColors[task.priority]} text-xs`}>
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
        </div>

        {/* Main content - two column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] min-h-0">
          {/* Left side - Task details */}
          <div className="overflow-y-auto border-r">
            <div className="p-6 space-y-6">
              {/* Properties grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-2" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
                    <Input
                      type="date"
                      value={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
                      onChange={(e) => onTaskUpdate(task.id, { 
                        dueDate: e.target.value ? new Date(e.target.value) : undefined 
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-2" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Assignees</p>
                    <SearchableAssigneeSelect
                      members={availableMembers}
                      selectedAssignees={task.assignees || []}
                      onAssigneesChange={(assignees) => onTaskUpdate(task.id, { assignees })}
                      placeholder="Add assignees..."
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <Tag className="w-4 h-4 text-muted-foreground mt-2" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                    <SearchableTagSelect
                      tags={tagLibrary}
                      selectedTags={task.tags || []}
                      onTagsChange={(tags) => onTaskUpdate(task.id, { tags })}
                      placeholder="Add tags..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Description</h3>
                </div>
                <EditableText
                  value={task.description || ""}
                  onSave={(value) => onTaskUpdate(task.id, { description: value })}
                  placeholder="Add a description..."
                  multiline
                  className="text-sm whitespace-pre-wrap min-h-[100px]"
                />
              </div>

              {/* Legacy Attachments (if any exist from before) */}
              {legacyAttachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Files</h3>
                      <Badge variant="secondary" className="text-xs h-5">
                        {legacyAttachments.length}
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      {legacyAttachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDownload(attachment)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side - Activity */}
          <div className="flex flex-col min-h-0 bg-muted/30">
            <div className="px-4 py-3 border-b bg-background">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Activity</h3>
                {comments.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5">
                    {comments.length}
                  </Badge>
                )}
              </div>
            </div>

            {/* Comments list - scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity yet. Be the first to comment!
                </p>
              )}
              {comments.filter(c => !c.parentCommentId).map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main comment */}
                  <div className="flex gap-3 group">
                    <UserAvatar user={comment.author} className="w-8 h-8 text-xs flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d 'at' h:mm a")}
                        </span>
                        {comment.author.id === currentUser.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive ml-auto"
                            onClick={() => onDeleteComment(task.id, comment.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {comment.content && (
                        <p className="text-sm whitespace-pre-wrap">{renderCommentContent(comment.content)}</p>
                      )}
                      
                      {/* Comment attachments */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {comment.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
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
                        <div className="flex flex-wrap gap-1 pt-1">
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

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => onToggleReaction(task.id, comment.id, '👍')}
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Like
                        </Button>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Smile className="w-3 h-3 mr-1" />
                              React
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

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setReplyingTo(comment);
                            textareaRef.current?.focus();
                          }}
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-10 space-y-3 border-l-2 border-muted pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3 group">
                          <UserAvatar user={reply.author} className="w-6 h-6 text-xs flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{reply.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(reply.createdAt), "MMM d 'at' h:mm a")}
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

                            {/* Reply reactions */}
                            {reply.reactions && reply.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {reply.reactions.map((reaction) => {
                                  const hasReacted = reaction.users.some(u => u.id === currentUser.id);
                                  return (
                                    <button
                                      key={reaction.emoji}
                                      onClick={() => onToggleReaction(task.id, reply.id, reaction.emoji)}
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

                            {/* Reply action buttons */}
                            <div className="flex items-center gap-1 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => onToggleReaction(task.id, reply.id, '👍')}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    <Smile className="w-3 h-3" />
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
