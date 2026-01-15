import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAssigneeFrequency(limit = 6) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['assignee-frequency', orgId, limit],
    queryFn: async () => {
      if (!orgId) return [];

      // Fetch task assignees filtered by organization through the tasks table
      const { data, error } = await supabase
        .from('task_assignees')
        .select(`
          user_name,
          tasks!inner(organization_id)
        `)
        .eq('tasks.organization_id', orgId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Count occurrences of each user_name
      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.user_name] = (counts[row.user_name] || 0) + 1;
      });

      // Sort by count descending and take top N
      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([name]) => name);

      return sorted;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
