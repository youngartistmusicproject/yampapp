import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, MoreHorizontal, Repeat, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatarGroup } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

interface TaskKanbanProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  statuses: StatusItem[];
}

const priorityColors: Record<string, string> = {
  low: "border-l-secondary",
  medium: "border-l-blue-400",
  high: "border-l-orange-400",
  urgent: "border-l-destructive",
};

export function TaskKanban({ tasks, onTaskUpdate, onEditTask, onViewTask, statuses }: TaskKanbanProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statuses.map((column) => (
        <div
          key={column.id}
          className="bg-secondary/30 rounded-lg p-3"
          onDrop={(e) => handleDrop(e, column.id as Task["status"])}
          onDragOver={handleDragOver}
        >
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-medium text-sm">{column.name}</h3>
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
                onClick={() => onViewTask(task)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium leading-snug">
                        {task.title}
                      </p>
                      {task.isRecurring && (
                        <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewTask(task); }}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task); }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {(task.progress > 0 || task.description) && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.progress > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-1.5">{task.progress}%</span>
                      )}
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
                    <div className="ml-auto">
                      <UserAvatarGroup users={task.assignees} max={2} size="sm" />
                    </div>
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
