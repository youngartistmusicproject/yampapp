import React, { useState } from "react";
import {
  Plus,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Users,
  Send,
  Loader2,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useCommunity } from "@/hooks/useCommunity";
import { CreatePostBox } from "@/components/community/CreatePostBox";
import { ReactionPicker, ReactionSummary, ReactionType } from "@/components/community/ReactionPicker";

export default function Community() {
  const {
    groups,
    posts,
    selectedGroupId,
    setSelectedGroupId,
    isLoading,
    createPost,
    reactToPost,
    removePostReaction,
    addComment,
    toggleCommentLike,
  } = useCommunity();

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    await addComment(postId, content);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 animate-fade-in">
      {/* Mobile Group Selector */}
      <div className="lg:hidden">
        <select
          className="w-full p-3 rounded-lg border bg-card text-sm font-medium"
          value={selectedGroupId || ""}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.memberCount} members)
            </option>
          ))}
        </select>
      </div>

      {/* Groups Sidebar - Desktop only */}
      <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Groups</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {groups.map((group) => (
              <button
                key={group.id}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedGroupId === group.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedGroupId === group.id
                      ? "bg-primary-foreground/20"
                      : "bg-secondary"
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{group.name}</p>
                  <p
                    className={`text-xs ${
                      selectedGroupId === group.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {group.memberCount} members
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex -space-x-2">
              {["SM", "JD", "EC", "MJ", "LA"].map((initials, i) => (
                <Avatar key={i} className="w-8 h-8 border-2 border-background">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ))}
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground border-2 border-background">
                +19
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed */}
      <div className="flex-1 max-w-2xl space-y-4">
        {/* Create Post Box */}
        <CreatePostBox onCreatePost={createPost} />

        {/* Empty State */}
        {posts.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to share something with the group!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        {posts.map((post) => (
          <Card key={post.id} className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              {/* Post Header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <Avatar className="w-10 h-10">
                  {post.author.avatar ? (
                    <AvatarImage src={post.author.avatar} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {post.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{post.author.name}</span>
                    {post.author.role && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {post.author.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{post.timestamp}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-sm whitespace-pre-line leading-relaxed">
                  {post.content}
                </p>
              </div>

              {/* Post Image (if any) */}
              {post.image && (
                <img
                  src={post.image}
                  alt="Post image"
                  className="w-full object-cover max-h-[500px]"
                />
              )}

              {/* Reactions & Comments Count */}
              <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <ReactionSummary 
                  reactions={post.reactions} 
                  totalCount={post.reactionCount} 
                />
                <div className="flex items-center gap-3">
                  {post.comments.length > 0 && (
                    <button
                      className="hover:underline"
                      onClick={() => toggleComments(post.id)}
                    >
                      {post.comments.length} comment
                      {post.comments.length !== 1 ? "s" : ""}
                    </button>
                  )}
                  {post.shares > 0 && (
                    <span>
                      {post.shares} share{post.shares !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="px-2 py-1 flex items-center">
                <ReactionPicker
                  hasReacted={!!post.userReaction}
                  userReaction={post.userReaction}
                  onReact={(reactionType) => reactToPost(post.id, reactionType)}
                  onRemoveReaction={() => removePostReaction(post.id)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-2 text-muted-foreground"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className="w-5 h-5" />
                  Comment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-2 text-muted-foreground"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
              </div>

              {/* Comments Section */}
              {(expandedComments.has(post.id) || post.comments.length > 0) && (
                <>
                  <Separator />
                  <div className="p-4 pt-3 space-y-3 bg-secondary/30">
                    {/* Existing Comments */}
                    {expandedComments.has(post.id) &&
                      post.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
                              {comment.author.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-secondary rounded-2xl px-3 py-2">
                              <p className="font-semibold text-xs">
                                {comment.author.name}
                              </p>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 px-2 text-xs text-muted-foreground">
                              <button
                                className={`font-medium hover:underline ${
                                  comment.hasLiked ? "text-primary" : ""
                                }`}
                                onClick={() =>
                                  toggleCommentLike(comment.id, post.id)
                                }
                              >
                                Like
                              </button>
                              <span>{comment.timestamp}</span>
                              {comment.likes > 0 && (
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {comment.likes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Add Comment Input */}
                    <div className="flex gap-2 pt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          JD
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder="Write a comment..."
                          className="flex-1 h-9 rounded-full bg-secondary border-0 text-sm"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
