import { useState } from "react";
import { Plus, Search, Heart, MessageCircle, Share2, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Post {
  id: string;
  author: { name: string; role: string };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  group: string;
}

interface Group {
  id: string;
  name: string;
  members: number;
  description: string;
}

const groups: Group[] = [
  { id: "1", name: "Faculty Lounge", members: 24, description: "General discussion for all faculty members" },
  { id: "2", name: "Music Theory", members: 18, description: "Share resources and discuss theory concepts" },
  { id: "3", name: "Parent Community", members: 156, description: "Connect with other music school parents" },
  { id: "4", name: "Student Showcase", members: 89, description: "Share student achievements and performances" },
];

const posts: Post[] = [
  {
    id: "1",
    author: { name: "Sarah Miller", role: "Faculty" },
    content: "Just finished a great lesson on chord progressions! The students are really getting it. 🎹 Anyone have tips for teaching seventh chords to beginners?",
    timestamp: "2 hours ago",
    likes: 12,
    comments: 5,
    group: "Faculty Lounge",
  },
  {
    id: "2",
    author: { name: "John Davis", role: "Faculty" },
    content: "Reminder: Spring Recital practice starts next week. Please make sure all students have their pieces selected by Friday!",
    timestamp: "5 hours ago",
    likes: 24,
    comments: 8,
    group: "Faculty Lounge",
  },
  {
    id: "3",
    author: { name: "Admin", role: "Admin" },
    content: "We're excited to announce our new practice room booking system! 🎉 Check the Knowledge Base for the full guide on how to use it.",
    timestamp: "1 day ago",
    likes: 45,
    comments: 12,
    group: "Faculty Lounge",
  },
];

export default function Community() {
  const [selectedGroup, setSelectedGroup] = useState<string>("1");
  const [newPost, setNewPost] = useState("");

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Groups Sidebar */}
      <div className="w-72 flex-shrink-0 space-y-4">
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
      <div className="flex-1 space-y-4">
        {/* New Post */}
        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Share something with the group..."
                  className="min-h-[80px] resize-none"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
                <div className="flex justify-end mt-3">
                  <Button size="sm" disabled={!newPost.trim()}>
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        {posts.map((post) => (
          <Card key={post.id} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {post.author.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{post.author.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {post.author.role}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{post.timestamp}</p>
                  <p className="mt-3 text-sm leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                      <Heart className="w-4 h-4" />
                      {post.likes}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
