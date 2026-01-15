import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/contexts/AuthContext';

export interface ProfileWithRoles extends Profile {
  roles: AppRole[];
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileWithRoles[]> => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to profiles
      const rolesMap = new Map<string, AppRole[]>();
      userRoles?.forEach((ur) => {
        const existing = rolesMap.get(ur.user_id) || [];
        existing.push(ur.role as AppRole);
        rolesMap.set(ur.user_id, existing);
      });

      return (profiles || []).map((profile) => ({
        ...profile,
        roles: rolesMap.get(profile.id) || [],
      }));
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      first_name,
      last_name,
      avatar_url,
    }: {
      id: string;
      first_name?: string;
      last_name?: string | null;
      avatar_url?: string | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name, last_name, avatar_url })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
