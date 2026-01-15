import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  task_reminders: boolean;
  calendar_alerts: boolean;
  chat_messages: boolean;
  request_updates: boolean;
}

export type BooleanPreferenceKey = "email_notifications" | "push_notifications" | "task_reminders" | "calendar_alerts" | "chat_messages" | "request_updates";

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        throw error;
      }

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_notification_preferences")
          .insert({
            user_id: user.id,
            email_notifications: true,
            push_notifications: true,
            task_reminders: true,
            calendar_alerts: true,
            chat_messages: true,
            request_updates: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating notification preferences:", insertError);
          throw insertError;
        }

        return newData as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
    onError: (error: any) => {
      console.error("Error updating notification preferences:", error);
      toast.error("Failed to update preferences");
    },
  });

  const updatePreference = (key: BooleanPreferenceKey, value: boolean) => {
    mutation.mutate({ [key]: value });
  };

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreference,
    isUpdating: mutation.isPending,
  };
}
