import { useState } from "react";
import { Pencil, Trash2, Plus, FolderKanban } from "lucide-react";
import { Project, Team, User } from "@/types";
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
import { ProjectDialog } from "./ProjectDialog";

interface ProjectManagementPanelProps {
  projects: Project[];
  teams: Team[];
  availableMembers: User[];
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectManagementPanel({
  projects,
  teams,
  availableMembers,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: ProjectManagementPanelProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
  };

  const handleDelete = (project: Project) => {
    setDeletingProject(project);
  };

  const confirmDelete = () => {
    if (deletingProject) {
      onDeleteProject(deletingProject.id);
      setDeletingProject(null);
    }
  };

  // Group projects by team
  const projectsByTeam = teams.map(team => ({
    team,
    projects: projects.filter(p => p.teamId === team.id),
  })).filter(group => group.projects.length > 0);

  const unassignedProjects = projects.filter(p => !p.teamId);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <FolderKanban className="w-3.5 h-3.5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Manage Projects</SheetTitle>
          </SheetHeader>
          
          {/* Floating Action Button */}
          <Button 
            size="icon"
            onClick={() => setCreateDialogOpen(true)}
            className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-10 transition-transform duration-200 hover:scale-110"
          >
            <Plus className="w-5 h-5" />
          </Button>
          
          <div className="mt-6 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No projects yet</p>
                <p className="text-xs mt-1">Create your first project to get started</p>
              </div>
            ) : (
              <>
                {projectsByTeam.map(({ team, projects: teamProjects }) => (
                  <div key={team.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: team.color || '#6366f1' }}
                      />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {team.name}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {teamProjects.map((project) => (
                        <ProjectRow 
                          key={project.id} 
                          project={project} 
                          onEdit={handleEdit} 
                          onDelete={handleDelete} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {unassignedProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Unassigned
                      </span>
                    </div>
                    <div className="space-y-2">
                      {unassignedProjects.map((project) => (
                        <ProjectRow 
                          key={project.id} 
                          project={project} 
                          onEdit={handleEdit} 
                          onDelete={handleDelete} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(project) => {
          onCreateProject(project);
          setCreateDialogOpen(false);
        }}
        availableMembers={availableMembers}
        teams={teams}
      />

      {/* Edit Dialog */}
      <ProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        project={editingProject || undefined}
        onSubmit={(updates) => {
          if (editingProject) {
            onUpdateProject(editingProject.id, updates);
            setEditingProject(null);
          }
        }}
        availableMembers={availableMembers}
        teams={teams}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProject?.name}"? This action cannot be undone.
              Tasks within this project will no longer be associated with any project.
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

function ProjectRow({ 
  project, 
  onEdit, 
  onDelete 
}: { 
  project: Project; 
  onEdit: (project: Project) => void; 
  onDelete: (project: Project) => void; 
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group"
    >
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: project.color || '#3b82f6' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {project.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(project)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(project)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
