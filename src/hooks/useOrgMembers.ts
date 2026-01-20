import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";

export function useOrgMembers() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc("get_org_member_profiles", {
        org_id: orgId,
      });

      if (error) {
        console.error("Error fetching org members:", error);
        throw error;
      }

      // Transform to User type for compatibility with existing components
      const transformed: User[] = (data || []).map((member: any) => ({
        id: member.id,
        name: member.last_name
          ? `${member.first_name} ${member.last_name}`
          : member.first_name,
        email: "", // Not exposed for privacy
        role: "staff", // Default role, not critical for display
        avatar: member.avatar_url || undefined,
      }));

      return transformed;
    },
    enabled: !!orgId,
  });

  return {
    members,
    isLoading,
    error,
  };
}
