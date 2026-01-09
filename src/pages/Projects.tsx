import { useState } from "react";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Filter, Search, FolderPlus, CheckCircle2, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable } from "@/components/projects/TaskTable";
import { TaskKanban } from "@/components/projects/TaskKanban";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { StatusManager, StatusItem } from "@/components/projects/StatusManager";
import { Task, Project, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { teamMembers, statusLibrary as defaultStatuses } from "@/data/workManagementConfig";

const initialProjects: Project[] = [
  {
    id: "p1",
    name: "Spring Recital 2024",
    description: "Annual spring music recital planning and execution",
    color: "#eb5c5c",
    tasks: [],
    members: [teamMembers[0], teamMembers[2], teamMembers[4]],
    createdAt: new Date(),
  },
  {
    id: "p2",
    name: "Curriculum Update",
    description: "Update music curriculum for the new semester",
    color: "#3b82f6",
    tasks: [],
    members: [teamMembers[1], teamMembers[2]],
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Active tasks (not completed)
  const activeTasks = tasks.filter(task => !task.completedAt);
  
  // Completed tasks
  const completedTasks = tasks.filter(task => task.completedAt)
    .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

  const filteredTasks = activeTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "all" || task.projectId === selectedProject;
    return matchesSearch && matchesProject;
  });

  // Find the "done" status ID dynamically
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task => {
      if (task.id !== taskId) return task;
      
      // If marking as done, add completedAt timestamp
      if (updates.status === doneStatusId && task.status !== doneStatusId) {
        return { ...task, ...updates, completedAt: new Date(), updatedAt: new Date() };
      }
      
      // If unmarking as done, remove completedAt
      if (updates.status && updates.status !== doneStatusId && task.status === doneStatusId) {
        return { ...task, ...updates, completedAt: undefined, updatedAt: new Date() };
      }
      
      return { ...task, ...updates, updatedAt: new Date() };
    }));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleRestoreTask = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId 
        ? { ...task, status: 'todo' as const, completedAt: undefined, updatedAt: new Date() }
        : task
    ));
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Work Management</h1>
          <p className="text-muted-foreground mt-1">Manage all your projects and tasks in one place</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setProjectDialogOpen(true)} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            New Project
          </Button>
          <Button onClick={() => setTaskDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Projects Bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm font-medium text-muted-foreground mr-2">Projects:</span>
        <Badge
          variant={selectedProject === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedProject("all")}
        >
          All Tasks
        </Badge>
        {projects.map((project) => (
          <Badge
            key={project.id}
            variant={selectedProject === project.id ? "default" : "outline"}
            className="cursor-pointer gap-1.5"
            onClick={() => setSelectedProject(project.id)}
            style={selectedProject === project.id ? { backgroundColor: project.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedProject === project.id ? "white" : project.color }}
            />
            {project.name}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setStatusManagerOpen(true)}>
          <Settings2 className="w-4 h-4" />
          Statuses
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed
              {completedTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {completedTasks.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
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
                        className="gap-1.5 h-8"
                        onClick={() => handleRestoreTask(task.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
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
          <TaskTable tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} onEditTask={handleEditTask} statuses={statuses} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <TaskKanban tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} onEditTask={handleEditTask} statuses={statuses} />
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

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleAddProject}
        availableMembers={teamMembers}
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
