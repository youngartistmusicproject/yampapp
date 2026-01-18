import { useState } from "react";
import { format } from "date-fns";
import { Trash2, Reply, Paperclip, ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CommentReactions } from "./CommentReactions";
import { MentionInput, renderMentionContent } from "./MentionInput";
import type { TaskComment, User } from "@/types";
import { cn } from "@/lib/utils";

interface ThreadedCommentProps {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReply: (content: string, parentCommentId: string) => Promise<void>;
  onToggleReaction: (commentId: string, emoji: string) => void;
  isReplying?: boolean;
  depth?: number;
}

export function ThreadedComment({
  comment,
  replies,
  currentUserId,
  onDelete,
  onReply,
  onToggleReaction,
  isReplying = false,
  depth = 0,
}: ThreadedCommentProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const reactionsForDisplay = (comment.reactions || []).map((r) => ({
    emoji: r.emoji,
    count: r.users.length,
    hasReacted: r.users.some((u) => u.id === currentUserId),
    users: r.users.map((u) => u.name),
  }));

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(replyContent.trim(), comment.id);
      setReplyContent("");
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxDepth = 2; // Limit nesting depth

  return (
    <div className={cn("group", depth > 0 && "ml-8 mt-2 pl-3 border-l-2 border-border/40")}>
      <div className="flex items-start gap-3">
        <UserAvatar user={comment.author} size="sm" showTooltip={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.createdAt), "MMM d, h:mm a")}
            </span>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-auto">
              {depth < maxDepth && (
                <button
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Reply"
                >
                  <Reply className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          </div>
          <p className="text-sm mt-0.5 break-words">{renderMentionContent(comment.content)}</p>
          
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
            <div className="mt-3 flex items-start gap-2">
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
                    }
                  }}
                  placeholder="Write a reply... Press Enter to send, Esc to cancel"
                  className="min-h-[60px] pr-12 text-sm"
                />
                <Button
                  size="icon"
                  className="absolute bottom-2 right-2 h-7 w-7"
                  disabled={!replyContent.trim() || isSubmitting}
                  onClick={handleSubmitReply}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Replies toggle */}
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
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
        <div className="mt-2">
          {replies.map((reply) => (
            <ThreadedComment
              key={reply.id}
              comment={reply}
              replies={[]} // For now, we only support one level of nesting display
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              onToggleReaction={onToggleReaction}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
