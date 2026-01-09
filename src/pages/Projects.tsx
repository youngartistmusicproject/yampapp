import { useState } from "react";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskTable } from "@/components/projects/TaskTable";
import { TaskKanban } from "@/components/projects/TaskKanban";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { Task } from "@/types";

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Review lesson plans for next week",
    description: "Go through all lesson plans and update as needed",
    status: "in-progress",
    priority: "high",
    dueDate: new Date("2024-01-20"),
    tags: ["teaching", "planning"],
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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function Projects() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
    ));
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTasks([...tasks, task]);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects & Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage all your tasks and projects in one place</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
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
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <List className="w-4 h-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <TaskKanban tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <TaskTable tasks={filteredTasks} onTaskUpdate={handleTaskUpdate} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="flex items-center justify-center h-64 bg-secondary/30 rounded-lg border-2 border-dashed border-border">
            <p className="text-muted-foreground">Gantt chart view coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddTask}
      />
    </div>
  );
}
