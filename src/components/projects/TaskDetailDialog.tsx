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
  Plus
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
  onAddAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => void;
  onDeleteAttachment: (taskId: string, attachmentId: string) => void;
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
  onAddAttachment,
  onDeleteAttachment,
}: TaskDetailDialogProps) {
  const [newComment, setNewComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) return null;

  const taskStatus = statuses.find(s => s.id === task.status);
  const comments = task.comments || [];
  const attachments = task.attachments || [];

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    onAddComment(task.id, {
      content: newComment.trim(),
      author: currentUser,
    });
    setNewComment("");
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

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        onAddAttachment(task.id, {
          name: file.name,
          type: file.type,
          size: file.size,
          url,
          uploadedBy: currentUser,
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0">
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
        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
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

            <Separator />

            {/* Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Attachments</h3>
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="text-xs h-5">
                      {attachments.length}
                    </Badge>
                  )}
                </div>
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
                  className="h-7 gap-1 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>

              {attachments.length === 0 ? (
                <div 
                  className="flex items-center justify-center h-16 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {attachments.map((attachment) => (
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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        {attachment.uploadedBy.id === currentUser.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteAttachment(task.id, attachment.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Comments</h3>
                {comments.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5">
                    {comments.length}
                  </Badge>
                )}
              </div>

              {/* Comment input */}
              <div className="flex gap-3">
                <UserAvatar user={currentUser} className="w-8 h-8 text-xs flex-shrink-0" />
                <div className="flex-1 flex gap-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[40px] resize-none text-sm"
                    rows={1}
                  />
                  <Button 
                    onClick={handleSubmitComment} 
                    disabled={!newComment.trim()} 
                    size="sm"
                    className="self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {comments.length > 0 && (
                <div className="space-y-4 pt-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <UserAvatar user={comment.author} className="w-8 h-8 text-xs flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.author.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), "MMM d 'at' h:mm a")}
                          </span>
                          {comment.author.id === currentUser.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 ml-auto"
                              onClick={() => onDeleteComment(task.id, comment.id)}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
