import { useState } from "react";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Repeat, Copy, Trash2, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UserAvatarGroup } from "@/components/ui/user-avatar";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  statuses: StatusItem[];
}

const importanceColors: Record<string, string> = {
  low: "border-l-gray-400",
  routine: "border-l-blue-400",
  important: "border-l-amber-400",
  critical: "border-l-red-500",
};

// Helper to format estimated time
function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TaskKanban({ tasks, onTaskUpdate, onEditTask, onViewTask, onDeleteTask, onDuplicateTask, statuses }: TaskKanbanProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

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

  const handleDeleteConfirm = () => {
    if (taskToDelete && onDeleteTask) {
      onDeleteTask(taskToDelete.id);
    }
    setTaskToDelete(null);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((column) => {
          const isCollapsed = collapsedColumns.has(column.id);
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <Collapsible
              key={column.id}
              open={!isCollapsed}
              onOpenChange={() => toggleColumnCollapse(column.id)}
            >
              <div
                className={`bg-secondary/30 rounded-lg p-3 flex-shrink-0 transition-all ${
                  isCollapsed ? "w-12" : "w-[320px]"
                }`}
                onDrop={(e) => handleDrop(e, column.id as Task["status"])}
                onDragOver={handleDragOver}
              >
                <CollapsibleTrigger asChild>
                  <div className={`flex items-center gap-2 mb-3 cursor-pointer hover:bg-secondary/50 rounded-md p-1 -m-1 ${
                    isCollapsed ? "flex-col" : ""
                  }`}>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: column.color }}
                    />
                    {isCollapsed ? (
                      <div className="flex flex-col items-center gap-2">
                        <span 
                          className="font-medium text-sm writing-mode-vertical whitespace-nowrap"
                          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                        >
                          {column.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {columnTasks.length}
                        </Badge>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-sm">{column.name}</h3>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {columnTasks.length}
                        </Badge>
                      </>
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="space-y-2">
                    {columnTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={`group cursor-grab active:cursor-grabbing border-l-4 ${importanceColors[task.importance]} shadow-card hover:shadow-elevated transition-all`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onViewTask(task)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug truncate">
                                {task.title}
                              </p>
                              {task.isRecurring && (
                                <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); onDuplicateTask?.(task.id); }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          {/* Est Time & Progress */}
                          {(task.estimatedTime || (task.progress !== undefined && task.progress > 0)) && (
                            <div className="flex items-center gap-3 mt-2">
                              {task.estimatedTime && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {formatEstimatedTime(task.estimatedTime)}
                                </div>
                              )}
                              {task.progress !== undefined && task.progress > 0 && (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <Progress value={task.progress} className="h-1.5" />
                                  <span className="text-xs text-muted-foreground">{task.progress}%</span>
                                </div>
                              )}
                            </div>
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
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}