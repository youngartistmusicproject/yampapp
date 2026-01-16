import { useState } from 'react';
import { useProfiles, ProfileWithRoles } from '@/hooks/useProfiles';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Shield, Mail, Building2, Copy, Check, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  expires_at: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export default function UserManagement() {
  const { data: profiles, isLoading } = useProfiles();
  const { session, currentOrganization, isSuperAdmin, isOrgAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form state for inviting new user
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('staff');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Fetch pending invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!currentOrganization?.id,
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      const response = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          organization_id: currentOrganization.id,
          first_name: inviteFirstName || null,
          last_name: inviteLastName || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invitation');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setGeneratedLink(data.invitation?.invite_link || null);
      toast.success('Invitation created successfully');
    },
    onError: (error: Error) => {
      setInviteError(error.message);
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel invitation');
    },
  });

  const resetForm = () => {
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInviteRole('staff');
    setInviteError(null);
    setGeneratedLink(null);
  };

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setGeneratedLink(null);
    sendInvitationMutation.mutate();
  };

  const copyToClipboard = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(link);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canInviteUsers = isSuperAdmin || isOrgAdmin;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and invitations
          </p>
          {currentOrganization && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Managing: <strong>{currentOrganization.name}</strong></span>
            </div>
          )}
        </div>

        {canInviteUsers && (
          <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
            setInviteDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={!currentOrganization}>
                <Mail className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to join{' '}
                  <strong>{currentOrganization?.name}</strong>. They will receive
                  a link to create their account.
                </DialogDescription>
              </DialogHeader>

              {generatedLink ? (
                <div className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      Invitation created! Share this link with <strong>{inviteEmail}</strong>:
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Input value={generatedLink} readOnly className="text-sm" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedLink)}
                    >
                      {copiedLink === generatedLink ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                      Done
                    </Button>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Another
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInvitation} className="space-y-4 mt-4">
                  {inviteError && (
                    <Alert variant="destructive">
                      <AlertDescription>{inviteError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name (optional)</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={inviteFirstName}
                        onChange={(e) => setInviteFirstName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name (optional)</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={inviteLastName}
                        onChange={(e) => setInviteLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as AppRole)}
                    >
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
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={sendInvitationMutation.isPending}
                    >
                      {sendInvitationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations
            {invitations && invitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {invitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((profile) => {
                  const fullName = getFullName(profile.first_name, profile.last_name);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={{
                              id: profile.id,
                              name: fullName,
                              email: profile.email || '',
                              avatar: profile.avatar_url || undefined,
                              role: profile.roles[0] || 'staff',
                            }}
                            size="sm"
                            showTooltip={false}
                          />
                          <span className="font-medium">{fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profile.roles.length > 0 ? (
                            profile.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className={ROLE_COLORS[role]}
                              >
                                {ROLE_LABELS[role]}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No role assigned
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!profiles || profiles.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">No users found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitationsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : invitations && invitations.length > 0 ? (
                  invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {invitation.first_name || invitation.last_name
                          ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_COLORS[invitation.role]}>
                          {ROLE_LABELS[invitation.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                          disabled={deleteInvitationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">No pending invitations</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
