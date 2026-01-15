import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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

export type ReactionType = "like" | "love" | "care" | "congrats" | "celebrate" | "insightful";

export interface Post {
  id: string;
  groupId: string;
  author: { name: string; role: string; avatar?: string };
  content: string;
  image?: string;
  timestamp: string;
  reactions: Record<string, number>;
  reactionCount: number;
  comments: Comment[];
  shares: number;
  group: string;
  userReaction?: ReactionType;
}

export function useCommunity() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;
  
  // Cache group names to avoid refetching
  const groupNamesCache = useRef<Map<string, string>>(new Map());

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
    if (!orgId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    
    try {
      // Fetch groups with member count in a single query using a subquery
      const { data: groupsData, error } = await supabase
        .from("community_groups")
        .select(`
          *,
          community_group_members(count)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const groupsWithCounts = (groupsData || []).map((group: any) => {
        // Cache group names
        groupNamesCache.current.set(group.id, group.name);
        
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          icon: group.icon,
          memberCount: group.community_group_members?.[0]?.count || 0,
        };
      });

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

  const fetchPosts = useCallback(async (groupId?: string) => {
    if (!groupId) return;
    
    try {
      // Single query to get posts
      const { data: postsData, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const postIds = postsData.map((p) => p.id);

      // Batch fetch all related data in parallel
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("community_post_likes")
          .select("post_id, user_name, reaction_type")
          .in("post_id", postIds),
        supabase
          .from("community_comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true }),
      ]);

      const likesData = likesResult.data || [];
      const commentsData = commentsResult.data || [];

      // Fetch comment likes in batch if there are comments
      const commentIds = commentsData.map((c) => c.id);
      let commentLikesData: any[] = [];
      
      if (commentIds.length > 0) {
        const { data } = await supabase
          .from("community_comment_likes")
          .select("comment_id, user_name")
          .in("comment_id", commentIds);
        commentLikesData = data || [];
      }

      // Build lookup maps for O(1) access - now with reaction types
      const reactionsMap = new Map<string, { reactions: Record<string, number>; userReaction?: ReactionType }>();
      likesData.forEach((like) => {
        const existing = reactionsMap.get(like.post_id) || { reactions: {} };
        const reactionType = like.reaction_type || "like";
        existing.reactions[reactionType] = (existing.reactions[reactionType] || 0) + 1;
        if (like.user_name === "You") existing.userReaction = reactionType as ReactionType;
        reactionsMap.set(like.post_id, existing);
      });

      const commentLikesMap = new Map<string, { count: number; hasLiked: boolean }>();
      commentLikesData.forEach((like) => {
        const existing = commentLikesMap.get(like.comment_id) || { count: 0, hasLiked: false };
        existing.count++;
        if (like.user_name === "You") existing.hasLiked = true;
        commentLikesMap.set(like.comment_id, existing);
      });

      const commentsMap = new Map<string, Comment[]>();
      commentsData.forEach((comment) => {
        const commentLikes = commentLikesMap.get(comment.id) || { count: 0, hasLiked: false };
        const transformed: Comment = {
          id: comment.id,
          author: { name: comment.author_name },
          content: comment.content,
          timestamp: formatTime(comment.created_at),
          likes: commentLikes.count,
          hasLiked: commentLikes.hasLiked,
        };
        const existing = commentsMap.get(comment.post_id) || [];
        existing.push(transformed);
        commentsMap.set(comment.post_id, existing);
      });

      // Transform posts using cached data
      const groupName = groupNamesCache.current.get(groupId) || "Unknown";
      
      const transformedPosts: Post[] = postsData.map((post) => {
        const postReactions = reactionsMap.get(post.id) || { reactions: {} };
        const reactionCount = Object.values(postReactions.reactions).reduce((sum, count) => sum + count, 0);
        
        return {
          id: post.id,
          groupId: post.group_id,
          author: { name: post.author_name, role: post.author_role || "Member" },
          content: post.content,
          image: post.image_url || undefined,
          timestamp: formatTime(post.created_at),
          reactions: postReactions.reactions,
          reactionCount,
          comments: commentsMap.get(post.id) || [],
          shares: 0,
          group: groupName,
          userReaction: postReactions.userReaction,
        };
      });

      setPosts(transformedPosts);
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
  }, [toast]);

  const createPost = async (content: string, imageUrl?: string) => {
    if (!selectedGroupId || !content.trim() || !orgId) return;

    try {
      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          group_id: selectedGroupId,
          author_name: "You",
          author_role: "Member",
          content: content.trim(),
          image_url: imageUrl || null,
          organization_id: orgId,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      const groupName = groupNamesCache.current.get(selectedGroupId) || "Unknown";
      const newPost: Post = {
        id: data.id,
        groupId: data.group_id,
        author: { name: "You", role: "Member" },
        content: data.content,
        image: data.image_url || undefined,
        timestamp: "Just now",
        reactions: {},
        reactionCount: 0,
        comments: [],
        shares: 0,
        group: groupName,
        userReaction: undefined,
      };
      
      setPosts((prev) => [newPost, ...prev]);

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

  const reactToPost = async (postId: string, reactionType: ReactionType) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const previousReaction = post.userReaction;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        
        const newReactions = { ...p.reactions };
        
        // Remove old reaction if exists
        if (previousReaction && newReactions[previousReaction]) {
          newReactions[previousReaction]--;
          if (newReactions[previousReaction] === 0) delete newReactions[previousReaction];
        }
        
        // Add new reaction
        newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
        
        return {
          ...p,
          reactions: newReactions,
          reactionCount: Object.values(newReactions).reduce((sum, count) => sum + count, 0),
          userReaction: reactionType,
        };
      })
    );

    try {
      // Delete old reaction if exists
      if (previousReaction) {
        await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_name", "You");
      }
      
      // Insert new reaction
      await supabase.from("community_post_likes").insert({
        post_id: postId,
        user_name: "You",
        reaction_type: reactionType,
      });
    } catch (error) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactions: post.reactions,
                reactionCount: post.reactionCount,
                userReaction: post.userReaction,
              }
            : p
        )
      );
      console.error("Error reacting to post:", error);
    }
  };

  const removePostReaction = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.userReaction) return;

    const previousReaction = post.userReaction;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        
        const newReactions = { ...p.reactions };
        if (newReactions[previousReaction]) {
          newReactions[previousReaction]--;
          if (newReactions[previousReaction] === 0) delete newReactions[previousReaction];
        }
        
        return {
          ...p,
          reactions: newReactions,
          reactionCount: Object.values(newReactions).reduce((sum, count) => sum + count, 0),
          userReaction: undefined,
        };
      })
    );

    try {
      await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_name", "You");
    } catch (error) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactions: post.reactions,
                reactionCount: post.reactionCount,
                userReaction: post.userReaction,
              }
            : p
        )
      );
      console.error("Error removing reaction:", error);
    }
  };

  const addComment = async (postId: string, content: string) => {
    if (!content.trim() || !orgId) return;

    try {
      const { data, error } = await supabase
        .from("community_comments")
        .insert({
          post_id: postId,
          author_name: "You",
          content: content.trim(),
          organization_id: orgId,
        })
        .select()
        .single();

      if (error) throw error;

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
    const post = posts.find((p) => p.id === postId);
    const comment = post?.comments.find((c) => c.id === commentId);
    if (!comment) return;

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

    try {
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
    } catch (error) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === commentId
                    ? {
                        ...c,
                        hasLiked: comment.hasLiked,
                        likes: comment.likes,
                      }
                    : c
                ),
              }
            : p
        )
      );
      console.error("Error toggling comment like:", error);
    }
  };

  // Initial fetch - refetch when organization changes
  useEffect(() => {
    if (orgId) {
      setSelectedGroupId(null);
      fetchGroups();
    }
  }, [orgId]);

  // Fetch posts when group changes
  useEffect(() => {
    if (selectedGroupId) {
      setIsLoading(true);
      fetchPosts(selectedGroupId);
    }
  }, [selectedGroupId, fetchPosts]);

  // Realtime subscriptions - debounced refresh
  useEffect(() => {
    if (!selectedGroupId) return;

    const channel = supabase
      .channel("community-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_posts", filter: `group_id=eq.${selectedGroupId}` },
        () => fetchPosts(selectedGroupId)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_posts" },
        () => fetchPosts(selectedGroupId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroupId, fetchPosts]);

  return {
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
    fetchPosts,
  };
}
