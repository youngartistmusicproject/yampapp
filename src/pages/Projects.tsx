import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Search, FolderPlus, Settings2, ListTodo, X, GripVertical, ChevronDown, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, CheckCircle2, Folders, Tags, Layers } from "lucide-react";
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
import { Task, Project, User, TaskComment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { teamMembers, statusLibrary as defaultStatuses, effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { useTasks, useProjects, useCreateTask, useUpdateTask, useDeleteTask, useDuplicateTask, useCreateProject, useUpdateProject, useDeleteProject, useReorderTasks, useCompleteRecurringTask, useReorderProjects } from "@/hooks/useWorkManagement";
import { useAssigneeFrequency } from "@/hooks/useAssigneeFrequency";
import { useAreas } from "@/hooks/useAreas";

// Current user for demo purposes
const currentUser = teamMembers[0];

// Types for view modes and quick filters
type ViewMode = 'active' | 'completed';
type ActiveQuickFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'later';
type CompletedQuickFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'older';

// Helper function for completed task time display
function formatCompletedTime(date: Date): string {
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "Yesterday";
  const days = differenceInDays(new Date(), date);
  if (days < 7) return format(date, "EEEE");
  return format(date, "MMM d");
}

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
  const { data: frequentAssigneeNames = [] } = useAssigneeFrequency(6);
  
  const [statuses, setStatuses] = useState<StatusItem[]>(defaultStatuses);
  const { data: areas = [] } = useAreas();
  const tags: TagItem[] = areas.map(a => ({ id: a.id, name: a.name, color: a.color }));
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [projectManagementOpen, setProjectManagementOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(() => {
    const saved = localStorage.getItem('workManagement_selectedProjects');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedAreas, setSelectedAreas] = useState<string[]>(() => {
    const saved = localStorage.getItem('workManagement_selectedAreas');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMember, setSelectedMember] = useState<string>(() => {
    return localStorage.getItem('workManagement_selectedMember') || 'all';
  });
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortAscending, setSortAscending] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // View mode state (active vs completed)
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [activeQuickFilter, setActiveQuickFilter] = useState<ActiveQuickFilter>('all');
  const [completedQuickFilter, setCompletedQuickFilter] = useState<CompletedQuickFilter>('all');
  
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
        setViewMode('active');
        setActiveQuickFilter('overdue');
      } else if (filterParam === 'today') {
        setViewMode('active');
        setActiveQuickFilter('today');
      } else if (filterParam === 'tomorrow') {
        setViewMode('active');
        setActiveQuickFilter('tomorrow');
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
      areaIds: p.areaIds || [],
      areas: p.areas || [],
      createdAt: p.createdAt,
    }));
  }, [dbProjects]);

  // Map project IDs to their lead (owner) names for displaying lead badges on task avatars
  const projectLeadMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    projects.forEach(p => {
      map[p.id] = (p.owners || []).map(o => o.name);
    });
    return map;
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('workManagement_selectedProjects', JSON.stringify(selectedProjects));
  }, [selectedProjects]);

  useEffect(() => {
    localStorage.setItem('workManagement_selectedAreas', JSON.stringify(selectedAreas));
  }, [selectedAreas]);

  useEffect(() => {
    localStorage.setItem('workManagement_selectedMember', selectedMember);
  }, [selectedMember]);


  // Active tasks (not completed)
  const activeTasks = useMemo(() => dbTasks.filter(task => !task.completedAt), [dbTasks]);
  
  // All completed tasks
  const allCompletedTasks = useMemo(() => 
    dbTasks.filter(task => task.completedAt).sort((a, b) => 
      (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    ),
    [dbTasks]
  );

  // Tasks filtered by project and area selection (for quick filter counts)
  const projectFilteredTasks = useMemo(() => {
    const baseTasks = viewMode === 'active' ? activeTasks : allCompletedTasks;
    return baseTasks.filter(task => {
      // Project filter - matches if no projects selected or task's project is in selection
      if (selectedProjects.length > 0 && !selectedProjects.includes(task.projectId || '')) return false;
      
      // Area filter - matches if no areas selected or task inherits any of the selected areas
      if (selectedAreas.length > 0) {
        const taskAreas = task.inheritedAreas?.map(a => a.id) || task.tags || [];
        if (!selectedAreas.some(areaId => taskAreas.includes(areaId))) return false;
      }
      
      return true;
    });
  }, [activeTasks, allCompletedTasks, viewMode, selectedProjects, selectedAreas]);

  // Count tasks for active quick filter badges
  const activeQuickFilterCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const tasks = viewMode === 'active' ? projectFilteredTasks : [];
    
    return {
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < today).length,
      today: tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      }).length,
      tomorrow: tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === tomorrow.getTime();
      }).length,
      upcoming: tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > tomorrow && due <= nextWeek;
      }).length,
      later: tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due > nextWeek;
      }).length,
    };
  }, [projectFilteredTasks, viewMode]);

  // Count tasks for completed quick filter badges
  const completedQuickFilterCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    
    const tasks = viewMode === 'completed' ? projectFilteredTasks : [];
    
    return {
      today: tasks.filter(t => t.completedAt && isToday(t.completedAt)).length,
      yesterday: tasks.filter(t => t.completedAt && isYesterday(t.completedAt)).length,
      week: tasks.filter(t => {
        if (!t.completedAt) return false;
        const days = differenceInDays(today, t.completedAt);
        return days >= 2 && days < 7;
      }).length,
      month: tasks.filter(t => {
        if (!t.completedAt) return false;
        const days = differenceInDays(today, t.completedAt);
        return days >= 7 && days < 30;
      }).length,
      older: tasks.filter(t => {
        if (!t.completedAt) return false;
        const days = differenceInDays(today, t.completedAt);
        return days >= 30;
      }).length,
    };
  }, [projectFilteredTasks, viewMode]);

  // Find the "done" status ID dynamically
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';

  // Filtered tasks for active view
  const filteredActiveTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return activeTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Project filter - matches if no projects selected or task's project is in selection
      const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(task.projectId || '');
      
      // Area filter - matches if no areas selected or task has any of the selected areas
      const taskAreas = task.inheritedAreas?.map(a => a.id) || task.tags || [];
      const matchesAreas = selectedAreas.length === 0 || selectedAreas.some(areaId => taskAreas.includes(areaId));
      
      // Quick filter
      let matchesQuickFilter = true;
      if (activeQuickFilter !== 'all' && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (activeQuickFilter === 'overdue') {
          matchesQuickFilter = dueDate < today;
        } else if (activeQuickFilter === 'today') {
          matchesQuickFilter = dueDate.getTime() === today.getTime();
        } else if (activeQuickFilter === 'tomorrow') {
          matchesQuickFilter = dueDate.getTime() === tomorrow.getTime();
        } else if (activeQuickFilter === 'upcoming') {
          matchesQuickFilter = dueDate > tomorrow && dueDate <= nextWeek;
        } else if (activeQuickFilter === 'later') {
          matchesQuickFilter = dueDate > nextWeek;
        }
      } else if (activeQuickFilter !== 'all' && !task.dueDate) {
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
      
      return matchesSearch && matchesProject && matchesAreas && matchesQuickFilter && matchesStatus && matchesEffort && matchesImportance &&
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
  }, [activeTasks, searchQuery, selectedProjects, selectedAreas, selectedMember, filters, activeQuickFilter, sortField, sortAscending, statuses]);

  // Filtered tasks for completed view
  const filteredCompletedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    
    return allCompletedTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Project filter
      const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(task.projectId || '');
      
      // Area filter
      const taskAreas = task.inheritedAreas?.map(a => a.id) || task.tags || [];
      const matchesAreas = selectedAreas.length === 0 || selectedAreas.some(areaId => taskAreas.includes(areaId));
      
      // Quick filter based on completedAt
      let matchesQuickFilter = true;
      if (completedQuickFilter !== 'all' && task.completedAt) {
        if (completedQuickFilter === 'today') {
          matchesQuickFilter = isToday(task.completedAt);
        } else if (completedQuickFilter === 'yesterday') {
          matchesQuickFilter = isYesterday(task.completedAt);
        } else if (completedQuickFilter === 'week') {
          const days = differenceInDays(today, task.completedAt);
          matchesQuickFilter = days >= 2 && days < 7;
        } else if (completedQuickFilter === 'month') {
          const days = differenceInDays(today, task.completedAt);
          matchesQuickFilter = days >= 7 && days < 30;
        } else if (completedQuickFilter === 'older') {
          const days = differenceInDays(today, task.completedAt);
          matchesQuickFilter = days >= 30;
        }
      } else if (completedQuickFilter !== 'all' && !task.completedAt) {
        matchesQuickFilter = false;
      }
      
      // Effort filter
      const matchesEffort = filters.efforts.length === 0 || filters.efforts.includes(task.effort);
      
      // Importance filter
      const matchesImportance = filters.importances.length === 0 || filters.importances.includes(task.importance);
      
      // Assignee filter from panel
      const matchesAssignee = filters.assignees.length === 0 || 
        task.assignees?.some(a => filters.assignees.includes(a.id));
      
      // Tags filter
      const matchesTags = filters.tags.length === 0 || 
        task.tags?.some(t => filters.tags.includes(t));
      
      return matchesSearch && matchesProject && matchesAreas && matchesQuickFilter && 
             matchesEffort && matchesImportance && matchesAssignee && matchesTags;
    });
  }, [allCompletedTasks, searchQuery, selectedProjects, selectedAreas, filters, completedQuickFilter]);

  // The tasks to display based on view mode
  const displayTasks = viewMode === 'active' ? filteredActiveTasks : filteredCompletedTasks;

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
      // Create new task - auto-assign to first selected project if only one is selected
      const autoProjectId = selectedProjects.length === 1 ? selectedProjects[0] : taskData.projectId;
      createTask.mutate({
        ...taskData,
        projectId: autoProjectId,
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
      areaIds: newProject.areaIds,
      owners: newProject.owners,
      members: newProject.members,
    }, {
      onSuccess: () => {
        toast.success('Project created');
      },
      onError: () => toast.error('Failed to create project'),
    });
  };

  const handleUpdateProject = (projectId: string, updates: Partial<{ name: string; description?: string; color: string; areaIds?: string[]; owners?: User[]; members?: User[] }>) => {
    updateProject.mutate({ projectId, updates }, {
      onSuccess: () => toast.success('Project updated'),
      onError: () => toast.error('Failed to update project'),
    });
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        toast.success('Project deleted');
        // Remove from selection if it was selected
        if (selectedProjects.includes(projectId)) {
          setSelectedProjects(selectedProjects.filter(id => id !== projectId));
        }
      },
      onError: () => toast.error('Failed to delete project'),
    });
  };

  const isLoading = tasksLoading || projectsLoading;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Work Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your tasks, projects, and workflows
        </p>
      </div>

      {/* More Prominent Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          className="pl-10 h-9 text-sm bg-muted/30 border-border/60"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Unified Filter Row */}
      <div className="flex flex-col gap-3">
        {/* View Toggle + Quick Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border/50 pb-3">
          {/* Left: View Toggle + Quick Filters */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={(v) => {
              setViewMode(v as ViewMode);
              // Reset quick filter when switching view
              if (v === 'active') setActiveQuickFilter('all');
              else setCompletedQuickFilter('all');
            }}>
              <SelectTrigger className="h-8 w-full sm:w-[150px] text-[13px] font-medium shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="active">Active Tasks</SelectItem>
                <SelectItem value="completed">Completed Tasks</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

            {/* Quick Filters - scrollable on mobile, wrap on larger screens */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide sm:flex-wrap min-w-0 flex-1">
              {viewMode === 'active' ? (
                <>
                  <button
                    onClick={() => setActiveQuickFilter('all')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors",
                      activeQuickFilter === 'all'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('overdue')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      activeQuickFilter === 'overdue'
                        ? "bg-destructive text-destructive-foreground"
                        : activeQuickFilterCounts.overdue > 0
                          ? "text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Overdue
                    {activeQuickFilterCounts.overdue > 0 && (
                      <span className="text-xs tabular-nums">{activeQuickFilterCounts.overdue}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('today')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      activeQuickFilter === 'today'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Today
                    {activeQuickFilterCounts.today > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{activeQuickFilterCounts.today}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('tomorrow')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      activeQuickFilter === 'tomorrow'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Tomorrow
                    {activeQuickFilterCounts.tomorrow > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{activeQuickFilterCounts.tomorrow}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('upcoming')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      activeQuickFilter === 'upcoming'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Next 7 Days
                    {activeQuickFilterCounts.upcoming > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{activeQuickFilterCounts.upcoming}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveQuickFilter('later')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      activeQuickFilter === 'later'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Later
                    {activeQuickFilterCounts.later > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{activeQuickFilterCounts.later}</span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCompletedQuickFilter('all')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors",
                      completedQuickFilter === 'all'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCompletedQuickFilter('today')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      completedQuickFilter === 'today'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Today
                    {completedQuickFilterCounts.today > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{completedQuickFilterCounts.today}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setCompletedQuickFilter('yesterday')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      completedQuickFilter === 'yesterday'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Yesterday
                    {completedQuickFilterCounts.yesterday > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{completedQuickFilterCounts.yesterday}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setCompletedQuickFilter('week')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      completedQuickFilter === 'week'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Last 7 Days
                    {completedQuickFilterCounts.week > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{completedQuickFilterCounts.week}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setCompletedQuickFilter('month')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      completedQuickFilter === 'month'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Last 30 Days
                    {completedQuickFilterCounts.month > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{completedQuickFilterCounts.month}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setCompletedQuickFilter('older')}
                    className={cn(
                      "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors flex items-center gap-1",
                      completedQuickFilter === 'older'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Older
                    {completedQuickFilterCounts.older > 0 && (
                      <span className="text-xs tabular-nums opacity-70">{completedQuickFilterCounts.older}</span>
                    )}
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3"
              onClick={() => setTaskDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Manage</span>
                  <ChevronDown className="w-3 h-3 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setProjectManagementOpen(true)} className="gap-2">
                  <Folders className="h-4 w-4" />
                  Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTagManagerOpen(true)} className="gap-2">
                  <Tags className="h-4 w-4" />
                  Areas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusManagerOpen(true)} className="gap-2">
                  <Layers className="h-4 w-4" />
                  Stages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
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
              {displayTasks.length} {displayTasks.length === 1 ? 'task' : 'tasks'}
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
            
            <div className="h-4 w-px bg-border" />
            
            {/* Filter Panel - next to sort */}
            <TaskFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              statuses={statuses}
              availableMembers={teamMembers}
              frequentAssigneeNames={frequentAssigneeNames}
              areas={tags}
              selectedAreaIds={selectedAreas}
              onAreasChange={setSelectedAreas}
              projects={projects}
              selectedProjectIds={selectedProjects}
              onProjectsChange={setSelectedProjects}
            />
          </div>
        </div>

        <TabsContent value="table" className="mt-0">
          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              {viewMode === 'completed' ? (
                <>
                  <CheckCircle2 className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm font-medium">No completed tasks</p>
                  <p className="text-xs mt-1">Complete tasks to see them here</p>
                </>
              ) : (
                <>
                  <ListTodo className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm font-medium">No tasks</p>
                  <p className="text-xs mt-1">Create a task to get started</p>
                </>
              )}
            </div>
          ) : (
            <TaskTable 
              tasks={displayTasks} 
              projects={projects}
              tags={tags}
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
              isCompletedView={viewMode === 'completed'}
              onRestoreTask={handleRestoreTask}
              projectLeadMap={projectLeadMap}
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
          ) : displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              {viewMode === 'completed' ? (
                <>
                  <CheckCircle2 className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm font-medium">No completed tasks</p>
                  <p className="text-xs mt-1">Complete tasks to see them here</p>
                </>
              ) : (
                <>
                  <ListTodo className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm font-medium">No tasks</p>
                  <p className="text-xs mt-1">Create a task to get started</p>
                </>
              )}
            </div>
          ) : (
            <TaskKanban 
              tasks={displayTasks} 
              projects={projects}
              tags={tags}
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
              projectLeadMap={projectLeadMap}
            />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Timeline view coming soon</p>
          </div>
        </TabsContent>
      </Tabs>


      {/* Project Management Panel (Sheet) */}
      <ProjectManagementPanel
        projects={projects}
        availableMembers={teamMembers}
        onCreateProject={handleAddProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onReorderProjects={(reorderedProjects) => {
          reorderProjects.mutate(reorderedProjects.map((p, i) => ({ id: p.id, sortOrder: i })));
        }}
        open={projectManagementOpen}
        onOpenChange={setProjectManagementOpen}
      />

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
        tags={tags}
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
      />
    </div>
  );
}
