import { useState, useRef } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Paperclip, 
  Send, 
  FileText, 
  Image, 
  File, 
  X, 
  Download,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Users
} from "lucide-react";
import { format } from "date-fns";

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
  statuses: StatusItem[];
  onAddComment: (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
  onAddAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => void;
  onDeleteAttachment: (taskId: string, attachmentId: string) => void;
  onEditTask: (task: Task) => void;
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

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  currentUser,
  statuses,
  onAddComment,
  onDeleteComment,
  onAddAttachment,
  onDeleteAttachment,
  onEditTask,
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

    // Reset input
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
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold mb-2">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {taskStatus && (
                  <Badge 
                    variant="outline"
                    style={{ borderColor: taskStatus.color, color: taskStatus.color }}
                  >
                    {taskStatus.name}
                  </Badge>
                )}
                <Badge className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                {task.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onEditTask(task)}>
              <Edit2 className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="mx-6 mt-2 w-fit">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
                {attachments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {attachments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 px-6 pb-6 mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {task.description && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                      <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    {task.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Due Date</p>
                          <p className="text-sm font-medium">
                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm font-medium">
                          {format(new Date(task.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {task.assignees && task.assignees.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium text-muted-foreground">Assignees</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {task.assignees.map((user) => (
                            <div key={user.id} className="flex items-center gap-2 bg-secondary rounded-full pl-1 pr-3 py-1">
                              <UserAvatar user={user} className="w-6 h-6 text-xs" />
                              <span className="text-sm">{user.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comments" className="flex-1 flex flex-col px-6 pb-6 mt-4">
              <ScrollArea className="flex-1 h-[250px] pr-4">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                    <p>No comments yet</p>
                    <p className="text-xs">Be the first to add a comment</p>
                  </div>
                ) : (
                  <div className="space-y-4">
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
              </ScrollArea>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] resize-none"
                />
                <Button onClick={handleSubmitComment} disabled={!newComment.trim()} className="self-end">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="flex-1 flex flex-col px-6 pb-6 mt-4">
              <ScrollArea className="flex-1 h-[250px] pr-4">
                {attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Paperclip className="w-8 h-8 mb-2 opacity-50" />
                    <p>No attachments</p>
                    <p className="text-xs">Click below to add files</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          {getFileIcon(attachment.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)} • {format(new Date(attachment.uploadedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownload(attachment)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {attachment.uploadedBy.id === currentUser.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteAttachment(task.id, attachment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="mt-4 pt-4 border-t">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                  Add Attachment
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
