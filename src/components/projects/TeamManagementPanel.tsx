import { useState } from "react";
import { Pencil, Trash2, Plus, Users, ChevronRight, UserPlus, X } from "lucide-react";
import { Team, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamDialog } from "./TeamDialog";
import { useTeamMembers, useAddTeamMember, useRemoveTeamMember, useUpdateTeamMemberRole } from "@/hooks/useWorkManagement";
import { teamMembers as availableUsers } from "@/data/workManagementConfig";
import { toast } from "sonner";

interface TeamManagementPanelProps {
  teams: (Team & { memberCount?: number })[];
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => void;
  onDeleteTeam: (teamId: string) => void;
}

const memberRoles = [
  { id: 'admin', label: 'Admin' },
  { id: 'member', label: 'Member' },
  { id: 'viewer', label: 'Viewer' },
];

export function TeamManagementPanel({
  teams,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
}: TeamManagementPanelProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  const { data: teamMembers = [], isLoading: membersLoading } = useTeamMembers(selectedTeamId);
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();
  const updateRole = useUpdateTeamMemberRole();

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
  };

  const handleDelete = (team: Team) => {
    setDeletingTeam(team);
  };

  const confirmDelete = () => {
    if (deletingTeam) {
      onDeleteTeam(deletingTeam.id);
      setDeletingTeam(null);
      if (selectedTeamId === deletingTeam.id) {
        setSelectedTeamId(null);
      }
    }
  };

  const handleAddMember = (userName: string) => {
    if (!selectedTeamId) return;
    
    addMember.mutate(
      { teamId: selectedTeamId, userName },
      {
        onSuccess: () => {
          toast.success(`${userName} added to team`);
          setAddingMember(false);
        },
        onError: () => toast.error('Failed to add member'),
      }
    );
  };

  const handleRemoveMember = (memberId: string, userName: string) => {
    if (!selectedTeamId) return;
    
    removeMember.mutate(
      { memberId, teamId: selectedTeamId },
      {
        onSuccess: () => toast.success(`${userName} removed from team`),
        onError: () => toast.error('Failed to remove member'),
      }
    );
  };

  const handleUpdateRole = (memberId: string, role: string) => {
    if (!selectedTeamId) return;
    
    updateRole.mutate(
      { memberId, teamId: selectedTeamId, role },
      {
        onSuccess: () => toast.success('Role updated'),
        onError: () => toast.error('Failed to update role'),
      }
    );
  };

  // Get users not already in the team
  const availableToAdd = availableUsers.filter(
    u => !teamMembers.some(m => m.userName === u.name)
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <Users className="w-3.5 h-3.5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>
              {selectedTeamId ? (
                <button 
                  onClick={() => setSelectedTeamId(null)}
                  className="flex items-center gap-2 hover:text-muted-foreground transition-colors"
                >
                  <span>←</span>
                  <span>{selectedTeam?.name} Members</span>
                </button>
              ) : (
                <span>Manage Teams</span>
              )}
            </SheetTitle>
          </SheetHeader>
          
          {/* Floating Action Button */}
          {!selectedTeamId && (
            <Button 
              size="icon"
              onClick={() => setCreateDialogOpen(true)}
              className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-10 transition-transform duration-200 hover:scale-110"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
          
          <div className="mt-6 max-h-[calc(100vh-120px)] overflow-y-auto">
            {selectedTeamId ? (
              // Team Members View
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingMember(true)}
                    disabled={availableToAdd.length === 0}
                    className="h-8"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Member
                  </Button>
                </div>

                {addingMember && (
                  <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Add member</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setAddingMember(false)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {availableToAdd.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAddMember(user.name)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm hover:bg-muted transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <span>{user.name}</span>
                          <span className="text-muted-foreground text-xs ml-auto capitalize">{user.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {membersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Loading members...</p>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members yet</p>
                    <p className="text-xs mt-1">Add members to this team</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                          {member.userName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.userName}</p>
                        </div>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.id, value)}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {memberRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id, member.userName)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Teams List View
              <div className="space-y-2">
                {teams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No teams yet</p>
                    <p className="text-xs mt-1">Create your first team to get started</p>
                  </div>
                ) : (
                  teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.color || '#6366f1' }}
                      />
                      <button
                        onClick={() => setSelectedTeamId(team.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{team.name}</p>
                          {(team as any).memberCount > 0 && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {(team as any).memberCount} {(team as any).memberCount === 1 ? 'member' : 'members'}
                            </Badge>
                          )}
                        </div>
                        {team.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {team.description}
                          </p>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(team);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(team);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setSelectedTeamId(team.id)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <TeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(team) => {
          onCreateTeam(team);
          setCreateDialogOpen(false);
        }}
      />

      {/* Edit Dialog */}
      <TeamDialog
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        team={editingTeam || undefined}
        onSubmit={(updates) => {
          if (editingTeam) {
            onUpdateTeam(editingTeam.id, updates);
            setEditingTeam(null);
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTeam?.name}"? This action cannot be undone.
              Projects within this team will no longer be associated with any team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
