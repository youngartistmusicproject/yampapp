import { useAuth, AppRole } from '@/contexts/AuthContext';

export function useUserRole() {
  const { roles, isAdmin, isSuperAdmin } = useAuth();

  const hasRole = (role: AppRole) => roles.includes(role);

  return {
    roles,
    isAdmin,
    isSuperAdmin,
    isStaff: hasRole('staff'),
    isFaculty: hasRole('faculty'),
    hasRole,
    // Permission checks
    canManageProjects: isAdmin,
    canManageTasks: isAdmin || hasRole('staff'),
    canManageUsers: isSuperAdmin,
    canManageAreas: isAdmin,
    canViewAnalytics: isAdmin,
  };
}
