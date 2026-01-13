import { useState } from "react";
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Team } from "@/types";
import { Button } from "@/components/ui/button";
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
import { TeamDialog } from "./TeamDialog";

interface TeamManagementPanelProps {
  teams: Team[];
  onCreateTeam: (team: Omit<Team, 'id'>) => void;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => void;
  onDeleteTeam: (teamId: string) => void;
}

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
    }
  };

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
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Manage Teams</span>
              <Button 
                size="sm" 
                onClick={() => setCreateDialogOpen(true)}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Team
              </Button>
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-2">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{team.name}</p>
                    {team.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(team)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(team)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
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
