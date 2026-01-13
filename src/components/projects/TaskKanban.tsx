import { useState } from "react";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Repeat, Copy, Trash2, ChevronDown, ChevronRight, Clock, Tag } from "lucide-react";
import { getTagById } from "@/data/workManagementConfig";
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

const effortColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  light: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  focused: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  deep: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const importanceBadgeColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  routine: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  important: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
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

                          {/* 1. Progress bar under title */}
                          {task.progress !== undefined && task.progress > 0 && (
                            <div className="mt-1.5">
                              <Progress value={task.progress} colorByValue className="h-1.5" />
                            </div>
                          )}

                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          {/* 2. Est Time → 3. Importance → 4. Effort (Stage is the column) */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {task.estimatedTime && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {formatEstimatedTime(task.estimatedTime)}
                              </div>
                            )}
                            <Badge className={`${importanceBadgeColors[task.importance]} text-xs`} variant="secondary">
                              {task.importance}
                            </Badge>
                            <Badge className={`${effortColors[task.effort]} text-xs`} variant="secondary">
                              {task.effort}
                            </Badge>
                          </div>

                          {/* 5. Responsible → 6. Due Date → 7. Tags */}
                          <div className="flex items-center gap-2 mt-2">
                            <UserAvatarGroup users={task.assignees} max={2} size="sm" />
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(task.dueDate, "MMM d")}
                              </div>
                            )}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                {task.tags.slice(0, 1).map((tagId) => {
                                  const tag = getTagById(tagId);
                                  return (
                                    <Badge 
                                      key={tagId} 
                                      variant="outline" 
                                      className="text-[10px] px-1.5 py-0"
                                      style={{ borderColor: tag?.color, color: tag?.color }}
                                    >
                                      {tag?.name || tagId}
                                    </Badge>
                                  );
                                })}
                                {task.tags.length > 1 && (
                                  <span className="text-[10px] text-muted-foreground">+{task.tags.length - 1}</span>
                                )}
                              </div>
                            )}
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