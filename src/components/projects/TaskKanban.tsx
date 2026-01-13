import { useState, useCallback, memo, useEffect, useRef } from "react";
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

// Helper to check if task is overdue
function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today && task.status !== 'done';
}

export function TaskKanban({ tasks, onTaskUpdate, onEditTask, onViewTask, onDeleteTask, onDuplicateTask, statuses }: TaskKanbanProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const isDragging = useRef(false);

  // Use tasks directly, only track dragging state for visual feedback
  const displayTasks = tasks;

  const getTasksByStatus = (status: string) =>
    displayTasks.filter((task) => task.status === status);

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

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: Task["status"]) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      // Persist to database - React Query will update the UI
      onTaskUpdate(taskId, { status });
    }
    setDragOverColumn(null);
    setDraggingTaskId(null);
  }, [onTaskUpdate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((columnId: string) => {
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, columnId: string) => {
    // Only clear if we're actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  }, [dragOverColumn]);

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
                className={`bg-secondary/30 rounded-lg p-3 flex-shrink-0 transition-all duration-200 h-full flex flex-col ${
                  isCollapsed ? "w-12" : "w-[320px]"
                } ${
                  dragOverColumn === column.id
                    ? "bg-primary/10 ring-2 ring-primary/50 ring-dashed"
                    : ""
                }`}
                onDrop={(e) => handleDrop(e, column.id as Task["status"])}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
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

                <CollapsibleContent className="h-full flex-1">
                  <div className="space-y-2 min-h-[100px] h-full">
                    {columnTasks.map((task) => {
                      const overdue = isTaskOverdue(task);
                      return (
                      <Card
                        key={task.id}
                        className={`group cursor-grab active:cursor-grabbing border-l-4 ${importanceColors[task.importance]} shadow-card hover:shadow-elevated transition-all ${
                          overdue ? 'bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400 dark:ring-red-500' : ''
                        } ${draggingTaskId === task.id ? 'opacity-50 scale-95' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onViewTask(task)}
                      >
                        <CardContent className="p-3 space-y-2.5">
                          {/* Task Title Row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug line-clamp-2">
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

                          {/* Progress bar */}
                          {task.progress !== undefined && task.progress > 0 && (
                            <Progress value={task.progress} colorByValue className="h-1.5" />
                          )}

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          {/* Properties Row: Time | Importance | Effort */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                            {task.estimatedTime && (
                              <div className="flex items-center gap-1 text-xs bg-muted/50 rounded px-1.5 py-0.5">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{formatEstimatedTime(task.estimatedTime)}</span>
                              </div>
                            )}
                            <Badge className={`${importanceBadgeColors[task.importance]} text-[10px] capitalize`} variant="secondary">
                              {task.importance}
                            </Badge>
                            <Badge className={`${effortColors[task.effort]} text-[10px] capitalize`} variant="secondary">
                              {task.effort}
                            </Badge>
                          </div>

                          {/* Footer Row: Responsible | Due Date | Tags */}
                          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                            {task.assignees && task.assignees.length > 0 ? (
                              <UserAvatarGroup users={task.assignees} max={2} size="sm" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                            )}
                            
                            {task.dueDate && (
                              <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {overdue && '⚠ '}
                                  {format(task.dueDate, "MMM d")}
                                </span>
                              </div>
                            )}
                            
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                <Tag className="w-3 h-3 text-muted-foreground" />
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
                      );
                    })}
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