import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, FolderKanban, ChevronRight, GripVertical } from "lucide-react";
import { Project, Team, User } from "@/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectDialog } from "./ProjectDialog";
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

interface ProjectManagementPanelProps {
  projects: Project[];
  teams: Team[];
  availableMembers: User[];
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onReorderProjects?: (projects: Project[]) => void;
}

interface SortableProjectRowProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function MemberAvatars({ members }: { members: User[] }) {
  const maxVisible = 7;
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = members.length - maxVisible;

  if (members.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5 shrink-0">
      {visibleMembers.map((member, index) => (
        <div
          key={member.id}
          className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium border-2 border-background"
          style={{ zIndex: maxVisible - index }}
          title={member.name}
        >
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            member.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div 
          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background"
          title={`${remainingCount} more members`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

function SortableProjectRow({ project, onEdit, onDelete }: SortableProjectRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

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
      <MemberAvatars members={project.members || []} />
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

export function ProjectManagementPanel({
  projects,
  teams,
  availableMembers,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onReorderProjects,
}: ProjectManagementPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [localProjects, setLocalProjects] = useState(projects);

  // Keep local projects in sync with props
  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const teamProjects = selectedTeamId 
    ? localProjects.filter(p => p.teamId === selectedTeamId)
    : [];
  const unassignedProjects = localProjects.filter(p => !p.teamId);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const currentTeamProjects = teamProjects;
      const oldIndex = currentTeamProjects.findIndex((p) => p.id === active.id);
      const newIndex = currentTeamProjects.findIndex((p) => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTeamProjects = arrayMove(currentTeamProjects, oldIndex, newIndex);
        
        // Update local state
        const otherProjects = localProjects.filter(p => p.teamId !== selectedTeamId);
        const newLocalProjects = [...otherProjects, ...reorderedTeamProjects];
        setLocalProjects(newLocalProjects);
        
        // Call reorder callback
        onReorderProjects?.(reorderedTeamProjects);
      }
    }
  };

  // Get project count per team
  const getProjectCount = (teamId: string) => {
    return localProjects.filter(p => p.teamId === teamId).length;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSelectedTeamId(null);
      }}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <FolderKanban className="w-3.5 h-3.5" />
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
                  <span>{selectedTeam?.name} Projects</span>
                </button>
              ) : (
                <span>Manage Projects</span>
              )}
            </SheetTitle>
            <SheetDescription>
              {selectedTeamId 
                ? "Create, edit, or remove projects. Drag to reorder."
                : "Select a team to manage its projects."
              }
            </SheetDescription>
          </SheetHeader>
          
          {/* Floating Action Button - only show when viewing team projects */}
          {selectedTeamId && (
            <Button 
              size="icon"
              onClick={() => setCreateDialogOpen(true)}
              className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-10 transition-transform duration-200 hover:scale-110"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
          
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-2">
              {!selectedTeamId ? (
                // Team selection view (no drag and drop here)
                <>
                  {teams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No teams yet</p>
                      <p className="text-xs mt-1">Create a team first to add projects</p>
                    </div>
                  ) : (
                    <>
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/50 transition-colors text-left"
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
                          <Badge variant="secondary" className="shrink-0">
                            {getProjectCount(team.id)} {getProjectCount(team.id) === 1 ? 'project' : 'projects'}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                      
                      {/* Unassigned projects section */}
                      {unassignedProjects.length > 0 && (
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Unassigned Projects
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
                </>
              ) : (
                // Projects view for selected team (with drag and drop)
                <>
                  {teamProjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No projects in this team</p>
                      <p className="text-xs mt-1">Click the + button to create one</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={teamProjects.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {teamProjects.map((project) => (
                            <SortableProjectRow 
                              key={project.id} 
                              project={project} 
                              onEdit={handleEdit} 
                              onDelete={handleDelete} 
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(project) => {
          onCreateProject({
            ...project,
            teamId: selectedTeamId || project.teamId,
          });
          setCreateDialogOpen(false);
        }}
        availableMembers={availableMembers}
        teams={teams}
        selectedTeamId={selectedTeamId || undefined}
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
      <MemberAvatars members={project.members || []} />
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
