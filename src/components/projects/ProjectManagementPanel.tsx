import { useState, useEffect, useMemo } from "react";
import { Pencil, Trash2, Plus, FolderKanban, GripVertical, Crown, Search, Check, ChevronDown, X } from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectDialog } from "./ProjectDialog";
import { useAreas } from "@/hooks/useAreas";
import { cn } from "@/lib/utils";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SortableProjectRow({ project, onEdit, onDelete }: { project: Project; onEdit: (project: Project) => void; onDelete: (project: Project) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const projectAreas = project.areas || [];

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group">
      <button {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || '#3b82f6' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {project.description && <p className="text-xs text-muted-foreground truncate mr-1">{project.description}</p>}
          {projectAreas.map((area) => (
            <Badge
              key={area.id}
              variant="secondary"
              className="text-[10px] h-4 px-1.5"
              style={{
                backgroundColor: `${area.color}20`,
                color: area.color,
                borderColor: `${area.color}40`,
              }}
            >
              {area.name}
            </Badge>
          ))}
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

export function ProjectManagementPanel({ projects, availableMembers, onCreateProject, onUpdateProject, onDeleteProject, onReorderProjects, open: controlledOpen, onOpenChange }: ProjectManagementPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [localProjects, setLocalProjects] = useState(projects);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('projectManagement_selectedAreas');
    return saved ? JSON.parse(saved) : [];
  });
  const [areaFilterOpen, setAreaFilterOpen] = useState(false);

  // Persist area filter selection
  useEffect(() => {
    localStorage.setItem('projectManagement_selectedAreas', JSON.stringify(selectedAreaIds));
  }, [selectedAreaIds]);
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
    
    // Filter by areas (multi-select)
    if (selectedAreaIds.length > 0) {
      result = result.filter(p => 
        p.areas?.some(a => selectedAreaIds.includes(a.id))
      );
    }
    
    return result;
  }, [localProjects, searchQuery, selectedAreaIds]);

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

  const toggleArea = (areaId: string) => {
    if (selectedAreaIds.includes(areaId)) {
      setSelectedAreaIds(selectedAreaIds.filter(id => id !== areaId));
    } else {
      setSelectedAreaIds([...selectedAreaIds, areaId]);
    }
  };

  const selectedAreas = areas.filter(a => selectedAreaIds.includes(a.id));

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
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
            <Popover open={areaFilterOpen} onOpenChange={setAreaFilterOpen}>
              <PopoverTrigger asChild>
                <button 
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 text-[13px] rounded-md border border-border/50 bg-transparent hover:bg-muted/50 transition-colors w-full justify-between",
                    selectedAreaIds.length > 0 && "border-primary/50"
                  )}
                >
                  {selectedAreas.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        {selectedAreas.slice(0, 2).map((area) => (
                          <Badge
                            key={area.id}
                            variant="outline"
                            className="h-5 px-1.5 text-[11px] font-medium"
                            style={{ 
                              backgroundColor: `${area.color}20`,
                              borderColor: `${area.color}40`,
                              color: area.color
                            }}
                          >
                            {area.name}
                          </Badge>
                        ))}
                        {selectedAreas.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{selectedAreas.length - 2}
                          </span>
                        )}
                      </div>
                      <X 
                        className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground ml-auto shrink-0" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAreaIds([]);
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Filter by areas</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0 z-[70]" align="start">
                <Command>
                  <CommandInput placeholder="Search areas..." />
                  <CommandList>
                    <CommandEmpty>No areas found.</CommandEmpty>
                    <CommandGroup>
                      {areas.map((area) => (
                        <CommandItem
                          key={area.id}
                          value={area.name}
                          onSelect={() => toggleArea(area.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedAreaIds.includes(area.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div
                            className="w-3 h-3 rounded-full mr-2 shrink-0"
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="truncate">{area.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <Button size="icon" onClick={() => setCreateDialogOpen(true)} className="absolute bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-10 transition-transform duration-200 hover:scale-110">
            <Plus className="w-5 h-5" />
          </Button>
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-2">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{searchQuery || selectedAreaIds.length > 0 ? "No projects found" : "No projects yet"}</p>
                  <p className="text-xs mt-1">{searchQuery || selectedAreaIds.length > 0 ? "Try different filters" : "Click the + button to create one"}</p>
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