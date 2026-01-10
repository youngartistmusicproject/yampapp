import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  memberCount: number;
}

export interface Comment {
  id: string;
  author: { name: string; avatar?: string };
  content: string;
  timestamp: string;
  likes: number;
  hasLiked: boolean;
}

export interface Post {
  id: string;
  groupId: string;
  author: { name: string; role: string; avatar?: string };
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  shares: number;
  group: string;
  hasLiked: boolean;
}

export function useCommunity() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const fetchGroups = async () => {
    try {
      const { data: groupsData, error } = await supabase
        .from("community_groups")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get member counts
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from("community_group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            icon: group.icon,
            memberCount: count || 0,
          };
        })
      );

      setGroups(groupsWithCounts);

      if (!selectedGroupId && groupsWithCounts.length > 0) {
        setSelectedGroupId(groupsWithCounts[0].id);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    }
  };

  const fetchPosts = async (groupId?: string) => {
    try {
      let query = supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data: postsData, error } = await query;

      if (error) throw error;

      // Fetch likes, comments, and group names for each post
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          // Get group name
          const { data: groupData } = await supabase
            .from("community_groups")
            .select("name")
            .eq("id", post.group_id)
            .maybeSingle();

          // Get likes
          const { data: likesData, count: likesCount } = await supabase
            .from("community_post_likes")
            .select("*", { count: "exact" })
            .eq("post_id", post.id);

          // Check if current user liked
          const hasLiked = (likesData || []).some((l) => l.user_name === "You");

          // Get comments
          const { data: commentsData } = await supabase
            .from("community_comments")
            .select("*")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

          // Get comment likes
          const commentsWithLikes = await Promise.all(
            (commentsData || []).map(async (comment) => {
              const { data: commentLikes, count: commentLikesCount } = await supabase
                .from("community_comment_likes")
                .select("*", { count: "exact" })
                .eq("comment_id", comment.id);

              const hasLikedComment = (commentLikes || []).some(
                (l) => l.user_name === "You"
              );

              return {
                id: comment.id,
                author: { name: comment.author_name },
                content: comment.content,
                timestamp: formatTime(comment.created_at),
                likes: commentLikesCount || 0,
                hasLiked: hasLikedComment,
              };
            })
          );

          return {
            id: post.id,
            groupId: post.group_id,
            author: { name: post.author_name, role: post.author_role || "Member" },
            content: post.content,
            image: post.image_url || undefined,
            timestamp: formatTime(post.created_at),
            likes: likesCount || 0,
            comments: commentsWithLikes,
            shares: 0,
            group: groupData?.name || "Unknown",
            hasLiked,
          };
        })
      );

      setPosts(postsWithDetails);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPost = async (content: string, imageUrl?: string) => {
    if (!selectedGroupId || !content.trim()) return;

    try {
      const { error } = await supabase.from("community_posts").insert({
        group_id: selectedGroupId,
        author_name: "You",
        author_role: "Member",
        content: content.trim(),
        image_url: imageUrl || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    }
  };

  const togglePostLike = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (post.hasLiked) {
        // Remove like
        await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_name", "You");
      } else {
        // Add like
        await supabase.from("community_post_likes").insert({
          post_id: postId,
          user_name: "You",
          reaction_type: "like",
        });
      }

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                hasLiked: !p.hasLiked,
                likes: p.hasLiked ? p.likes - 1 : p.likes + 1,
              }
            : p
        )
      );
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const addComment = async (postId: string, content: string) => {
    if (!content.trim()) return;

    try {
      const { data, error } = await supabase
        .from("community_comments")
        .insert({
          post_id: postId,
          author_name: "You",
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      const newComment: Comment = {
        id: data.id,
        author: { name: "You" },
        content: content.trim(),
        timestamp: "Just now",
        likes: 0,
        hasLiked: false,
      };

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, newComment] }
            : p
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const toggleCommentLike = async (commentId: string, postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      const comment = post?.comments.find((c) => c.id === commentId);
      if (!comment) return;

      if (comment.hasLiked) {
        await supabase
          .from("community_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_name", "You");
      } else {
        await supabase.from("community_comment_likes").insert({
          comment_id: commentId,
          user_name: "You",
        });
      }

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === commentId
                    ? {
                        ...c,
                        hasLiked: !c.hasLiked,
                        likes: c.hasLiked ? c.likes - 1 : c.likes + 1,
                      }
                    : c
                ),
              }
            : p
        )
      );
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch posts when group changes
  useEffect(() => {
    if (selectedGroupId) {
      fetchPosts(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("community-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        () => {
          if (selectedGroupId) fetchPosts(selectedGroupId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_comments" },
        () => {
          if (selectedGroupId) fetchPosts(selectedGroupId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_post_likes" },
        () => {
          if (selectedGroupId) fetchPosts(selectedGroupId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId]);

  return {
    groups,
    posts,
    selectedGroupId,
    setSelectedGroupId,
    isLoading,
    createPost,
    togglePostLike,
    addComment,
    toggleCommentLike,
    fetchPosts,
  };
}
