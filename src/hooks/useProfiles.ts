import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

// Public profile without sensitive email field - for general use
export interface PublicProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Full profile with email - only for admin use
export interface ProfileWithRoles extends Profile {
  roles: AppRole[];
}

// Public profiles hook - excludes email for security
export interface PublicProfileWithRoles extends PublicProfile {
  roles: AppRole[];
}

export function usePublicProfiles() {
  return useQuery({
    queryKey: ['profiles-public'],
    queryFn: async (): Promise<PublicProfileWithRoles[]> => {
      // Fetch profiles - only select non-sensitive fields (exclude email)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, created_at, updated_at')
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

// Organization-scoped profiles hook - returns only profiles of members in current org
export function useOrganizationProfiles() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['profiles-organization', orgId],
    queryFn: async (): Promise<PublicProfileWithRoles[]> => {
      if (!orgId) return [];

      // Fetch organization members first
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const memberIds = members.map(m => m.user_id);

      // Fetch profiles for those members - only non-sensitive fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, created_at, updated_at')
        .in('id', memberIds)
        .order('first_name');

      if (profilesError) throw profilesError;

      // Fetch user roles for these members
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', memberIds);

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
    enabled: !!orgId,
  });
}

// Full profiles hook - includes email, for admin use only
// Note: RLS restricts to own profile, so admins need service role access
// For now, this uses the same query but the calling context determines access
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileWithRoles[]> => {
      // For admin users who can see their own profile's email
      // This query will only return profiles the user has access to via RLS
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
      queryClient.invalidateQueries({ queryKey: ['profiles-public'] });
      queryClient.invalidateQueries({ queryKey: ['profiles-organization'] });
    },
  });
}
