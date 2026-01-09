import { useState } from "react";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Filter, Search, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable } from "@/components/projects/TaskTable";
import { TaskKanban } from "@/components/projects/TaskKanban";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { Task, Project, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock team members
const teamMembers: User[] = [
  { id: "u1", name: "Sarah Johnson", email: "sarah@company.com", role: "admin" },
  { id: "u2", name: "Mike Chen", email: "mike@company.com", role: "staff" },
  { id: "u3", name: "Emily Davis", email: "emily@company.com", role: "faculty" },
  { id: "u4", name: "Alex Rivera", email: "alex@company.com", role: "staff" },
  { id: "u5", name: "Jordan Smith", email: "jordan@company.com", role: "faculty" },
];

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
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "all" || task.projectId === selectedProject;
    return matchesSearch && matchesProject;
  });

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
    ));
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      projectId: selectedProject !== "all" ? selectedProject : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks([...tasks, task]);
    setTaskDialogOpen(false);
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
          <TaskTable tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <TaskKanban tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="flex items-center justify-center h-64 bg-secondary/30 rounded-lg border-2 border-dashed border-border">
            <p className="text-muted-foreground">Gantt chart view coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSubmit={handleAddTask}
        availableMembers={teamMembers}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleAddProject}
        availableMembers={teamMembers}
      />
    </div>
  );
}
