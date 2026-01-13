import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Search, FolderPlus, Settings2, ListTodo, X, GripVertical, ChevronDown, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable, SortField } from "@/components/projects/TaskTable";
import { TaskKanban } from "@/components/projects/TaskKanban";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { TaskDetailDialog } from "@/components/projects/TaskDetailDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ProjectManagementPanel } from "@/components/projects/ProjectManagementPanel";
import { StatusManager, StatusItem } from "@/components/projects/StatusManager";
import { TagManager, TagItem } from "@/components/projects/TagManager";
import { TaskFilterPanel, TaskFilters } from "@/components/projects/TaskFilterPanel";
import { CompletedTasksPanel } from "@/components/projects/CompletedTasksPanel";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

import { teamMembers, statusLibrary as defaultStatuses, tagLibrary, effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { useTasks, useProjects, useCreateTask, useUpdateTask, useDeleteTask, useDuplicateTask, useCreateProject, useUpdateProject, useDeleteProject, useReorderTasks, useCompleteRecurringTask, useReorderProjects } from "@/hooks/useWorkManagement";

// Current user for demo purposes
const currentUser = teamMembers[0];

export default function Projects() {
  const { data: dbTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: dbProjects = [], isLoading: projectsLoading } = useProjects();
  
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const duplicateTask = useDuplicateTask();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const reorderTasks = useReorderTasks();
  const completeRecurringTask = useCompleteRecurringTask();
  const reorderProjects = useReorderProjects();
  
  const [statuses, setStatuses] = useState<StatusItem[]>(defaultStatuses);
  const [tags, setTags] = useState<TagItem[]>(tagLibrary);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>(() => {
    return localStorage.getItem('workManagement_selectedProject') || 'all';
  });
  const [selectedMember, setSelectedMember] = useState<string>(() => {
    return localStorage.getItem('workManagement_selectedMember') || 'all';
  });
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortAscending, setSortAscending] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'upcoming'>('all');
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
  const [showTaskDetails, setShowTaskDetails] = useState(() => {
    const saved = localStorage.getItem('showTaskDetails');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [activeView, setActiveView] = useState<'table' | 'kanban'>('table');

  // Persist showTaskDetails preference
  useEffect(() => {
    localStorage.setItem('showTaskDetails', JSON.stringify(showTaskDetails));
  }, [showTaskDetails]);

  // Reset to Due Date sort when switching to Kanban if Stage sort is selected
  useEffect(() => {
    if (activeView === 'kanban' && sortField === 'stage') {
      setSortField('dueDate');
      setSortAscending(true);
    }
  }, [activeView, sortField]);

  // Apply filters from URL params
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      if (filterParam === 'overdue') {
        setQuickFilter('overdue');
      } else if (filterParam === 'today') {
        setQuickFilter('today');
      } else if (filterParam === 'tomorrow') {
        setQuickFilter('tomorrow');
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
      owners: p.owners || [],
      members: p.members || [],
      createdAt: p.createdAt,
    }));
  }, [dbProjects]);

  useEffect(() => {
    localStorage.setItem('workManagement_selectedProject', selectedProject);
  }, [selectedProject]);

  useEffect(() => {
    localStorage.setItem('workManagement_selectedMember', selectedMember);
  }, [selectedMember]);

  // Get all available tags from current tags state and tasks
  const availableTags = useMemo(() => {
    return Array.from(new Set([
      ...tags.map(t => t.id),
      ...dbTasks.flatMap(t => t.tags || [])
    ]));
  }, [dbTasks, tags]);

  // Active tasks (not completed)
  const activeTasks = useMemo(() => dbTasks.filter(task => !task.completedAt), [dbTasks]);

  // Tasks filtered by project selection (for quick filter counts)
  const projectFilteredTasks = useMemo(() => {
    return activeTasks.filter(task => {
      // Project filter
      if (selectedProject !== "all" && task.projectId !== selectedProject) return false;
      return true;
    });
  }, [activeTasks, selectedProject]);

  // Count tasks for quick filter badges (based on project filtered tasks)
  const quickFilterCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
      overdue: projectFilteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < today).length,
      today: projectFilteredTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      }).length,
      tomorrow: projectFilteredTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === tomorrow.getTime();
      }).length,
      upcoming: projectFilteredTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > tomorrow && due <= nextWeek;
      }).length,
    };
  }, [projectFilteredTasks]);
  
  // All completed tasks (including archived) for the panel
  const allCompletedTasks = useMemo(() => 
    dbTasks.filter(task => task.completedAt),
    [dbTasks]
  );

  // Find the "done" status ID dynamically
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return activeTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Project filter - only applies when a specific project is selected
      const matchesProject = selectedProject === "all" || task.projectId === selectedProject;
      
      // Quick filter
      let matchesQuickFilter = true;
      if (quickFilter !== 'all' && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (quickFilter === 'overdue') {
          matchesQuickFilter = dueDate < today;
        } else if (quickFilter === 'today') {
          matchesQuickFilter = dueDate.getTime() === today.getTime();
        } else if (quickFilter === 'tomorrow') {
          matchesQuickFilter = dueDate.getTime() === tomorrow.getTime();
        } else if (quickFilter === 'upcoming') {
          matchesQuickFilter = dueDate > tomorrow && dueDate <= nextWeek;
        }
      } else if (quickFilter !== 'all' && !task.dueDate) {
        matchesQuickFilter = false;
      }
      
      // Status filter
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(task.status);
      
      // Effort filter
      const matchesEffort = filters.efforts.length === 0 || filters.efforts.includes(task.effort);
      
      // Importance filter
      const matchesImportance = filters.importances.length === 0 || filters.importances.includes(task.importance);
      
      // Assignee filter from panel
      const matchesAssignee = filters.assignees.length === 0 || 
        task.assignees?.some(a => filters.assignees.includes(a.id));
      
      // Quick member filter (dropdown)
      const matchesMember = selectedMember === "all" || 
        task.assignees?.some(a => a.name === selectedMember);
      
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
        (task.dueDate && new Date(task.dueDate) < today && task.status !== 'done');
      
      return matchesSearch && matchesProject && matchesQuickFilter && matchesStatus && matchesEffort && matchesImportance &&
             matchesAssignee && matchesMember && matchesTags && matchesRecurring && matchesDueDateFrom && matchesDueDateTo && matchesOverdue;
    }).sort((a, b) => {
      // Define sort order for effort, importance, and stage
      const effortOrder = effortLibrary.map(e => e.id);
      const importanceOrder = importanceLibrary.map(i => i.id);
      const stageOrder = statuses.map(s => s.id);
      
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
      
      if (sortField === 'stage') {
        const aIndex = stageOrder.indexOf(a.status);
        const bIndex = stageOrder.indexOf(b.status);
        const comparison = aIndex - bIndex;
        return sortAscending ? comparison : -comparison;
      }
      
      if (sortField === 'estimatedTime') {
        const aTime = a.estimatedTime || 0;
        const bTime = b.estimatedTime || 0;
        // Tasks without estimated time go last
        if (aTime === 0 && bTime === 0) return 0;
        if (aTime === 0) return 1;
        if (bTime === 0) return -1;
        const comparison = aTime - bTime;
        return sortAscending ? comparison : -comparison;
      }

      if (sortField === 'manual') {
        const aOrder = a.sortOrder ?? 0;
        const bOrder = b.sortOrder ?? 0;
        const comparison = aOrder - bOrder;
        return sortAscending ? comparison : -comparison;
      }
      
      // Default: sort by due date chronologically, tasks without due date go last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return sortAscending ? comparison : -comparison;
    });
  }, [activeTasks, searchQuery, selectedProject, selectedMember, filters, quickFilter, sortField, sortAscending, statuses]);

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    // Find the task to check if it's recurring
    const task = dbTasks.find(t => t.id === taskId);
    
    // If marking a recurring task as done, use the special hook
    if (updates.status === 'done' && task?.isRecurring && task?.recurrence) {
      completeRecurringTask.mutate({ task }, {
        onSuccess: (result) => {
          if (result.nextTask) {
            toast.success('Recurring task completed! Next instance created.');
          } else if ((result as any).seriesEnded) {
            toast.success('Recurring task series completed!');
          }
        },
        onError: (error) => {
          toast.error('Failed to complete recurring task');
          console.error(error);
        },
      });
      
      // Update viewing task optimistically
      if (viewingTask?.id === taskId) {
        setViewingTask(prev => prev ? { ...prev, ...updates } : null);
      }
      return;
    }
    
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

  const handleReorderTasks = (updates: { taskId: string; sortOrder: number }[]) => {
    // When the user drags, switch to manual ordering so the UI reflects their intent
    setSortField('manual');
    setSortAscending(true);

    reorderTasks.mutate(updates, {
      onError: (error) => {
        toast.error('Failed to reorder tasks');
        console.error(error);
      },
    });
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
    updateTask.mutate(
      {
        taskId,
        updates: {
          status: 'not-started',
          completedAt: null as any,
          archivedAt: null as any,
        } as any,
      },
      {
        onSuccess: () => toast.success('Task restored'),
        onError: () => toast.error('Failed to restore task'),
      }
    );
  };

  const handleArchiveTask = (taskId: string) => {
    updateTask.mutate({ 
      taskId, 
      updates: { archivedAt: new Date() } as any
    }, {
      onSuccess: () => toast.success('Task archived'),
      onError: () => toast.error('Failed to archive task'),
    });
  };

  const handleArchiveOldTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const oldTasks = allCompletedTasks.filter(t => {
      if (!t.completedAt || t.archivedAt) return false;
      return differenceInDays(today, t.completedAt) > 7;
    });
    
    if (oldTasks.length === 0) {
      toast.info('No tasks older than 7 days to archive');
      return;
    }
    
    // Archive all old tasks
    Promise.all(
      oldTasks.map(task => 
        updateTask.mutateAsync({ 
          taskId: task.id, 
          updates: { archivedAt: new Date() } as any
        })
      )
    ).then(() => {
      toast.success(`Archived ${oldTasks.length} tasks`);
    }).catch(() => {
      toast.error('Failed to archive some tasks');
    });
  };

  const handleClearArchive = () => {
    const archivedTasks = allCompletedTasks.filter(t => t.archivedAt);
    
    if (archivedTasks.length === 0) {
      toast.info('No archived tasks to delete');
      return;
    }
    
    Promise.all(
      archivedTasks.map(task => deleteTask.mutateAsync(task.id))
    ).then(() => {
      toast.success(`Deleted ${archivedTasks.length} archived tasks`);
    }).catch(() => {
      toast.error('Failed to delete some tasks');
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
      color: newProject.color,
    }, {
      onSuccess: () => {
        toast.success('Project created');
      },
      onError: () => toast.error('Failed to create project'),
    });
  };

  const handleUpdateProject = (projectId: string, updates: Partial<{ name: string; description?: string; color: string }>) => {
    updateProject.mutate({ projectId, updates }, {
      onSuccess: () => toast.success('Project updated'),
      onError: () => toast.error('Failed to update project'),
    });
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success('Project deleted');
        if (selectedProject === projectId) {
          setSelectedProject('all');
        }
      },
      onError: () => toast.error('Failed to delete project'),
    });
  };

  const isLoading = tasksLoading || projectsLoading;

  const currentProjectName = selectedProject === "all"
    ? "All Projects"
    : projects.find(p => p.id === selectedProject)?.name || "Project";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header - Todoist style: simple and clean */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          Work Management
        </h1>
        <Button 
          onClick={() => setTaskDialogOpen(true)}
          size="sm"
          className="gap-1.5 h-8 rounded-md"
        >
          <Plus className="w-4 h-4" />
          Add task
        </Button>
      </div>

      {/* Filters Row - Clean and minimal */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Left: Dropdowns */}
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] h-8 text-[13px] bg-transparent border-border/50">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 text-[13px] bg-transparent border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <TaskFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            statuses={statuses}
            availableMembers={teamMembers}
            availableTags={tags.map(t => t.id)}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground" 
              >
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusManagerOpen(true)}>
                Manage Stages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTagManagerOpen(true)}>
                Manage Areas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ProjectManagementPanel
            projects={projects}
            availableMembers={teamMembers}
            onCreateProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onReorderProjects={(reorderedProjects) => {
              reorderProjects.mutate(reorderedProjects.map((p, i) => ({ id: p.id, sortOrder: i })));
            }}
          />

          <CompletedTasksPanel
            tasks={allCompletedTasks}
            projects={projects}
            onRestoreTask={handleRestoreTask}
          />
        </div>
      </div>

      {/* Quick Filters - Todoist style tabs */}
      <div className="flex items-center gap-1 border-b border-border/50 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
        <button
          onClick={() => setQuickFilter('all')}
          className={cn(
            "px-3 py-2 text-[13px] font-medium transition-colors relative",
            quickFilter === 'all'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All
          {quickFilter === 'all' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setQuickFilter('overdue')}
          className={cn(
            "px-3 py-2 text-[13px] font-medium transition-colors relative flex items-center gap-1.5",
            quickFilter === 'overdue'
              ? "text-destructive"
              : quickFilterCounts.overdue > 0
                ? "text-destructive/80 hover:text-destructive"
                : "text-muted-foreground hover:text-foreground"
          )}
        >
          Overdue
          {quickFilterCounts.overdue > 0 && (
            <span className="text-xs tabular-nums">{quickFilterCounts.overdue}</span>
          )}
          {quickFilter === 'overdue' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-destructive rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setQuickFilter('today')}
          className={cn(
            "px-3 py-2 text-[13px] font-medium transition-colors relative flex items-center gap-1.5",
            quickFilter === 'today'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Today
          {quickFilterCounts.today > 0 && (
            <span className="text-xs tabular-nums opacity-60">{quickFilterCounts.today}</span>
          )}
          {quickFilter === 'today' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setQuickFilter('tomorrow')}
          className={cn(
            "px-3 py-2 text-[13px] font-medium transition-colors relative flex items-center gap-1.5",
            quickFilter === 'tomorrow'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Tomorrow
          {quickFilterCounts.tomorrow > 0 && (
            <span className="text-xs tabular-nums opacity-60">{quickFilterCounts.tomorrow}</span>
          )}
          {quickFilter === 'tomorrow' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setQuickFilter('upcoming')}
          className={cn(
            "px-3 py-2 text-[13px] font-medium transition-colors relative flex items-center gap-1.5",
            quickFilter === 'upcoming'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Upcoming
          {quickFilterCounts.upcoming > 0 && (
            <span className="text-xs tabular-nums opacity-60">{quickFilterCounts.upcoming}</span>
          )}
          {quickFilter === 'upcoming' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Views */}
      <Tabs defaultValue="table" className="space-y-4" onValueChange={(v) => setActiveView(v as 'table' | 'kanban')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TabsList className="h-8 bg-transparent p-0 gap-1">
              <TabsTrigger value="table" className="h-7 px-2.5 text-[13px] data-[state=active]:bg-muted rounded-md">
                <List className="w-3.5 h-3.5 mr-1.5" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="h-7 px-2.5 text-[13px] data-[state=active]:bg-muted rounded-md">
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                Board
              </TabsTrigger>
            </TabsList>
            
            <span className="text-[13px] text-muted-foreground tabular-nums ml-2">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {sortField === 'manual' ? 'Manual' : sortField === 'dueDate' ? 'Date' : sortField === 'effort' ? 'Effort' : sortField === 'importance' ? 'Importance' : sortField === 'stage' ? 'Stage' : 'Est. Time'}
                  </span>
                  {sortField !== 'manual' && (
                    sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                  onClick={() => { 
                    if (sortField === 'dueDate') {
                      setSortAscending(!sortAscending);
                    } else {
                      setSortField('dueDate'); 
                      setSortAscending(true);
                    }
                  }}
                  className={cn(sortField === 'dueDate' && 'bg-muted')}
                >
                  Due Date
                  {sortField === 'dueDate' && (sortAscending ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { 
                    if (sortField === 'effort') {
                      setSortAscending(!sortAscending);
                    } else {
                      setSortField('effort'); 
                      setSortAscending(true);
                    }
                  }}
                  className={cn(sortField === 'effort' && 'bg-muted')}
                >
                  Effort
                  {sortField === 'effort' && (sortAscending ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { 
                    if (sortField === 'importance') {
                      setSortAscending(!sortAscending);
                    } else {
                      setSortField('importance'); 
                      setSortAscending(true);
                    }
                  }}
                  className={cn(sortField === 'importance' && 'bg-muted')}
                >
                  Importance
                  {sortField === 'importance' && (sortAscending ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
                </DropdownMenuItem>
                {activeView !== 'kanban' && (
                  <DropdownMenuItem 
                    onClick={() => { 
                      if (sortField === 'stage') {
                        setSortAscending(!sortAscending);
                      } else {
                        setSortField('stage'); 
                        setSortAscending(true);
                      }
                    }}
                    className={cn(sortField === 'stage' && 'bg-muted')}
                  >
                    Stage
                    {sortField === 'stage' && (sortAscending ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => { 
                    if (sortField === 'estimatedTime') {
                      setSortAscending(!sortAscending);
                    } else {
                      setSortField('estimatedTime'); 
                      setSortAscending(true);
                    }
                  }}
                  className={cn(sortField === 'estimatedTime' && 'bg-muted')}
                >
                  Est. Time
                  {sortField === 'estimatedTime' && (sortAscending ? <ArrowUp className="w-3 h-3 ml-auto" /> : <ArrowDown className="w-3 h-3 ml-auto" />)}
                </DropdownMenuItem>
                {sortField === 'manual' && (
                  <DropdownMenuItem 
                    onClick={() => { setSortField('dueDate'); setSortAscending(true); }}
                    className="text-muted-foreground"
                  >
                    <GripVertical className="w-3.5 h-3.5 mr-1.5" />
                    Manual
                    <X className="w-3 h-3 ml-auto" />
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="h-4 w-px bg-border" />
            
            <button
              onClick={() => setShowTaskDetails(!showTaskDetails)}
              className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              title={showTaskDetails ? "Hide details" : "Show details"}
            >
              {showTaskDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showTaskDetails ? "Hide details" : "Show details"}</span>
            </button>
          </div>
        </div>

        <TabsContent value="table" className="mt-0">
          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ListTodo className="h-10 w-10 opacity-30 mb-3" />
              <p className="text-sm font-medium">No tasks</p>
              <p className="text-xs mt-1">Create a task to get started</p>
            </div>
          ) : (
            <TaskTable 
              tasks={filteredTasks} 
              projects={projects}
              onTaskUpdate={handleTaskUpdate} 
              onEditTask={handleEditTask} 
              onViewTask={handleViewTask} 
              onDeleteTask={handleDeleteTask}
              onDuplicateTask={handleDuplicateTask}
              onReorderTasks={handleReorderTasks}
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
              showDetails={showTaskDetails}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-0">
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-96 w-80 flex-shrink-0" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ListTodo className="h-10 w-10 opacity-30 mb-3" />
              <p className="text-sm font-medium">No tasks</p>
              <p className="text-xs mt-1">Create a task to get started</p>
            </div>
          ) : (
            <TaskKanban 
              tasks={filteredTasks} 
              projects={projects}
              onTaskUpdate={handleTaskUpdate} 
              onEditTask={handleEditTask} 
              onViewTask={handleViewTask} 
              onDeleteTask={handleDeleteTask}
              onDuplicateTask={handleDuplicateTask}
              onReorderTasks={handleReorderTasks}
              statuses={statuses}
              showDetails={showTaskDetails}
              sortField={sortField}
              sortAscending={sortAscending}
            />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
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
        tags={tags}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        task={viewingTask}
        projects={projects.map(p => ({ id: p.id, name: p.name, color: p.color }))}
        onTaskUpdate={handleTaskUpdate}
        onAddComment={handleAddComment}
        onToggleReaction={handleToggleReaction}
        onDeleteComment={handleDeleteComment}
        currentUser={currentUser}
        availableMembers={teamMembers}
        statuses={statuses}
      />


      {/* Status Manager */}
      <StatusManager
        open={statusManagerOpen}
        onOpenChange={setStatusManagerOpen}
        statuses={statuses}
        onStatusesChange={setStatuses}
      />

      {/* Tag Manager */}
      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={tags}
        onTagsChange={setTags}
      />
    </div>
  );
}
