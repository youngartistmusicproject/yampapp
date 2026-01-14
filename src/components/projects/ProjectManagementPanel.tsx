import { useState, useEffect, useMemo } from "react";
import { Pencil, Trash2, Plus, FolderKanban, GripVertical, Crown, Search, Tag, Filter } from "lucide-react";
import { Project, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserAvatarGroup } from "@/components/ui/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectDialog } from "./ProjectDialog";
import { useAreas } from "@/hooks/useAreas";
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
  availableMembers: User[];
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onReorderProjects?: (projects: Project[]) => void;
}

function SortableProjectRow({ project, onEdit, onDelete }: { project: Project; onEdit: (project: Project) => void; onDelete: (project: Project) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const projectArea = (project as any).area;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group">
      <button {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || '#3b82f6' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {project.description && <p className="text-xs text-muted-foreground truncate">{project.description}</p>}
          {projectArea && (
            <Badge
              variant="secondary"
              className="text-[10px] h-4 px-1.5"
              style={{
                backgroundColor: `${projectArea.color}20`,
                color: projectArea.color,
                borderColor: `${projectArea.color}40`,
              }}
            >
              {projectArea.name}
            </Badge>
          )}
        </div>
      </div>
      {project.owners && project.owners.length > 0 && (
        <div className="flex -space-x-1.5">
          {project.owners.slice(0, 2).map((owner) => (
            <Tooltip key={owner.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <UserAvatar user={owner} size="sm" showTooltip={false} />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Crown className="w-2 h-2 text-white" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent><p className="font-medium">{owner.name}</p><p className="text-xs text-amber-500">Lead</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
      {project.members && project.members.length > 0 && <UserAvatarGroup users={project.members} max={2} size="sm" />}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(project)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(project)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

export function ProjectManagementPanel({ projects, availableMembers, onCreateProject, onUpdateProject, onDeleteProject, onReorderProjects }: ProjectManagementPanelProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [localProjects, setLocalProjects] = useState(projects);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");

  const { data: areas = [] } = useAreas();

  useEffect(() => { setLocalProjects(projects); }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = localProjects;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter by area
    if (selectedAreaId !== "all") {
      result = result.filter(p => (p as any).areaId === selectedAreaId);
    }
    
    return result;
  }, [localProjects, searchQuery, selectedAreaId]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localProjects.findIndex((p) => p.id === active.id);
      const newIndex = localProjects.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(localProjects, oldIndex, newIndex);
        setLocalProjects(reordered);
        onReorderProjects?.(reordered);
      }
    }
  };

  const activeFilterCount = (selectedAreaId !== "all" ? 1 : 0);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground">
            <FolderKanban className="w-3.5 h-3.5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Manage Projects</SheetTitle>
            <SheetDescription>Create, edit, or remove projects. Drag to reorder.</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-3 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-border/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                <SelectTrigger className="h-8 text-sm border-border/50 bg-transparent flex-1">
                  <SelectValue placeholder="Filter by area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: area.color }}
                        />
                        <span>{area.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setSelectedAreaId("all")}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <Button size="icon" onClick={() => setCreateDialogOpen(true)} className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-10 transition-transform duration-200 hover:scale-110">
            <Plus className="w-5 h-5" />
          </Button>
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-2">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{searchQuery || selectedAreaId !== "all" ? "No projects found" : "No projects yet"}</p>
                  <p className="text-xs mt-1">{searchQuery || selectedAreaId !== "all" ? "Try different filters" : "Click the + button to create one"}</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {filteredProjects.map((project) => (
                        <SortableProjectRow key={project.id} project={project} onEdit={setEditingProject} onDelete={setDeletingProject} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <ProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={(p) => { onCreateProject(p); setCreateDialogOpen(false); }} availableMembers={availableMembers} />
      <ProjectDialog open={!!editingProject} onOpenChange={(o) => !o && setEditingProject(null)} project={editingProject || undefined} onSubmit={(u) => { if (editingProject) { onUpdateProject(editingProject.id, u); setEditingProject(null); } }} availableMembers={availableMembers} />
      <AlertDialog open={!!deletingProject} onOpenChange={(o) => !o && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete project?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{deletingProject?.name}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deletingProject) { onDeleteProject(deletingProject.id); setDeletingProject(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}