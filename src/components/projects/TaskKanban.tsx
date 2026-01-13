import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
  DragOverlay,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onReorderTasks?: (updates: { taskId: string; sortOrder: number }[]) => void;
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

function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today && task.status !== 'done';
}

interface SortableTaskCardProps {
  task: Task;
  onViewTask: (task: Task) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteClick: (task: Task) => void;
  dropIndicatorPosition?: "before" | "after";
}

function SortableTaskCard({
  task,
  onViewTask,
  onDuplicateTask,
  onDeleteClick,
  dropIndicatorPosition,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const overdue = isTaskOverdue(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      {dropIndicatorPosition === "before" && (
        <div className="pointer-events-none absolute -top-1 left-2 right-2 h-0.5 rounded-full bg-primary/70" />
      )}
      {dropIndicatorPosition === "after" && (
        <div className="pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary/70" />
      )}

      <Card
        className={`group border-l-4 ${importanceColors[task.importance]} ${
          overdue ? "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400 dark:ring-red-500" : ""
        } hover:shadow-md hover:scale-[1.01] transition-all duration-150`}
        onClick={() => onViewTask(task)}
      >
        <CardContent className="p-3 space-y-2 h-[120px] flex flex-col">
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
            <div 
              className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => onDuplicateTask?.(task.id)}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDeleteClick(task)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {task.progress !== undefined && task.progress > 0 && (
            <Progress value={task.progress} colorByValue className="h-1.5" />
          )}
          
          {/* Properties Row: Time | Importance | Effort */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 mt-auto">
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
    </div>
  );
}

function KanbanColumnDropZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

const TaskCardOverlay = React.forwardRef<HTMLDivElement, { task: Task }>(function TaskCardOverlay(
  { task },
  ref,
) {
  const overdue = isTaskOverdue(task);

  return (
    <div ref={ref}>
      <Card
        className={`border-l-4 ${importanceColors[task.importance]} shadow-lg cursor-grabbing ${
          overdue ? "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400 dark:ring-red-500" : ""
        }`}
        style={{ width: "300px" }}
      >
        <CardContent className="p-3 space-y-2 h-[120px] flex flex-col">
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        </CardContent>
      </Card>
    </div>
  );
});

export function TaskKanban({ tasks, onTaskUpdate, onEditTask, onViewTask, onDeleteTask, onDuplicateTask, onReorderTasks, statuses }: TaskKanbanProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const skipNextSync = useRef(false);
  const dragStartStatusRef = useRef<{ taskId: string; status: string } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<
    | { kind: "task"; overId: string; position: "before" | "after" }
    | { kind: "column"; overId: string; position: "end" }
    | null
  >(null);

  // Sync local tasks with props when not dragging (sorted by manual order)
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (!activeTask) {
      const next = [...tasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setLocalTasks(next);
    }
  }, [tasks, activeTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }, []);

  const getTasksByStatus = useCallback((status: string) =>
    localTasks.filter((task) => task.status === status), [localTasks]);

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = localTasks.find(t => t.id === event.active.id);
    if (task) {
      dragStartStatusRef.current = { taskId: task.id, status: task.status };
    }
    setDropIndicator(null);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setDropIndicator(null);
      return;
    }

    if (over.id === active.id) {
      setDropIndicator(null);
      return;
    }

    const activeTask = localTasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    const isOverColumn = statuses.some(s => s.id === overId);
    const overTask = localTasks.find(t => t.id === overId);

    if (isOverColumn) {
      setDropIndicator({ kind: "column", overId, position: "end" });

      if (activeTask.status !== overId) {
        // Moving to a different column
        setLocalTasks(prev =>
          prev.map(t => t.id === active.id ? { ...t, status: overId } : t)
        );
      }
      return;
    }

    if (overTask) {
      // Check if moving to a different column via hovering over a task
      if (activeTask.status !== overTask.status) {
        // Moving to a different column - update status
        setLocalTasks(prev =>
          prev.map(t => t.id === active.id ? { ...t, status: overTask.status } : t)
        );
        setDropIndicator({ kind: "task", overId, position: "after" });
        return;
      }

      // Same column reorder: show whether the drop will be before/after the hovered card
      const columnTasks = localTasks.filter(t => t.status === overTask.status);
      const activeIndex = columnTasks.findIndex(t => t.id === active.id);
      const overIndex = columnTasks.findIndex(t => t.id === overId);

      const position = activeIndex !== -1 && overIndex !== -1 && activeIndex < overIndex ? "after" : "before";
      setDropIndicator({ kind: "task", overId, position });
      return;
    }

    setDropIndicator(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const startedInStatus =
      dragStartStatusRef.current?.taskId === (active.id as string)
        ? dragStartStatusRef.current.status
        : null;

    // Prevent an immediate resync from props before the cache/backend updates
    skipNextSync.current = true;
    dragStartStatusRef.current = null;
    setActiveTask(null);
    setDropIndicator(null);

    if (!over) return;

    const activeTaskData = localTasks.find(t => t.id === active.id);
    if (!activeTaskData) return;

    const overId = over.id as string;
    const isOverColumn = statuses.some(s => s.id === overId);
    const overTask = localTasks.find(t => t.id === overId);

    // Determine target status
    const targetStatus = isOverColumn ? overId : (overTask?.status || activeTaskData.status);

    let newColumnTasks: Task[] = [];

    if (isOverColumn) {
      // Dropped on a column: move to end
      const columnTasksWithoutActive = localTasks.filter(
        t => t.status === targetStatus && t.id !== active.id
      );
      newColumnTasks = [...columnTasksWithoutActive, { ...activeTaskData, status: targetStatus }];
    } else if (overTask && overTask.status === activeTaskData.status) {
      // Same column reorder: use arrayMove so moving "down" goes after the hovered card
      const columnTasks = localTasks.filter(t => t.status === targetStatus);
      const activeIndex = columnTasks.findIndex(t => t.id === active.id);
      const overIndex = columnTasks.findIndex(t => t.id === overId);
      if (activeIndex === -1 || overIndex === -1) return;
      newColumnTasks = arrayMove(columnTasks, activeIndex, overIndex);
    } else {
      // Different column over a task
      const columnTasksWithoutActive = localTasks.filter(
        t => t.status === targetStatus && t.id !== active.id
      );

      const baseIndex = overTask
        ? columnTasksWithoutActive.findIndex(t => t.id === overId)
        : columnTasksWithoutActive.length;

      const insertIndex =
        baseIndex === -1
          ? columnTasksWithoutActive.length
          : dropIndicator?.kind === "task" && dropIndicator.overId === overId && dropIndicator.position === "after"
            ? baseIndex + 1
            : baseIndex;

      newColumnTasks = [
        ...columnTasksWithoutActive.slice(0, insertIndex),
        { ...activeTaskData, status: targetStatus },
        ...columnTasksWithoutActive.slice(insertIndex),
      ];
    }

    // Update local state immediately for visual feedback
    setLocalTasks(prev => {
      const otherTasks = prev.filter(t => t.status !== targetStatus && t.id !== active.id);
      return [...otherTasks, ...newColumnTasks];
    });

    // Calculate new sort orders for the column
    const updates = newColumnTasks.map((task, index) => ({
      taskId: task.id,
      sortOrder: index * 10,
    }));

    // Update status if changed (compare to status at drag start, since we optimistically update during drag-over)
    const shouldUpdateStatus = (startedInStatus ?? activeTaskData.status) !== targetStatus;
    if (shouldUpdateStatus) {
      onTaskUpdate(active.id as string, { status: targetStatus });
    }

    // Update sort orders
    if (onReorderTasks && updates.length > 0) {
      onReorderTasks(updates);
    }
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete && onDeleteTask) {
      onDeleteTask(taskToDelete.id);
    }
    setTaskToDelete(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          skipNextSync.current = false;
          dragStartStatusRef.current = null;
          setActiveTask(null);
          setDropIndicator(null);
        }}
      >
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
                    activeTask && (
                      (dropIndicator?.kind === "column" && dropIndicator.overId === column.id) ||
                      (dropIndicator?.kind === "task" && localTasks.find(t => t.id === dropIndicator.overId)?.status === column.id)
                    )
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : ""
                  }`}
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
                    <SortableContext
                      items={columnTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <KanbanColumnDropZone id={column.id} className="relative space-y-2 min-h-[100px] h-full">
                        <AnimatePresence>
                          {columnTasks.map((task) => {
                            const dropPos =
                              dropIndicator?.kind === "task" &&
                              dropIndicator.overId === task.id &&
                              activeTask?.id !== task.id
                                ? dropIndicator.position
                                : undefined;

                            return (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.15 }}
                              >
                                <SortableTaskCard
                                  task={task}
                                  onViewTask={onViewTask}
                                  onDuplicateTask={onDuplicateTask}
                                  onDeleteClick={setTaskToDelete}
                                  dropIndicatorPosition={dropPos}
                                />
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {dropIndicator?.kind === "column" && dropIndicator.overId === column.id && (
                          <div className="pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary/70" />
                        )}
                      </KanbanColumnDropZone>
                    </SortableContext>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div>
              <TaskCardOverlay task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
