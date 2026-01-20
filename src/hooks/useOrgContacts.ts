import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrgContact {
  id: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  displayName: string;
}

export function useOrgContacts() {
  const { currentOrganization, profile } = useAuth();
  const orgId = currentOrganization?.id;
  const currentUserId = profile?.id;

  const { data: contacts = [], isLoading, error } = useQuery({
    queryKey: ["org-contacts", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc("get_org_member_profiles", {
        org_id: orgId,
      });

      if (error) {
        console.error("Error fetching org contacts:", error);
        throw error;
      }

      // Transform and exclude current user
      const transformed: OrgContact[] = (data || [])
        .filter((member: any) => member.id !== currentUserId)
        .map((member: any) => ({
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          avatarUrl: member.avatar_url,
          displayName: member.last_name
            ? `${member.first_name} ${member.last_name}`
            : member.first_name,
        }));

      return transformed;
    },
    enabled: !!orgId,
  });

  return {
    contacts,
    isLoading,
    error,
  };
}
