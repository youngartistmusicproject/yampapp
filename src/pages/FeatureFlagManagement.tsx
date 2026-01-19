import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useFeatureFlagManagement, FeatureFlag } from '@/hooks/useFeatureFlags';
import { useAllOrganizations } from '@/hooks/useOrganizations';
import { Plus, Trash2, Globe, Building2, Rocket, Flag } from 'lucide-react';
import { toast } from 'sonner';

export default function FeatureFlagManagement() {
  const { allFlags, allOrgFlags, isLoading, createFlag, deleteFlag, toggleOrgFeature, enableForAll, getOrgFlagStatus } = useFeatureFlagManagement();
  const { data: organizations } = useAllOrganizations();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: '', name: '', description: '' });

  const handleCreateFlag = async () => {
    if (!newFlag.key || !newFlag.name) {
      toast.error('Key and name are required');
      return;
    }

    try {
      await createFlag.mutateAsync({
        key: newFlag.key.toLowerCase().replace(/\s+/g, '_'),
        name: newFlag.name,
        description: newFlag.description || undefined,
        is_global: false,
      });
      toast.success('Feature flag created');
      setIsCreateOpen(false);
      setNewFlag({ key: '', name: '', description: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create feature flag');
    }
  };

  const handleDeleteFlag = async (flagId: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return;
    
    try {
      await deleteFlag.mutateAsync(flagId);
      toast.success('Feature flag deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete feature flag');
    }
  };

  const handleToggleOrg = async (organizationId: string, featureFlagId: string, currentEnabled: boolean | null, isGlobal: boolean) => {
    const newEnabled = currentEnabled === null ? !isGlobal : !currentEnabled;
    
    try {
      await toggleOrgFeature.mutateAsync({
        organizationId,
        featureFlagId,
        enabled: newEnabled,
      });
      toast.success(newEnabled ? 'Feature enabled' : 'Feature disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle feature');
    }
  };

  const handleReleaseToAll = async (flagId: string) => {
    try {
      await enableForAll.mutateAsync(flagId);
      toast.success('Feature released to all organizations');
    } catch (error: any) {
      toast.error(error.message || 'Failed to release feature');
    }
  };

  const getEffectiveStatus = (flag: FeatureFlag, organizationId: string): boolean => {
    const orgStatus = getOrgFlagStatus(organizationId, flag.id);
    if (orgStatus !== null) return orgStatus;
    return flag.is_global;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground">
            Control which features are available to each organization
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Feature Flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
              <DialogDescription>
                Add a new feature flag to control feature rollouts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  placeholder="e.g., new_analytics"
                  value={newFlag.key}
                  onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier used in code (will be lowercase with underscores)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., New Analytics Dashboard"
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this feature do?"
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFlag} disabled={createFlag.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {allFlags.map((flag) => {
          const enabledCount = organizations?.filter(org => getEffectiveStatus(flag, org.id)).length || 0;
          const totalCount = organizations?.length || 0;

          return (
            <Card key={flag.id}>
              <Accordion type="single" collapsible>
                <AccordionItem value={flag.id} className="border-0">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{flag.name}</span>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">
                              {flag.key}
                            </code>
                            {flag.is_global && (
                              <Badge variant="secondary" className="gap-1">
                                <Globe className="h-3 w-3" />
                                Global
                              </Badge>
                            )}
                          </div>
                          {flag.description && (
                            <p className="text-sm text-muted-foreground text-left">
                              {flag.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={enabledCount === totalCount ? 'default' : 'outline'}>
                          {enabledCount}/{totalCount} orgs
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-6 pb-4 space-y-4">
                      <div className="flex gap-2">
                        {!flag.is_global && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReleaseToAll(flag.id)}
                            disabled={enableForAll.isPending}
                          >
                            <Rocket className="h-4 w-4 mr-2" />
                            Release to All
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteFlag(flag.id)}
                          disabled={deleteFlag.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Organization</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]">Enabled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizations?.map((org) => {
                            const orgStatus = getOrgFlagStatus(org.id, flag.id);
                            const effectiveStatus = getEffectiveStatus(flag, org.id);
                            const isOverridden = orgStatus !== null;

                            return (
                              <TableRow key={org.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    {org.name}
                                    {(org.slug === 'demo' || org.name.toLowerCase().includes('demo')) && (
                                      <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                                        Demo
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isOverridden ? (
                                    <Badge variant="outline">Overridden</Badge>
                                  ) : (
                                    <Badge variant="secondary">Using Global</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={effectiveStatus}
                                    onCheckedChange={() => handleToggleOrg(org.id, flag.id, orgStatus, flag.is_global)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          );
        })}

        {allFlags.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Feature Flags</h3>
              <p className="text-muted-foreground mb-4">
                Create your first feature flag to start controlling feature rollouts
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Feature Flag
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
