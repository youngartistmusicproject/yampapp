import { useState, useRef, useEffect } from "react";
import { Task, User, TaskComment, TaskAttachment } from "@/types";
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
  X
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

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  currentUser: User;
  availableMembers: User[];
  statuses: StatusItem[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
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
}: TaskDetailDialogProps) {
  const [newComment, setNewComment] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset pending attachments when dialog closes
  useEffect(() => {
    if (!open) {
      setPendingAttachments([]);
      setNewComment("");
    }
  }, [open]);

  if (!task) return null;

  const taskStatus = statuses.find(s => s.id === task.status);
  const comments = task.comments || [];
  // Legacy attachments (attached directly to task, not through comments)
  const legacyAttachments = task.attachments || [];

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
      });
      
      setNewComment("");
      setPendingAttachments([]);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
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

        {/* Main content - single scrollable area */}
        <div className="flex-1 overflow-y-auto">
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
                className="text-sm whitespace-pre-wrap min-h-[60px]"
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

            <Separator />

            {/* Comments Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Activity</h3>
                {comments.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5">
                    {comments.length}
                  </Badge>
                )}
              </div>

              {/* Comment input with attachment support */}
              <div className="flex gap-3">
                <UserAvatar user={currentUser} className="w-8 h-8 text-xs flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <Textarea
                      placeholder="Write a comment or drop files..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
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
                          <span className="max-w-[120px] truncate text-xs">
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

              {/* Comments list */}
              {comments.length > 0 && (
                <div className="space-y-4 pt-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <UserAvatar user={comment.author} className="w-8 h-8 text-xs flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
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
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
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
                                      <p className="text-xs font-medium truncate max-w-[120px]">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
