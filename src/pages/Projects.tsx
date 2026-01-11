import { useState } from "react";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Search, FolderPlus, CheckCircle2, RotateCcw, Settings2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable } from "@/components/projects/TaskTable";
import { TaskKanban } from "@/components/projects/TaskKanban";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { TaskDetailDialog } from "@/components/projects/TaskDetailDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { StatusManager, StatusItem } from "@/components/projects/StatusManager";
import { TaskFilterPanel, TaskFilters } from "@/components/projects/TaskFilterPanel";
import { TeamsProjectsHeader } from "@/components/projects/TeamsProjectsHeader";
import { Task, Project, User, TaskComment, TaskAttachment } from "@/types";
import { Badge } from "@/components/ui/badge";
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

import { teamMembers, statusLibrary as defaultStatuses, tagLibrary, teamsLibrary } from "@/data/workManagementConfig";

// Current user for demo purposes
const currentUser = teamMembers[0];

const initialProjects: Project[] = [
  {
    id: "p1",
    name: "Spring Recital 2024",
    description: "Annual spring music recital planning and execution",
    color: "#eb5c5c",
    tasks: [],
    members: [teamMembers[0], teamMembers[2], teamMembers[4]],
    teamId: "teachers",
    createdAt: new Date(),
  },
  {
    id: "p2",
    name: "Curriculum Update",
    description: "Update music curriculum for the new semester",
    color: "#3b82f6",
    tasks: [],
    members: [teamMembers[1], teamMembers[2]],
    teamId: "teachers",
    createdAt: new Date(),
  },
  {
    id: "p3",
    name: "Q1 Budget Review",
    description: "Review and finalize Q1 financial reports",
    color: "#8b5cf6",
    tasks: [],
    members: [teamMembers[0], teamMembers[3]],
    teamId: "finance-accounting",
    createdAt: new Date(),
  },
  {
    id: "p4",
    name: "Lead Nurturing Campaign",
    description: "Develop and execute marketing campaigns for prospective students",
    color: "#f59e0b",
    tasks: [],
    members: [teamMembers[1], teamMembers[4]],
    teamId: "sales-marketing",
    createdAt: new Date(),
  },
];

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Review lesson plans for next week",
    description: "Go through all lesson plans and update as needed",
    status: "in-progress",
    priority: "high",
    dueDate: new Date("2024-01-20"),
    tags: ["teaching", "planning"],
    assignees: [teamMembers[2]],
    projectId: "p1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "Update student progress reports",
    description: "Complete quarterly progress reports for all students",
    status: "todo",
    priority: "medium",
    dueDate: new Date("2024-01-25"),
    tags: ["admin", "reports"],
    assignees: [teamMembers[0], teamMembers[1]],
    projectId: "p1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    title: "Schedule parent-teacher meetings",
    description: "Coordinate schedules and send invitations",
    status: "todo",
    priority: "high",
    dueDate: new Date("2024-01-22"),
    tags: ["communication", "parents"],
    assignees: [teamMembers[3]],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    title: "Order new music books",
    description: "Place order for spring semester materials",
    status: "done",
    priority: "low",
    dueDate: new Date("2024-01-15"),
    tags: ["supplies"],
    assignees: [teamMembers[1]],
    projectId: "p2",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    title: "Prepare recital program",
    description: "Design and print program for spring recital",
    status: "review",
    priority: "medium",
    dueDate: new Date("2024-02-01"),
    tags: ["recital", "design"],
    assignees: [teamMembers[2], teamMembers[4]],
    projectId: "p1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function Projects() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [statuses, setStatuses] = useState<StatusItem[]>(defaultStatuses);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [filters, setFilters] = useState<TaskFilters>({
    statuses: [],
    priorities: [],
    assignees: [],
    tags: [],
    showRecurring: null,
    dueDateFrom: undefined,
    dueDateTo: undefined,
  });

  // Get all available tags from tasks and tag library
  const availableTags = Array.from(new Set([
    ...tagLibrary.map(t => t.name.toLowerCase()),
    ...tasks.flatMap(t => t.tags || [])
  ]));

  // Active tasks (not completed)
  const activeTasks = tasks.filter(task => !task.completedAt);
  
  // Completed tasks
  const completedTasks = tasks.filter(task => task.completedAt)
    .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

  const filteredTasks = activeTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "all" || task.projectId === selectedProject;
    
    // Team filter - check if task's project belongs to selected team
    const taskProject = projects.find(p => p.id === task.projectId);
    const matchesTeam = selectedTeam === "all" || taskProject?.teamId === selectedTeam || !task.projectId;
    
    // Status filter
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(task.status);
    
    // Priority filter
    const matchesPriority = filters.priorities.length === 0 || filters.priorities.includes(task.priority);
    
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
    
    return matchesSearch && matchesProject && matchesTeam && matchesStatus && matchesPriority && 
           matchesAssignee && matchesTags && matchesRecurring && matchesDueDateFrom && matchesDueDateTo;
  }).sort((a, b) => {
    // Sort by due date chronologically (earliest first), tasks without due date go last
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Find the "done" status ID dynamically
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      
      let updatedTask: Task;
      
      // If marking as done, add completedAt timestamp
      if (updates.status === doneStatusId && task.status !== doneStatusId) {
        updatedTask = { ...task, ...updates, completedAt: new Date(), updatedAt: new Date() };
      }
      // If unmarking as done, remove completedAt
      else if (updates.status && updates.status !== doneStatusId && task.status === doneStatusId) {
        updatedTask = { ...task, ...updates, completedAt: undefined, updatedAt: new Date() };
      }
      else {
        updatedTask = { ...task, ...updates, updatedAt: new Date() };
      }
      
      return updatedTask;
    }));
    
    // Also update viewingTask if it's the same task
    setViewingTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      return { ...prev, ...updates, updatedAt: new Date() };
    });
  };

  const handleEditTask = (task: Task) => {
    setViewingTask(null); // Close detail dialog if open
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleViewTask = (task: Task) => {
    // Get latest task data
    const latestTask = tasks.find(t => t.id === task.id) || task;
    setViewingTask(latestTask);
  };

  const handleAddComment = (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>, parentCommentId?: string) => {
    const commentId = Date.now().toString();
    // Process attachments to give them proper IDs
    const processedAttachments = comment.attachments?.map((a, i) => ({
      ...a,
      id: `${commentId}-att-${i}`,
      uploadedAt: new Date(),
    }));
    
    const newComment: TaskComment = {
      ...comment,
      id: commentId,
      createdAt: new Date(),
      attachments: processedAttachments,
      parentCommentId,
    };
    
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      
      // If this is a reply, add it to the parent comment's replies
      if (parentCommentId) {
        const updatedComments = (task.comments || []).map(c => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          }
          return c;
        });
        return {
          ...task,
          comments: updatedComments,
          updatedAt: new Date(),
        };
      }
      
      return {
        ...task,
        comments: [...(task.comments || []), newComment],
        updatedAt: new Date(),
      };
    }));
    
    // Update viewing task to reflect changes
    setViewingTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      
      if (parentCommentId) {
        const updatedComments = (prev.comments || []).map(c => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          }
          return c;
        });
        return {
          ...prev,
          comments: updatedComments,
        };
      }
      
      return {
        ...prev,
        comments: [...(prev.comments || []), newComment],
      };
    });
  };

  const handleToggleReaction = (taskId: string, commentId: string, emoji: string) => {
    const updateReactions = (comments: TaskComment[]): TaskComment[] => {
      return comments.map(comment => {
        // Check replies first
        if (comment.replies && comment.replies.length > 0) {
          comment = {
            ...comment,
            replies: updateReactions(comment.replies),
          };
        }
        
        if (comment.id !== commentId) return comment;
        
        const reactions = comment.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          const userHasReacted = existingReaction.users.some(u => u.id === currentUser.id);
          
          if (userHasReacted) {
            // Remove user from reaction
            const updatedUsers = existingReaction.users.filter(u => u.id !== currentUser.id);
            if (updatedUsers.length === 0) {
              // Remove the reaction entirely
              return {
                ...comment,
                reactions: reactions.filter(r => r.emoji !== emoji),
              };
            }
            return {
              ...comment,
              reactions: reactions.map(r => 
                r.emoji === emoji ? { ...r, users: updatedUsers } : r
              ),
            };
          } else {
            // Add user to existing reaction
            return {
              ...comment,
              reactions: reactions.map(r =>
                r.emoji === emoji ? { ...r, users: [...r.users, currentUser] } : r
              ),
            };
          }
        } else {
          // Create new reaction
          return {
            ...comment,
            reactions: [...reactions, { emoji, users: [currentUser] }],
          };
        }
      });
    };
    
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        comments: updateReactions(task.comments || []),
        updatedAt: new Date(),
      };
    }));
    
    setViewingTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      return {
        ...prev,
        comments: updateReactions(prev.comments || []),
      };
    });
  };

  const handleDeleteComment = (taskId: string, commentId: string) => {
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        comments: (task.comments || []).filter(c => c.id !== commentId),
        updatedAt: new Date(),
      };
    }));
    setViewingTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      return {
        ...prev,
        comments: (prev.comments || []).filter(c => c.id !== commentId),
      };
    });
  };

  const handleAddAttachment = (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => {
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      const newAttachment: TaskAttachment = {
        ...attachment,
        id: Date.now().toString(),
        uploadedAt: new Date(),
      };
      return {
        ...task,
        attachments: [...(task.attachments || []), newAttachment],
        updatedAt: new Date(),
      };
    }));
    setViewingTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      const newAttachment: TaskAttachment = {
        ...attachment,
        id: Date.now().toString(),
        uploadedAt: new Date(),
      };
      return {
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment],
      };
    });
  };

  const handleDeleteAttachment = (taskId: string, attachmentId: string) => {
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        attachments: (task.attachments || []).filter(a => a.id !== attachmentId),
        updatedAt: new Date(),
      };
    }));
    setViewingTask(prev => {
      if (!prev || prev.id !== taskId) return prev;
      return {
        ...prev,
        attachments: (prev.attachments || []).filter(a => a.id !== attachmentId),
      };
    });
  };

  const handleRestoreTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId 
        ? { ...task, status: 'todo' as const, completedAt: undefined, updatedAt: new Date() }
        : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    // Close detail dialog if viewing the deleted task
    if (viewingTask?.id === taskId) {
      setViewingTask(null);
    }
  };

  const handleDuplicateTask = (taskId: string) => {
    const taskToDuplicate = tasks.find(t => t.id === taskId);
    if (!taskToDuplicate) return;
    
    const duplicatedTask: Task = {
      ...taskToDuplicate,
      id: Date.now().toString(),
      title: `${taskToDuplicate.title} (Copy)`,
      status: 'todo',
      completedAt: undefined,
      comments: [],
      attachments: [],
      subtasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setTasks([...tasks, duplicatedTask]);
  };

  const handleTaskSubmit = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      // Update existing task
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...taskData, updatedAt: new Date() }
          : t
      ));
    } else {
      // Create new task
      const task: Task = {
        ...taskData,
        id: Date.now().toString(),
        projectId: selectedProject !== "all" ? selectedProject : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTasks([...tasks, task]);
    }
    setTaskDialogOpen(false);
    setEditingTask(undefined);
  };

  const handleDialogClose = (open: boolean) => {
    setTaskDialogOpen(open);
    if (!open) {
      setEditingTask(undefined);
    }
  };

  const handleAddProject = (newProject: Omit<Project, 'id' | 'createdAt' | 'tasks'>) => {
    const project: Project = {
      ...newProject,
      id: Date.now().toString(),
      tasks: [],
      createdAt: new Date(),
    };
    setProjects([...projects, project]);
    setProjectDialogOpen(false);
  };

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
        teams={teamsLibrary}
        projects={projects}
        tasks={tasks}
        selectedTeam={selectedTeam}
        selectedProject={selectedProject}
        onTeamSelect={setSelectedTeam}
        onProjectSelect={setSelectedProject}
        doneStatusId={doneStatusId}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-10"
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
          <TaskTable 
            tasks={filteredTasks} 
            onTaskUpdate={handleTaskUpdate} 
            onEditTask={handleEditTask} 
            onViewTask={handleViewTask} 
            onDeleteTask={handleDeleteTask}
            onDuplicateTask={handleDuplicateTask}
            statuses={statuses} 
          />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <TaskKanban 
            tasks={filteredTasks} 
            onTaskUpdate={handleTaskUpdate} 
            onEditTask={handleEditTask} 
            onViewTask={handleViewTask} 
            onDeleteTask={handleDeleteTask}
            onDuplicateTask={handleDuplicateTask}
            statuses={statuses} 
          />
        </TabsContent>


        <TabsContent value="timeline" className="mt-4">
          <div className="flex items-center justify-center h-64 bg-secondary/30 rounded-lg border-2 border-dashed border-border">
            <p className="text-muted-foreground">Gantt chart view coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleTaskSubmit}
        availableMembers={teamMembers}
        statuses={statuses}
        task={editingTask}
      />

      <TaskDetailDialog
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        task={viewingTask}
        currentUser={currentUser}
        availableMembers={teamMembers}
        statuses={statuses}
        onTaskUpdate={handleTaskUpdate}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onToggleReaction={handleToggleReaction}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleAddProject}
        availableMembers={teamMembers}
        teams={teamsLibrary}
        selectedTeamId={selectedTeam !== "all" ? selectedTeam : undefined}
      />

      <StatusManager
        open={statusManagerOpen}
        onOpenChange={setStatusManagerOpen}
        statuses={statuses}
        onStatusesChange={setStatuses}
      />
    </div>
  );
}
