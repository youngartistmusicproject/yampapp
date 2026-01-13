import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Users, ChevronRight, UserPlus, X, GripVertical, Star } from "lucide-react";
import { Team, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TeamDialog } from "./TeamDialog";
import { useTeamMembers, useAddTeamMember, useRemoveTeamMember, useUpdateTeamMemberRole } from "@/hooks/useWorkManagement";
import { teamMembers as availableUsers } from "@/data/workManagementConfig";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TeamManagementPanelProps {
  teams: (Team & { memberCount?: number })[];
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => void;
  onDeleteTeam: (teamId: string) => void;
  onReorderTeams?: (teams: Team[]) => void;
}

interface SortableTeamItemProps {
  team: Team & { memberCount?: number };
  onSelect: (teamId: string) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

function SortableTeamItem({ team, onSelect, onEdit, onDelete }: SortableTeamItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: team.color || '#6366f1' }}
      />
      <button
        onClick={() => onSelect(team.id)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{team.name}</p>
          <Badge variant="secondary" className="text-xs h-5">
            {team.memberCount && team.memberCount > 0 
              ? `${team.memberCount} ${team.memberCount === 1 ? 'member' : 'members'}`
              : 'No members'}
          </Badge>
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
            onEdit(team);
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
            onDelete(team);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onSelect(team.id)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function TeamManagementPanel({
  teams,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onReorderTeams,
}: TeamManagementPanelProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [localTeams, setLocalTeams] = useState(teams);

  // Keep local teams in sync with props when teams change
  useEffect(() => {
    setLocalTeams(teams);
  }, [teams]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleToggleTeamLeader = (memberId: string, isCurrentlyLeader: boolean) => {
    if (!selectedTeamId) return;
    
    const newRole = isCurrentlyLeader ? 'member' : 'leader';
    updateRole.mutate(
      { memberId, teamId: selectedTeamId, role: newRole },
      {
        onSuccess: () => toast.success(isCurrentlyLeader ? 'Removed as Team Leader' : 'Made Team Leader'),
        onError: () => toast.error('Failed to update role'),
      }
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = localTeams.findIndex((t) => t.id === active.id);
      const newIndex = localTeams.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(localTeams, oldIndex, newIndex);
      setLocalTeams(reordered);
      onReorderTeams?.(reordered);
    }
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
        <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
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
            <SheetDescription>
              {selectedTeamId 
                ? "Add or remove team members. Toggle to make someone a Team Leader."
                : "Create, edit, or remove teams. Drag to reorder."
              }
            </SheetDescription>
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
          
          <ScrollArea className="flex-1">
            <div className="px-6 py-5">
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
                      {/* Sort team leaders first */}
                      {[...teamMembers]
                        .sort((a, b) => {
                          const aIsLeader = a.role === 'leader' || a.role === 'admin';
                          const bIsLeader = b.role === 'leader' || b.role === 'admin';
                          if (aIsLeader && !bIsLeader) return -1;
                          if (!aIsLeader && bIsLeader) return 1;
                          return a.userName.localeCompare(b.userName);
                        })
                        .map((member) => {
                          const isLeader = member.role === 'leader' || member.role === 'admin';
                          return (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium relative">
                                {member.userName.charAt(0)}
                                {isLeader && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                    <Star className="w-2.5 h-2.5 text-white fill-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.userName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {isLeader ? 'Team Leader' : 'Member'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                  <span>Team Leader</span>
                                  <Switch
                                    checked={isLeader}
                                    onCheckedChange={() => handleToggleTeamLeader(member.id, isLeader)}
                                  />
                                </label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMember(member.id, member.userName)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                // Teams List View with DnD
                <div className="space-y-2">
                  {localTeams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No teams yet</p>
                      <p className="text-xs mt-1">Create your first team to get started</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={localTeams.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {localTeams.map((team) => (
                          <SortableTeamItem
                            key={team.id}
                            team={team}
                            onSelect={setSelectedTeamId}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
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
