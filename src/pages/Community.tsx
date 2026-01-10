import { useState } from "react";
import {
  Plus,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Users,
  Image as ImageIcon,
  Video,
  Smile,
  MapPin,
  ThumbsUp,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Comment {
  id: string;
  author: { name: string; avatar?: string };
  content: string;
  timestamp: string;
  likes: number;
}

interface Post {
  id: string;
  author: { name: string; role: string; avatar?: string };
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  shares: number;
  group: string;
  liked: boolean;
}

interface Group {
  id: string;
  name: string;
  members: number;
  description: string;
  icon?: string;
}

const groups: Group[] = [
  {
    id: "1",
    name: "Faculty Lounge",
    members: 24,
    description: "General discussion for all faculty members",
  },
  {
    id: "2",
    name: "Music Theory",
    members: 18,
    description: "Share resources and discuss theory concepts",
  },
  {
    id: "3",
    name: "Parent Community",
    members: 156,
    description: "Connect with other music school parents",
  },
  {
    id: "4",
    name: "Student Showcase",
    members: 89,
    description: "Share student achievements and performances",
  },
];

const initialPosts: Post[] = [
  {
    id: "1",
    author: { name: "Sarah Miller", role: "Faculty" },
    content:
      "Just finished a great lesson on chord progressions! The students are really getting it. 🎹 Anyone have tips for teaching seventh chords to beginners?",
    timestamp: "2 hours ago",
    likes: 12,
    comments: [
      {
        id: "c1",
        author: { name: "John Davis" },
        content: "Try using pop songs they know - makes it stick!",
        timestamp: "1 hour ago",
        likes: 3,
      },
      {
        id: "c2",
        author: { name: "Emma Chen" },
        content: "I use colored stickers on the keys, works great!",
        timestamp: "45 min ago",
        likes: 5,
      },
    ],
    shares: 2,
    group: "Faculty Lounge",
    liked: false,
  },
  {
    id: "2",
    author: { name: "John Davis", role: "Faculty" },
    content:
      "Reminder: Spring Recital practice starts next week. Please make sure all students have their pieces selected by Friday! 🎵\n\nLet me know if you need any help with repertoire suggestions.",
    timestamp: "5 hours ago",
    likes: 24,
    comments: [],
    shares: 8,
    group: "Faculty Lounge",
    liked: true,
  },
  {
    id: "3",
    author: { name: "Admin", role: "Admin" },
    content:
      "We're excited to announce our new practice room booking system! 🎉 Check the Knowledge Base for the full guide on how to use it.\n\nKey features:\n• Real-time availability\n• Mobile-friendly booking\n• Automatic reminders",
    timestamp: "1 day ago",
    likes: 45,
    comments: [
      {
        id: "c3",
        author: { name: "Lisa Adams" },
        content: "Finally! This is going to be so helpful.",
        timestamp: "23 hours ago",
        likes: 12,
      },
    ],
    shares: 15,
    group: "Faculty Lounge",
    liked: false,
  },
];

export default function Community() {
  const [selectedGroup, setSelectedGroup] = useState<string>("1");
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

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

  const handleAddComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `c-${Date.now()}`,
                  author: { name: "You" },
                  content,
                  timestamp: "Just now",
                  likes: 0,
                },
              ],
            }
          : post
      )
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleCreatePost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: `p-${Date.now()}`,
      author: { name: "You", role: "Member" },
      content: newPost,
      timestamp: "Just now",
      likes: 0,
      comments: [],
      shares: 0,
      group: groups.find((g) => g.id === selectedGroup)?.name || "Faculty Lounge",
      liked: false,
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost("");
  };

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Groups Sidebar */}
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
                  selectedGroup === group.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
                onClick={() => setSelectedGroup(group.id)}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedGroup === group.id
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
                      selectedGroup === group.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {group.members} members
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
      <div className="flex-1 max-w-2xl mx-auto space-y-4">
        {/* Create Post Box - Facebook style */}
        <Card className="shadow-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3 items-start">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  JD
                </AvatarFallback>
              </Avatar>
              <button
                className="flex-1 bg-secondary hover:bg-secondary/80 transition-colors rounded-full px-4 py-2.5 text-left text-muted-foreground text-sm"
                onClick={() => document.getElementById("post-textarea")?.focus()}
              >
                What's on your mind?
              </button>
            </div>

            {/* Expanded textarea */}
            <div className="mt-3">
              <textarea
                id="post-textarea"
                placeholder="Share something with the group..."
                className="w-full min-h-[100px] bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-sm placeholder:text-muted-foreground"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            </div>

            <Separator className="my-3" />

            {/* Media buttons row */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                >
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  <span className="hidden sm:inline">Photo</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                >
                  <Video className="w-5 h-5 text-red-500" />
                  <span className="hidden sm:inline">Video</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-50"
                >
                  <Smile className="w-5 h-5 text-yellow-500" />
                  <span className="hidden sm:inline">Feeling</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="hidden sm:inline">Location</span>
                </Button>
              </div>
              <Button
                size="sm"
                disabled={!newPost.trim()}
                onClick={handleCreatePost}
              >
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

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
                <div className="flex items-center gap-1">
                  {post.likes > 0 && (
                    <>
                      <div className="flex -space-x-1">
                        <span className="w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center">
                          <ThumbsUp className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                        <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center">
                          <Heart className="w-2.5 h-2.5 text-white fill-white" />
                        </span>
                      </div>
                      <span className="ml-1">{post.likes}</span>
                    </>
                  )}
                </div>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex-1 gap-2 ${
                    post.liked
                      ? "text-primary hover:text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => handleLike(post.id)}
                >
                  <ThumbsUp
                    className={`w-5 h-5 ${post.liked ? "fill-primary" : ""}`}
                  />
                  Like
                </Button>
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
                            <div className="flex items-center gap-3 mt-1 px-3 text-xs text-muted-foreground">
                              <button className="font-medium hover:underline">
                                Like
                              </button>
                              <button className="font-medium hover:underline">
                                Reply
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
                    <div className="flex gap-2 items-start">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          JD
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder="Write a comment..."
                          className="rounded-full bg-secondary border-0 h-9 text-sm"
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
                          className="h-9 w-9 flex-shrink-0"
                          disabled={!commentInputs[post.id]?.trim()}
                          onClick={() => handleAddComment(post.id)}
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
