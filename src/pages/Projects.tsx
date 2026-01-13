import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Search, FolderPlus, CheckCircle2, RotateCcw, Settings2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable, SortField } from "@/components/projects/TaskTable";
import { TaskKanban } from "@/components/projects/TaskKanban";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { TaskDetailDialog } from "@/components/projects/TaskDetailDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { StatusManager, StatusItem } from "@/components/projects/StatusManager";
import { TaskFilterPanel, TaskFilters } from "@/components/projects/TaskFilterPanel";
import { TeamsProjectsHeader } from "@/components/projects/TeamsProjectsHeader";
import { Task, Project, User, TaskComment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "sonner";

import { teamMembers, statusLibrary as defaultStatuses, tagLibrary, effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { useTasks, useProjects, useTeams, useCreateTask, useUpdateTask, useDeleteTask, useDuplicateTask, useCreateProject } from "@/hooks/useWorkManagement";

// Current user for demo purposes
const currentUser = teamMembers[0];

export default function Projects() {
  const { data: dbTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: dbProjects = [], isLoading: projectsLoading } = useProjects();
  const { data: dbTeams = [] } = useTeams();
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const duplicateTask = useDuplicateTask();
  const createProject = useCreateProject();
  
  const [statuses, setStatuses] = useState<StatusItem[]>(defaultStatuses);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortAscending, setSortAscending] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<TaskFilters>({
    statuses: [],
    efforts: [],
    importances: [],
    assignees: [],
    tags: [],
    showRecurring: null,
    dueDateFrom: undefined,
    dueDateTo: undefined,
    showOverdueOnly: false,
  });

  // Apply filters from URL params
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filterParam === 'overdue') {
        setFilters(prev => ({ ...prev, showOverdueOnly: true }));
      } else if (filterParam === 'today') {
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        setFilters(prev => ({ ...prev, dueDateFrom: today, dueDateTo: endOfToday }));
      } else if (filterParam === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        setFilters(prev => ({ ...prev, dueDateFrom: tomorrow, dueDateTo: endOfTomorrow }));
      }
      
      // Clear the param so it doesn't persist on refresh
      searchParams.delete('filter');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Convert DB projects to the format expected by components
  const projects: Project[] = useMemo(() => {
    return dbProjects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color || '#3b82f6',
      tasks: [],
      members: [] as User[],
      teamId: p.teamId || '',
      createdAt: p.createdAt,
    }));
  }, [dbProjects]);

  // Get all available tags from tasks and tag library
  const availableTags = useMemo(() => {
    return Array.from(new Set([
      ...tagLibrary.map(t => t.name.toLowerCase()),
      ...dbTasks.flatMap(t => t.tags || [])
    ]));
  }, [dbTasks]);

  // Active tasks (not completed)
  const activeTasks = useMemo(() => dbTasks.filter(task => !task.completedAt), [dbTasks]);
  
  // Completed tasks
  const completedTasks = useMemo(() => 
    dbTasks.filter(task => task.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)),
    [dbTasks]
  );

  // Completed status ID
  const completedStatusId = 'completed';

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return activeTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = selectedProject === "all" || task.projectId === selectedProject;
      
      // Team filter - check if task's project belongs to selected team
      const taskProject = projects.find(p => p.id === task.projectId);
      const matchesTeam = selectedTeam === "all" || taskProject?.teamId === selectedTeam || !task.projectId;
      
      // Status filter
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(task.status);
      
      // Effort filter
      const matchesEffort = filters.efforts.length === 0 || filters.efforts.includes(task.effort);
      
      // Importance filter
      const matchesImportance = filters.importances.length === 0 || filters.importances.includes(task.importance);
      
      // Assignee filter
      const matchesAssignee = filters.assignees.length === 0 || 
        task.assignees?.some(a => filters.assignees.includes(a.id));
      
      // Tags filter
      const matchesTags = filters.tags.length === 0 || 
        task.tags?.some(t => filters.tags.includes(t));
      
      // Recurring filter
      const matchesRecurring = filters.showRecurring === null || 
        (filters.showRecurring === true && task.recurrence) ||
        (filters.showRecurring === false && !task.recurrence);
      
      // Due date range filter
      const matchesDueDateFrom = !filters.dueDateFrom || 
        (task.dueDate && new Date(task.dueDate) >= filters.dueDateFrom);
      const matchesDueDateTo = !filters.dueDateTo || 
        (task.dueDate && new Date(task.dueDate) <= filters.dueDateTo);
      
      // Overdue filter
      const matchesOverdue = !filters.showOverdueOnly || 
        (task.dueDate && new Date(task.dueDate) < today && task.status !== 'completed');
      
      return matchesSearch && matchesProject && matchesTeam && matchesStatus && matchesEffort && matchesImportance &&
             matchesAssignee && matchesTags && matchesRecurring && matchesDueDateFrom && matchesDueDateTo && matchesOverdue;
    }).sort((a, b) => {
      // Define sort order for effort and importance
      const effortOrder = effortLibrary.map(e => e.id);
      const importanceOrder = importanceLibrary.map(i => i.id);
      
      if (sortField === 'effort') {
        const aIndex = effortOrder.indexOf(a.effort);
        const bIndex = effortOrder.indexOf(b.effort);
        const comparison = aIndex - bIndex;
        return sortAscending ? comparison : -comparison;
      }
      
      if (sortField === 'importance') {
        const aIndex = importanceOrder.indexOf(a.importance);
        const bIndex = importanceOrder.indexOf(b.importance);
        const comparison = aIndex - bIndex;
        return sortAscending ? comparison : -comparison;
      }
      
      // Default: sort by due date chronologically, tasks without due date go last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return sortAscending ? comparison : -comparison;
    });
  }, [activeTasks, searchQuery, selectedProject, selectedTeam, projects, filters, sortField, sortAscending]);

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask.mutate({ taskId, updates }, {
      onError: (error) => {
        toast.error('Failed to update task');
        console.error(error);
      },
    });
    
    // Update viewing task optimistically
    if (viewingTask?.id === taskId) {
      setViewingTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleEditTask = (task: Task) => {
    setViewingTask(null);
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleViewTask = (task: Task) => {
    // Get latest task data
    const latestTask = dbTasks.find(t => t.id === task.id) || task;
    setViewingTask(latestTask);
  };

  const handleAddComment = (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>, parentCommentId?: string) => {
    // Comments are stored locally for now - would need a comments table for persistence
    toast.info('Comments are not yet persisted to the database');
  };

  const handleToggleReaction = (taskId: string, commentId: string, emoji: string) => {
    // Reactions are stored locally for now
  };

  const handleDeleteComment = (taskId: string, commentId: string) => {
    // Comments are stored locally for now
  };

  const handleRestoreTask = (taskId: string) => {
    updateTask.mutate({ 
      taskId, 
      updates: { status: 'not-started', completedAt: undefined } 
    }, {
      onSuccess: () => toast.success('Task restored'),
      onError: () => toast.error('Failed to restore task'),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success('Task deleted');
        if (viewingTask?.id === taskId) {
          setViewingTask(null);
        }
      },
      onError: () => toast.error('Failed to delete task'),
    });
  };

  const handleDuplicateTask = (taskId: string) => {
    duplicateTask.mutate(taskId, {
      onSuccess: () => toast.success('Task duplicated'),
      onError: () => toast.error('Failed to duplicate task'),
    });
  };

  const handleTaskSubmit = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      // Update existing task
      updateTask.mutate({ 
        taskId: editingTask.id, 
        updates: taskData 
      }, {
        onSuccess: () => {
          toast.success('Task updated');
          setTaskDialogOpen(false);
          setEditingTask(undefined);
        },
        onError: () => toast.error('Failed to update task'),
      });
    } else {
      // Create new task
      createTask.mutate({
        ...taskData,
        projectId: selectedProject !== "all" ? selectedProject : taskData.projectId,
      }, {
        onSuccess: () => {
          toast.success('Task created');
          setTaskDialogOpen(false);
          setEditingTask(undefined);
        },
        onError: () => toast.error('Failed to create task'),
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setTaskDialogOpen(open);
    if (!open) {
      setEditingTask(undefined);
    }
  };

  const handleAddProject = (newProject: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => {
    createProject.mutate({
      name: newProject.name,
      description: newProject.description,
      teamId: newProject.teamId,
      color: newProject.color,
    }, {
      onSuccess: () => {
        toast.success('Project created');
        setProjectDialogOpen(false);
      },
      onError: () => toast.error('Failed to create project'),
    });
  };

  const isLoading = tasksLoading || projectsLoading;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Work Management</h1>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Manage all your projects and tasks in one place</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="rounded-full h-10 w-10 flex-shrink-0">
              <Plus className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTaskDialogOpen(true)} className="gap-2">
              <ListTodo className="w-4 h-4" />
              New Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProjectDialogOpen(true)} className="gap-2">
              <FolderPlus className="w-4 h-4" />
              New Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Teams & Projects Header */}
      <TeamsProjectsHeader
        teams={dbTeams}
        projects={projects}
        tasks={dbTasks}
        selectedTeam={selectedTeam}
        selectedProject={selectedProject}
        onTeamSelect={setSelectedTeam}
        onProjectSelect={setSelectedProject}
        completedStatusId={completedStatusId}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <TaskFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            statuses={statuses}
            availableMembers={teamMembers}
            availableTags={availableTags}
          />
          
          <Button variant="outline" size="sm" className="gap-2 flex-shrink-0" onClick={() => setStatusManagerOpen(true)}>
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Statuses</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Completed</span>
                {completedTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {completedTasks.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[400px] md:w-[540px]">
              <SheetHeader>
                <SheetTitle>Completed Tasks</SheetTitle>
                <SheetDescription>
                  View and restore recently completed tasks
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
                {completedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                    <p>No completed tasks yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-through text-muted-foreground">
                            {task.title}
                          </p>
                          {task.completedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Completed {format(task.completedAt, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-8 flex-shrink-0"
                          onClick={() => handleRestoreTask(task.id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Restore</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table" className="gap-2">
            <List className="w-4 h-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <TaskTable 
              tasks={filteredTasks} 
              onTaskUpdate={handleTaskUpdate} 
              onEditTask={handleEditTask} 
              onViewTask={handleViewTask} 
              onDeleteTask={handleDeleteTask}
              onDuplicateTask={handleDuplicateTask}
              onToggleSort={(field) => {
                if (sortField === field) {
                  setSortAscending(!sortAscending);
                } else {
                  setSortField(field);
                  setSortAscending(true);
                }
              }}
              sortField={sortField}
              sortAscending={sortAscending}
              statuses={statuses} 
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-96 w-80 flex-shrink-0" />
              ))}
            </div>
          ) : (
            <TaskKanban 
              tasks={filteredTasks} 
              onTaskUpdate={handleTaskUpdate} 
              onEditTask={handleEditTask} 
              onViewTask={handleViewTask} 
              onDeleteTask={handleDeleteTask}
              onDuplicateTask={handleDuplicateTask}
              statuses={statuses} 
            />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Timeline view coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        availableMembers={teamMembers}
        statuses={statuses}
        projects={projects}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        task={viewingTask}
        onTaskUpdate={handleTaskUpdate}
        onAddComment={handleAddComment}
        onToggleReaction={handleToggleReaction}
        onDeleteComment={handleDeleteComment}
        currentUser={currentUser}
        availableMembers={teamMembers}
        statuses={statuses}
      />

      {/* Project Dialog */}
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleAddProject}
        availableMembers={teamMembers}
        teams={dbTeams}
      />

      {/* Status Manager */}
      <StatusManager
        open={statusManagerOpen}
        onOpenChange={setStatusManagerOpen}
        statuses={statuses}
        onStatusesChange={setStatuses}
      />
    </div>
  );
}
