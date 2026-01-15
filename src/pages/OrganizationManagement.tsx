import { useState } from 'react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import {
  useAllOrganizations,
  useCreateOrganization,
  useOrganizationMembers,
  useAddOrganizationMember,
  useUpdateMemberRole,
  useRemoveOrganizationMember,
  generateSlug,
  OrganizationMember,
} from '@/hooks/useOrganizations';
import { useProfiles } from '@/hooks/useProfiles';
import { getFullName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, Users, Crown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<AppRole, string> = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  faculty: 'Faculty',
};

const ROLE_COLORS: Record<AppRole, string> = {
  'super-admin': 'bg-red-500/10 text-red-500 border-red-500/20',
  admin: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  staff: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  faculty: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export default function OrganizationManagement() {
  const { isSuperAdmin, currentOrganization, isOrgAdmin } = useAuth();
  const { data: allOrganizations, isLoading: loadingOrgs } = useAllOrganizations();
  const { data: profiles } = useProfiles();
  const { data: members, isLoading: loadingMembers } = useOrganizationMembers(currentOrganization?.id);
  
  const createOrgMutation = useCreateOrganization();
  const addMemberMutation = useAddOrganizationMember();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveOrganizationMember();

  // Dialog states
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);

  // Form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await createOrgMutation.mutateAsync({
        name: newOrgName,
        slug: newOrgSlug || generateSlug(newOrgName),
      });
      setCreateOrgDialogOpen(false);
      setNewOrgName('');
      setNewOrgSlug('');
      toast.success('Organization created successfully');
    } catch (error: any) {
      setCreateError(error.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !selectedUserId) return;

    try {
      await addMemberMutation.mutateAsync({
        organizationId: currentOrganization.id,
        userId: selectedUserId,
        role: selectedRole,
      });
      setAddMemberDialogOpen(false);
      setSelectedUserId('');
      setSelectedRole('staff');
      toast.success('Member added successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateRole = async (member: OrganizationMember, newRole: AppRole) => {
    if (!currentOrganization) return;

    try {
      await updateRoleMutation.mutateAsync({
        memberId: member.id,
        organizationId: currentOrganization.id,
        role: newRole,
      });
      toast.success('Role updated successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentOrganization) return;

    try {
      await removeMemberMutation.mutateAsync({
        memberId: memberToRemove.id,
        organizationId: currentOrganization.id,
      });
      setMemberToRemove(null);
      toast.success('Member removed successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Get users not yet in the organization
  const availableUsers = profiles?.filter(
    (profile) => !members?.some((m) => m.user_id === profile.id)
  );

  if (loadingOrgs || loadingMembers) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Organization Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations and their members
          </p>
        </div>

        {isSuperAdmin && (
          <Dialog open={createOrgDialogOpen} onOpenChange={setCreateOrgDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization for a company or team.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateOrg} className="space-y-4 mt-4">
                {createError && (
                  <Alert variant="destructive">
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="Acme Corporation"
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value);
                      if (!newOrgSlug) {
                        setNewOrgSlug(generateSlug(e.target.value));
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgSlug">URL Slug</Label>
                  <Input
                    id="orgSlug"
                    placeholder="acme-corporation"
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier used in URLs
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOrgDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOrgMutation.isPending}>
                    {createOrgMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Super-admin: All Organizations List */}
      {isSuperAdmin && allOrganizations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Organizations</CardTitle>
            <CardDescription>
              Platform-wide list of all organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {allOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">/{org.slug}</p>
                    </div>
                  </div>
                  {org.id === currentOrganization?.id && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </div>
              ))}
              {allOrganizations.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No organizations found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Organization Members */}
      {currentOrganization && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {currentOrganization.name} Members
                </CardTitle>
                <CardDescription>
                  Manage members and roles for this organization
                </CardDescription>
              </div>
              
              {isOrgAdmin && (
                <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Member</DialogTitle>
                      <DialogDescription>
                        Add an existing user to this organization.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddMember} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers?.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {getFullName(profile.first_name, profile.last_name)} ({profile.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="faculty">Faculty</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {isSuperAdmin && (
                              <SelectItem value="super-admin">Super Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddMemberDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={!selectedUserId || addMemberMutation.isPending}>
                          {addMemberMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Add
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isOrgAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => {
                  const fullName = member.profile
                    ? getFullName(member.profile.first_name, member.profile.last_name)
                    : 'Unknown User';
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={{
                              id: member.user_id,
                              name: fullName,
                              email: member.profile?.email || '',
                              avatar: member.profile?.avatar_url || undefined,
                              role: member.role,
                            }}
                            size="sm"
                            showTooltip={false}
                          />
                          <div>
                            <span className="font-medium">{fullName}</span>
                            <p className="text-xs text-muted-foreground">
                              {member.profile?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOrgAdmin ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleUpdateRole(member, v as AppRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="faculty">Faculty</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              {isSuperAdmin && (
                                <SelectItem value="super-admin">Super Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={ROLE_COLORS[member.role]}>
                            {member.role === 'super-admin' || member.role === 'admin' ? (
                              <Crown className="h-3 w-3 mr-1" />
                            ) : null}
                            {ROLE_LABELS[member.role]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      {isOrgAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {(!members || members.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">No members found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              {memberToRemove?.profile
                ? getFullName(memberToRemove.profile.first_name, memberToRemove.profile.last_name)
                : 'this user'}{' '}
              from {currentOrganization?.name}? They will lose access to all organization data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
