import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_global: boolean;
  created_at: string;
}

export interface OrganizationFeatureFlag {
  id: string;
  organization_id: string;
  feature_flag_id: string;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
  created_at: string;
}

export function useFeatureFlags() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all feature flags
  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  // Fetch organization-specific feature flag settings
  const { data: orgFeatureFlags = [], isLoading: orgFlagsLoading } = useQuery({
    queryKey: ['org-feature-flags', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .select('*')
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      return data as OrganizationFeatureFlag[];
    },
    enabled: !!currentOrganization?.id,
  });

  // Check if a specific feature is enabled for the current organization
  const isFeatureEnabled = (featureKey: string): boolean => {
    const flag = featureFlags.find(f => f.key === featureKey);
    if (!flag) return false;
    
    // If global, check if there's an explicit org override
    const orgFlag = orgFeatureFlags.find(of => of.feature_flag_id === flag.id);
    
    if (orgFlag) {
      return orgFlag.enabled;
    }
    
    // If no org-specific setting, use global default
    return flag.is_global;
  };

  // Get all enabled features for current organization
  const enabledFeatures = featureFlags
    .filter(flag => isFeatureEnabled(flag.key))
    .map(flag => flag.key);

  return {
    featureFlags,
    orgFeatureFlags,
    isLoading: flagsLoading || orgFlagsLoading,
    isFeatureEnabled,
    enabledFeatures,
  };
}

export function useFeatureFlag(featureKey: string) {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();
  
  return {
    isEnabled: isFeatureEnabled(featureKey),
    isLoading,
  };
}

export function useFeatureFlagManagement() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Fetch all feature flags with org status for admin view
  const { data: allFlags = [], isLoading } = useQuery({
    queryKey: ['all-feature-flags-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  // Fetch all org feature flag assignments
  const { data: allOrgFlags = [] } = useQuery({
    queryKey: ['all-org-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .select('*');
      
      if (error) throw error;
      return data as OrganizationFeatureFlag[];
    },
  });

  // Create a new feature flag
  const createFlag = useMutation({
    mutationFn: async (flag: { key: string; name: string; description?: string; is_global?: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert(flag)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['all-feature-flags-admin'] });
    },
  });

  // Delete a feature flag
  const deleteFlag = useMutation({
    mutationFn: async (flagId: string) => {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', flagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['all-feature-flags-admin'] });
    },
  });

  // Toggle feature for a specific organization
  const toggleOrgFeature = useMutation({
    mutationFn: async ({ 
      organizationId, 
      featureFlagId, 
      enabled 
    }: { 
      organizationId: string; 
      featureFlagId: string; 
      enabled: boolean;
    }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('organization_feature_flags')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('feature_flag_id', featureFlagId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('organization_feature_flags')
          .update({ 
            enabled, 
            enabled_at: enabled ? new Date().toISOString() : null,
            enabled_by: enabled ? profile?.id : null,
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('organization_feature_flags')
          .insert({
            organization_id: organizationId,
            feature_flag_id: featureFlagId,
            enabled,
            enabled_at: enabled ? new Date().toISOString() : null,
            enabled_by: enabled ? profile?.id : null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['all-org-feature-flags'] });
    },
  });

  // Enable feature for all organizations
  const enableForAll = useMutation({
    mutationFn: async (featureFlagId: string) => {
      // Update the flag to be global
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_global: true })
        .eq('id', featureFlagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['all-feature-flags-admin'] });
    },
  });

  // Get org feature status for a specific flag
  const getOrgFlagStatus = (organizationId: string, featureFlagId: string): boolean | null => {
    const orgFlag = allOrgFlags.find(
      of => of.organization_id === organizationId && of.feature_flag_id === featureFlagId
    );
    return orgFlag ? orgFlag.enabled : null;
  };

  return {
    allFlags,
    allOrgFlags,
    isLoading,
    createFlag,
    deleteFlag,
    toggleOrgFeature,
    enableForAll,
    getOrgFlagStatus,
  };
}
