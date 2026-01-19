import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'super-admin' | 'admin' | 'staff' | 'faculty';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  primary_organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  app_name: string | null;
  primary_color: string | null;
  favicon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  organization_id: string;
  role: AppRole;
  organization: Organization;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // Organization context
  currentOrganization: Organization | null;
  organizations: OrganizationMembership[];
  currentOrgRole: AppRole | null;
  isOrgAdmin: boolean;
  switchOrganization: (orgId: string) => void;
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ORG_STORAGE_KEY = 'current_organization_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Organization state
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    return data.map((r) => r.role as AppRole);
  };

  const fetchOrganizations = async (userId: string): Promise<OrganizationMembership[]> => {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations!inner (
          id,
          name,
          slug,
          logo_url,
          app_name,
          primary_color,
          favicon_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }

    // Transform the data to match our interface
    return (data || []).map((item: any) => ({
      organization_id: item.organization_id,
      role: item.role as AppRole,
      organization: item.organizations as Organization,
    }));
  };

  const switchOrganization = (orgId: string) => {
    const membership = organizations.find((m) => m.organization_id === orgId);
    if (membership) {
      setCurrentOrganization(membership.organization);
      localStorage.setItem(ORG_STORAGE_KEY, orgId);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const [profileData, rolesData, orgsData] = await Promise.all([
      fetchProfile(user.id),
      fetchRoles(user.id),
      fetchOrganizations(user.id),
    ]);
    if (profileData) setProfile(profileData);
    setRoles(rolesData);
    setOrganizations(orgsData);

    // If current org is not set, select the first one or from storage
    if (orgsData.length > 0) {
      const storedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
      const storedMembership = storedOrgId 
        ? orgsData.find((m) => m.organization_id === storedOrgId)
        : null;
      
      if (storedMembership) {
        setCurrentOrganization(storedMembership.organization);
      } else {
        // Default to primary org or first available
        const primaryMembership = profileData?.primary_organization_id
          ? orgsData.find((m) => m.organization_id === profileData.primary_organization_id)
          : null;
        
        const defaultOrg = primaryMembership || orgsData[0];
        setCurrentOrganization(defaultOrg.organization);
        localStorage.setItem(ORG_STORAGE_KEY, defaultOrg.organization_id);
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer data fetching to avoid blocking auth state update
          setTimeout(async () => {
            const [profileData, rolesData, orgsData] = await Promise.all([
              fetchProfile(newSession.user.id),
              fetchRoles(newSession.user.id),
              fetchOrganizations(newSession.user.id),
            ]);
            if (profileData) setProfile(profileData);
            setRoles(rolesData);
            setOrganizations(orgsData);

            // Set current organization
            if (orgsData.length > 0) {
              const storedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
              const storedMembership = storedOrgId 
                ? orgsData.find((m) => m.organization_id === storedOrgId)
                : null;
              
              if (storedMembership) {
                setCurrentOrganization(storedMembership.organization);
              } else {
                const primaryMembership = profileData?.primary_organization_id
                  ? orgsData.find((m) => m.organization_id === profileData.primary_organization_id)
                  : null;
                
                const defaultOrg = primaryMembership || orgsData[0];
                setCurrentOrganization(defaultOrg.organization);
                localStorage.setItem(ORG_STORAGE_KEY, defaultOrg.organization_id);
              }
            }

            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setOrganizations([]);
          setCurrentOrganization(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!existingSession) {
        setIsLoading(false);
      }
      // Auth state change listener will handle setting the session
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setOrganizations([]);
    setCurrentOrganization(null);
    localStorage.removeItem(ORG_STORAGE_KEY);
  };

  // Global admin check (platform level)
  const isAdmin = roles.includes('admin') || roles.includes('super-admin');
  const isSuperAdmin = roles.includes('super-admin');

  // Organization-level role
  const currentOrgRole = currentOrganization
    ? organizations.find((m) => m.organization_id === currentOrganization.id)?.role ?? null
    : null;
  
  const isOrgAdmin = currentOrgRole === 'admin' || currentOrgRole === 'super-admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isAdmin,
        isSuperAdmin,
        currentOrganization,
        organizations,
        currentOrgRole,
        isOrgAdmin,
        switchOrganization,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
