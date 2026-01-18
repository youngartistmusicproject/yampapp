import { useState, useRef } from "react";
import { format } from "date-fns";
import { Trash2, Reply, Paperclip, ChevronDown, ChevronUp, Send, Loader2, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CommentReactions } from "./CommentReactions";
import { MentionInput, renderMentionContent } from "./MentionInput";
import { useOrganizationProfiles } from "@/hooks/useProfiles";
import type { TaskComment } from "@/types";
import { cn } from "@/lib/utils";

interface ThreadedCommentProps {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReply: (content: string, parentCommentId: string, files?: File[]) => Promise<void>;
  onToggleReaction: (commentId: string, emoji: string) => void;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  rootParentId?: string;
  depth?: number;
}

export function ThreadedComment({
  comment,
  replies,
  currentUserId,
  onDelete,
  onReply,
  onToggleReaction,
  onEdit,
  rootParentId,
  depth = 0,
}: ThreadedCommentProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: profiles = [] } = useOrganizationProfiles();

  const maxDepth = 1;
  const isAtMaxDepth = depth >= maxDepth;
  const effectiveRootParent = rootParentId || comment.id;

  // Check if comment was edited
  const isEdited = comment.updatedAt && 
    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

  const reactionsForDisplay = (comment.reactions || []).map((r) => ({
    emoji: r.emoji,
    count: r.users.length,
    hasReacted: r.users.some((u) => u.id === currentUserId),
    users: r.users.map((u) => u.name),
  }));

  const handleSubmitReply = async () => {
    if (!replyContent.trim() && replyFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      const targetParentId = isAtMaxDepth ? effectiveRootParent : comment.id;
      await onReply(replyContent.trim(), targetParentId, replyFiles.length > 0 ? replyFiles : undefined);
      setReplyContent("");
      setReplyFiles([]);
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    setIsEditSubmitting(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleReplyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveReplyFile = (index: number) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div 
      data-comment-id={comment.id}
      className={cn("group/comment", depth > 0 && "ml-6 mt-1.5 pl-2.5 border-l border-border/30")}
    >
      <div className="flex items-start gap-2">
        <UserAvatar user={comment.author} size="sm" showTooltip={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.createdAt), "MMM d, h:mm a")}
            </span>
            {isEdited && (
              <span className="text-xs text-muted-foreground/60 italic">(edited)</span>
            )}
            <div className="opacity-40 group-hover/comment:opacity-100 flex items-center gap-0.5 transition-opacity ml-auto">
              {onEdit && !isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(comment.content);
                  }}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Reply"
              >
                <Reply className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          </div>
          
          {/* Comment content or edit mode */}
          {isEditing ? (
            <div className="mt-1.5">
              <MentionInput
                value={editContent}
                onChange={setEditContent}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitEdit();
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }
                }}
                placeholder="Edit comment..."
                className="min-h-[40px] text-sm py-1.5"
              />
              <div className="flex items-center gap-1 mt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={!editContent.trim() || isEditSubmitting}
                  onClick={handleSubmitEdit}
                >
                  {isEditSubmitting ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 break-words">{renderMentionContent(comment.content, profiles)}</p>
          )}
          
          {/* Attachments */}
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

          {/* Reactions */}
          <div className="mt-2">
            <CommentReactions
              reactions={reactionsForDisplay}
              onToggleReaction={(emoji) => onToggleReaction(comment.id, emoji)}
              size="sm"
            />
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="mt-2">
              {/* Reply file previews */}
              {replyFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {replyFiles.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-xs"
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                      <span className="max-w-[80px] truncate">{file.name}</span>
                      <button
                        onClick={() => handleRemoveReplyFile(index)}
                        className="p-0.5 hover:bg-destructive/20 rounded"
                      >
                        <X className="w-2.5 h-2.5 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <div className="flex-1 relative">
                  <MentionInput
                    value={replyContent}
                    onChange={setReplyContent}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitReply();
                      }
                      if (e.key === "Escape") {
                        setShowReplyInput(false);
                        setReplyContent("");
                        setReplyFiles([]);
                      }
                    }}
                    placeholder="Reply... (Enter to send)"
                    className="min-h-[40px] pr-16 text-sm py-1.5"
                  />
                  <input 
                    ref={replyFileInputRef}
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleReplyFileSelect}
                  />
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => replyFileInputRef.current?.click()}
                    >
                      <Paperclip className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-6 w-6"
                      disabled={(!replyContent.trim() && replyFiles.length === 0) || isSubmitting}
                      onClick={handleSubmitReply}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replies toggle */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 mt-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {showReplies ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.length > 0 && (
        <div className="mt-1.5">
          {replies.map((reply) => (
            <ThreadedComment
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              onToggleReaction={onToggleReaction}
              onEdit={onEdit}
              rootParentId={effectiveRootParent}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
