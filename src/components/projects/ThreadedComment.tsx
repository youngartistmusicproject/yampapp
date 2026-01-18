import { useState } from "react";
import { format } from "date-fns";
import { Trash2, Reply, Paperclip, ChevronDown, ChevronUp, Send, Loader2 } from "lucide-react";
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
  onReply: (content: string, parentCommentId: string) => Promise<void>;
  onToggleReaction: (commentId: string, emoji: string) => void;
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
  rootParentId,
  depth = 0,
}: ThreadedCommentProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  
  const { data: profiles = [] } = useOrganizationProfiles();

  const maxDepth = 1;
  const isAtMaxDepth = depth >= maxDepth;
  const effectiveRootParent = rootParentId || comment.id;

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
      // At max depth, reply to root parent instead (flattens thread)
      const targetParentId = isAtMaxDepth ? effectiveRootParent : comment.id;
      await onReply(replyContent.trim(), targetParentId);
      setReplyContent("");
      setShowReplyInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("group/comment", depth > 0 && "ml-6 mt-1.5 pl-2.5 border-l border-border/30")}>
      <div className="flex items-start gap-2">
        <UserAvatar user={comment.author} size="sm" showTooltip={false} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.createdAt), "MMM d, h:mm a")}
            </span>
            <div className="opacity-40 group-hover/comment:opacity-100 flex items-center gap-0.5 transition-opacity ml-auto">
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
          <p className="text-sm mt-0.5 break-words">{renderMentionContent(comment.content, profiles)}</p>
          
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
            <div className="mt-2 flex items-start gap-1.5">
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
                  placeholder="Reply... (Enter to send)"
                  className="min-h-[40px] pr-10 text-sm py-1.5"
                />
                <Button
                  size="icon"
                  className="absolute bottom-1.5 right-1.5 h-6 w-6"
                  disabled={!replyContent.trim() || isSubmitting}
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
              rootParentId={effectiveRootParent}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
