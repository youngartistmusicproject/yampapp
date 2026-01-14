import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAssigneeFrequency(limit = 6) {
  return useQuery({
    queryKey: ['assignee-frequency', limit],
    queryFn: async () => {
      // Fetch all task assignees and count in JS since Supabase doesn't support GROUP BY directly
      const { data, error } = await supabase
        .from('task_assignees')
        .select('user_name');

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
