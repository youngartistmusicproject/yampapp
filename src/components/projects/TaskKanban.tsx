import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskKanbanProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const columns = [
  { id: "todo", title: "To Do", color: "bg-muted-foreground" },
  { id: "in-progress", title: "In Progress", color: "bg-primary" },
  { id: "review", title: "Review", color: "bg-purple-500" },
  { id: "done", title: "Done", color: "bg-green-500" },
];

const priorityColors = {
  low: "border-l-secondary",
  medium: "border-l-blue-400",
  high: "border-l-orange-400",
  urgent: "border-l-destructive",
};

export function TaskKanban({ tasks, onTaskUpdate }: TaskKanbanProps) {
  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, status: Task["status"]) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    onTaskUpdate(taskId, { status });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="bg-secondary/30 rounded-lg p-3"
          onDrop={(e) => handleDrop(e, column.id as Task["status"])}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${column.color}`} />
            <h3 className="font-medium text-sm">{column.title}</h3>
            <Badge variant="secondary" className="ml-auto text-xs">
              {getTasksByStatus(column.id).length}
            </Badge>
          </div>

          <div className="space-y-2">
            {getTasksByStatus(column.id).map((task) => (
              <Card
                key={task.id}
                className={`cursor-grab active:cursor-grabbing border-l-4 ${priorityColors[task.priority]} shadow-card hover:shadow-elevated transition-all`}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">
                      {task.title}
                    </p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(task.dueDate, "MMM d")}
                      </div>
                    )}
                    
                    {/* Assignees */}
                    {task.assignees.length > 0 && (
                      <div className="flex -space-x-1.5 ml-auto">
                        {task.assignees.slice(0, 2).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[10px] font-medium"
                            title={assignee.name}
                          >
                            {assignee.name.charAt(0)}
                          </div>
                        ))}
                        {task.assignees.length > 2 && (
                          <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[10px] font-medium">
                            +{task.assignees.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {task.assignees.length === 0 && (
                      <div className="flex gap-1 ml-auto">
                        {task.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
