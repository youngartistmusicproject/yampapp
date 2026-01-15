import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: "task_assignment" | "due_reminder" | "chat_message";
  title: string;
  message: string | null;
  link: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  // Fetch notifications
  const query = useQuery({
    queryKey: ["notifications", user?.id, orgId],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      let queryBuilder = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Filter by organization if available
      if (orgId) {
        queryBuilder = queryBuilder.or(`organization_id.eq.${orgId},organization_id.is.null`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }

      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    // Build filter for realtime subscription
    let filter = `user_id=eq.${user.id}`;
    
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Only add if it matches current org or has no org
          if (!orgId || !newNotification.organization_id || newNotification.organization_id === orgId) {
            queryClient.setQueryData<Notification[]>(
              ["notifications", user.id, orgId],
              (old) => {
                return old ? [newNotification, ...old] : [newNotification];
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orgId, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id, orgId] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let queryBuilder = supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      // Filter by organization if available
      if (orgId) {
        queryBuilder = queryBuilder.or(`organization_id.eq.${orgId},organization_id.is.null`);
      }

      const { error } = await queryBuilder;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id, orgId] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id, orgId] });
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let queryBuilder = supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      // Filter by organization if available
      if (orgId) {
        queryBuilder = queryBuilder.or(`organization_id.eq.${orgId},organization_id.is.null`);
      }

      const { error } = await queryBuilder;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id, orgId] });
    },
  });

  const notifications = query.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAll: clearAllMutation.mutate,
  };
}
