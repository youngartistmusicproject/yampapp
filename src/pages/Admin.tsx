import { useState, useEffect } from 'react';
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
import { useProfiles, ProfileWithRoles } from '@/hooks/useProfiles';
import { getFullName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
import { ImageCropDialog } from '@/components/settings/ImageCropDialog';
import {
  Loader2,
  Plus,
  Shield,
  Mail,
  Building2,
  Copy,
  Check,
  Trash2,
  Clock,
  Crown,
  Palette,
  Upload,
  X,
  Users,
} from 'lucide-react';
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

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  expires_at: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export default function Admin() {
  const { session, currentOrganization, isSuperAdmin, isOrgAdmin, refreshProfile } = useAuth();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: allOrganizations, isLoading: loadingOrgs } = useAllOrganizations();
  const { data: members, isLoading: loadingMembers } = useOrganizationMembers(currentOrganization?.id);
  const queryClient = useQueryClient();

  const createOrgMutation = useCreateOrganization();
  const addMemberMutation = useAddOrganizationMember();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveOrganizationMember();

  // Dialog states
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);

  // Org creation form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Member form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff');

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('staff');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Branding form state
  const [brandingAppName, setBrandingAppName] = useState(currentOrganization?.app_name || '');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState(currentOrganization?.primary_color || '#6366f1');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  // Image crop dialog state
  const [logoCropDialogOpen, setLogoCropDialogOpen] = useState(false);
  const [faviconCropDialogOpen, setFaviconCropDialogOpen] = useState(false);
  const [selectedLogoSrc, setSelectedLogoSrc] = useState<string | null>(null);
  const [selectedFaviconSrc, setSelectedFaviconSrc] = useState<string | null>(null);

  // Sync branding form state when organization changes
  useEffect(() => {
    if (currentOrganization) {
      setBrandingAppName(currentOrganization.app_name || '');
      setBrandingPrimaryColor(currentOrganization.primary_color || '#6366f1');
    }
  }, [currentOrganization]);

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

  // Branding update mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (branding: {
      app_name?: string | null;
      primary_color?: string | null;
      favicon_url?: string | null;
      logo_url?: string | null;
    }) => {
      if (!currentOrganization) throw new Error('No organization selected');

      const { error } = await supabase
        .from('organizations')
        .update(branding)
        .eq('id', currentOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      refreshProfile();
      toast.success('Branding updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update branding');
    },
  });

  // Invitation mutations
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

  // Handlers
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedLogoSrc(reader.result as string);
      setLogoCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleLogoCropComplete = async (croppedBlob: Blob) => {
    if (!currentOrganization) return;

    setIsUploadingLogo(true);
    setLogoCropDialogOpen(false);

    try {
      const fileName = `${currentOrganization.id}/logo.png`;

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, croppedBlob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);

      // Add cache-busting parameter
      const urlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;
      await updateBrandingMutation.mutateAsync({ logo_url: urlWithCacheBust });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      setSelectedLogoSrc(null);
    }
  };

  const handleRemoveLogo = async () => {
    await updateBrandingMutation.mutateAsync({ logo_url: null });
  };

  const handleFaviconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFaviconSrc(reader.result as string);
      setFaviconCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleFaviconCropComplete = async (croppedBlob: Blob) => {
    if (!currentOrganization) return;

    setIsUploadingFavicon(true);
    setFaviconCropDialogOpen(false);

    try {
      const fileName = `${currentOrganization.id}/favicon.png`;

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, croppedBlob, {
          upsert: true,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);

      // Add cache-busting parameter
      const urlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;
      await updateBrandingMutation.mutateAsync({ favicon_url: urlWithCacheBust });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload favicon');
    } finally {
      setIsUploadingFavicon(false);
      setSelectedFaviconSrc(null);
    }
  };

  const handleRemoveFavicon = async () => {
    await updateBrandingMutation.mutateAsync({ favicon_url: null });
  };

  const handleSaveBranding = async () => {
    await updateBrandingMutation.mutateAsync({
      app_name: brandingAppName || null,
      primary_color: brandingPrimaryColor || null,
    });
  };

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

  const resetInviteForm = () => {
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

  // Get users not yet in the organization
  const availableUsers = profiles?.filter(
    (profile) => !members?.some((m) => m.user_id === profile.id)
  );

  const isLoading = profilesLoading || loadingOrgs || loadingMembers;
  const canInviteUsers = isSuperAdmin || isOrgAdmin;

  if (isLoading) {
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
            <Shield className="h-6 w-6" />
            Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization, users, and invitations
          </p>
          {currentOrganization && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>
                Current: <strong>{currentOrganization.name}</strong>
              </span>
            </div>
          )}
        </div>

        {canInviteUsers && (
          <Dialog
            open={inviteDialogOpen}
            onOpenChange={(open) => {
              setInviteDialogOpen(open);
              if (!open) resetInviteForm();
            }}
          >
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
                  <strong>{currentOrganization?.name}</strong>. They will receive a
                  link to create their account.
                </DialogDescription>
              </DialogHeader>

              {generatedLink ? (
                <div className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      Invitation created! Share this link with{' '}
                      <strong>{inviteEmail}</strong>:
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
                    <Button onClick={resetInviteForm}>
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
                    <Button type="submit" disabled={sendInvitationMutation.isPending}>
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

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="users">
            Users
            {invitations && invitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {invitations.length} pending
              </Badge>
            )}
          </TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="all-orgs">All Organizations</TabsTrigger>}
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="mt-4 space-y-6">
          {/* Branding Settings */}
          {currentOrganization && isOrgAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Branding Settings
                </CardTitle>
                <CardDescription>
                  Customize the app appearance for your organization (whitelabeling)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center gap-4">
                    {currentOrganization.logo_url ? (
                      <div className="relative">
                        <img
                          src={currentOrganization.logo_url}
                          alt="Organization logo"
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: brandingPrimaryColor }}
                      >
                        {currentOrganization.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted/50 transition-colors">
                          {isUploadingLogo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span>Upload Logo</span>
                        </div>
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileSelect}
                        disabled={isUploadingLogo}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: Square image, at least 128x128px
                      </p>
                    </div>
                  </div>
                </div>

                {/* App Name */}
                <div className="space-y-2">
                  <Label htmlFor="app-name">App Name</Label>
                  <Input
                    id="app-name"
                    placeholder="WorkOS"
                    value={brandingAppName}
                    onChange={(e) => setBrandingAppName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom name shown in the sidebar and browser tab. Leave empty for
                    default.
                  </p>
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="primary-color"
                      value={brandingPrimaryColor}
                      onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandingPrimaryColor}
                      onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                      placeholder="#6366f1"
                      className="w-32"
                    />
                    <div
                      className="w-10 h-10 rounded-lg"
                      style={{ backgroundColor: brandingPrimaryColor }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used throughout the app for buttons, links, and accents
                  </p>
                </div>

                {/* Favicon */}
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    {currentOrganization?.favicon_url ? (
                      <div className="relative">
                        <img
                          src={currentOrganization.favicon_url}
                          alt="Favicon"
                          className="w-8 h-8 rounded object-cover border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-5 w-5"
                          onClick={handleRemoveFavicon}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">ico</span>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="favicon-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted/50 transition-colors">
                          {isUploadingFavicon ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span>Upload Favicon</span>
                        </div>
                      </Label>
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/*,.ico"
                        className="hidden"
                        onChange={handleFaviconFileSelect}
                        disabled={isUploadingFavicon}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Square image, 32x32 or 64x64px recommended
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveBranding}
                  disabled={updateBrandingMutation.isPending}
                >
                  {updateBrandingMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Branding
                </Button>
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
                                    {getFullName(profile.first_name, profile.last_name)} (
                                    {profile.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                              value={selectedRole}
                              onValueChange={(v) => setSelectedRole(v as AppRole)}
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
                              onClick={() => setAddMemberDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={!selectedUserId || addMemberMutation.isPending}
                            >
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-6">
          {/* All Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>
                Platform users with their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Invitations
                {invitations && invitations.length > 0 && (
                  <Badge variant="secondary">{invitations.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Invitations waiting to be accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                            disabled={deleteInvitationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Organizations Tab (Super Admin only) */}
        {isSuperAdmin && (
          <TabsContent value="all-orgs" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      All Organizations
                    </CardTitle>
                    <CardDescription>
                      Platform-wide list of all organizations
                    </CardDescription>
                  </div>

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
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {allOrganizations?.map((org) => (
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
                  {(!allOrganizations || allOrganizations.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No organizations found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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
              from {currentOrganization?.name}? They will lose access to all
              organization data.
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

      {/* Logo Crop Dialog */}
      <ImageCropDialog
        open={logoCropDialogOpen}
        onOpenChange={(open) => {
          setLogoCropDialogOpen(open);
          if (!open) setSelectedLogoSrc(null);
        }}
        imageSrc={selectedLogoSrc || ''}
        onCropComplete={handleLogoCropComplete}
        isProcessing={isUploadingLogo}
        title="Crop Organization Logo"
        description="Adjust your logo to fit a square frame"
        cropShape="rect"
        aspect={1}
        maxOutputSize={512}
        outputFormat="image/png"
      />

      {/* Favicon Crop Dialog */}
      <ImageCropDialog
        open={faviconCropDialogOpen}
        onOpenChange={(open) => {
          setFaviconCropDialogOpen(open);
          if (!open) setSelectedFaviconSrc(null);
        }}
        imageSrc={selectedFaviconSrc || ''}
        onCropComplete={handleFaviconCropComplete}
        isProcessing={isUploadingFavicon}
        title="Crop Favicon"
        description="Adjust your favicon to fit a square frame"
        cropShape="rect"
        aspect={1}
        maxOutputSize={64}
        outputFormat="image/png"
      />
    </div>
  );
}
