import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
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
import { Task, Project } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Repeat, Copy, Trash2, ChevronDown, ChevronRight, Clock, Tag, MessageSquare, Paperclip, Check, BookOpen, ListChecks } from "lucide-react";
import { getTagById, TagItem } from "@/data/workManagementConfig";
import { Progress, getProgressColor } from "@/components/ui/progress";
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

export type SortField = 'dueDate' | 'effort' | 'importance' | 'stage' | 'estimatedTime' | 'area' | 'manual';

interface TaskKanbanProps {
  tasks: Task[];
  projects?: Project[];
  tags?: TagItem[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onReorderTasks?: (updates: { taskId: string; sortOrder: number }[]) => void;
  statuses: StatusItem[];
  showDetails?: boolean;
  sortField?: SortField;
  sortAscending?: boolean;
  teamLeaderNames?: string[];
  projectLeadMap?: Record<string, string[]>;
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
  project?: Project;
  tags?: TagItem[];
  onViewTask: (task: Task) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteClick: (task: Task) => void;
  onCompleteTask?: (taskId: string) => void;
  dropIndicatorPosition?: "before" | "after";
  showDetails?: boolean;
  projectLeadNames?: string[];
}

function SortableTaskCard({
  task,
  project,
  tags = [],
  onViewTask,
  onDuplicateTask,
  onDeleteClick,
  onCompleteTask,
  dropIndicatorPosition,
  showDetails = true,
  projectLeadNames = [],
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
  const commentCount = task.commentCount ?? task.comments?.length ?? 0;
  const attachmentCount = task.attachmentCount ?? task.attachments?.length ?? 0;
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtaskCount = task.subtasks?.filter(s => s.completed).length || 0;

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

      <div
        className={`group rounded-lg border bg-card transition-colors ${
          overdue ? "bg-destructive/5 border-destructive/30" : "hover:bg-muted/20 hover:border-border"
        }`}
        onClick={() => onViewTask(task)}
      >
        <div className="p-2.5">
          {/* Row 1: Title + Indicators */}
          <div className="flex items-start gap-1.5 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
              {task.title}
            </p>
            {/* Compact indicators */}
            <div className="flex items-center gap-1 text-muted-foreground/50 shrink-0 mt-0.5">
              {task.isRecurring && <Repeat className="w-3 h-3" />}
              {subtaskCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <ListChecks className="w-3 h-3" />
                  {showDetails && <span>{completedSubtaskCount}/{subtaskCount}</span>}
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <MessageSquare className="w-3 h-3" />
                  {showDetails && <span>{commentCount}</span>}
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px]">
                  <Paperclip className="w-3 h-3" />
                  {showDetails && <span>{attachmentCount}</span>}
                </span>
              )}
              {task.howToLink && <BookOpen className="w-3 h-3 text-primary/60" />}
            </div>
          </div>

          {/* Row 2: Project - always visible */}
          {project && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-[11px] text-muted-foreground truncate">{project.name}</span>
            </div>
          )}

          {/* Expanded: Area badges */}
          {showDetails && (() => {
            const areas = task.inheritedAreas || (task.tags && task.tags.length > 0 
              ? task.tags.map(tagId => tags.find(t => t.id === tagId)).filter(Boolean)
              : []);
            if (!areas.length) return null;
            return (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {areas.slice(0, 2).map((area: any) => (
                  <span
                    key={area.id}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ 
                      backgroundColor: `${area.color}15`,
                      color: area.color,
                    }}
                  >
                    {area.name}
                  </span>
                ))}
                {areas.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{areas.length - 2}</span>
                )}
              </div>
            );
          })()}

          {/* Expanded: Metadata row */}
          {showDetails && (task.effort || task.importance || task.estimatedTime) && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
              {task.effort && (
                <span className={`font-medium px-1.5 py-0.5 rounded capitalize ${effortColors[task.effort] || effortColors.light}`}>
                  {task.effort}
                </span>
              )}
              {task.importance && (
                <span className={`font-medium px-1.5 py-0.5 rounded capitalize ${importanceBadgeColors[task.importance] || importanceBadgeColors.routine}`}>
                  {task.importance}
                </span>
              )}
              {task.estimatedTime && (
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium text-foreground">{formatEstimatedTime(task.estimatedTime)}</span>
                </span>
              )}
            </div>
          )}

          {/* Expanded: Progress bar */}
          {showDetails && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${getProgressColor(task.progress)}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium w-6 text-right">{task.progress}%</span>
            </div>
          )}

          {/* Footer: Assignees + Due Date - always visible */}
          <div className="flex items-center justify-between mt-2">
            {task.assignees && task.assignees.length > 0 ? (
              <UserAvatarGroup users={task.assignees} max={2} size="sm" teamLeaderIds={projectLeadNames} />
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Unassigned</span>
            )}
            
            {task.dueDate ? (
              <span className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {format(task.dueDate, "MMM d")}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">No date</span>
            )}
          </div>
        </div>

        {/* Hover actions */}
        <div 
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 bg-background/80 text-muted-foreground hover:text-green-600"
            onClick={() => onCompleteTask?.(task.id)}
            title="Mark complete"
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 bg-background/80 text-muted-foreground hover:text-foreground"
            onClick={() => onDuplicateTask?.(task.id)}
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 bg-background/80 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteClick(task)}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
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
  return (
    <div ref={ref}>
      <div
        className="rounded-lg border bg-card p-3 shadow-lg cursor-grabbing"
        style={{ width: "280px" }}
      >
        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
      </div>
    </div>
  );
});

export function TaskKanban({ tasks, projects = [], tags = [], onTaskUpdate, onEditTask, onViewTask, onDeleteTask, onDuplicateTask, onReorderTasks, statuses, showDetails = true, sortField = 'manual', sortAscending = true, teamLeaderNames = [], projectLeadMap = {} }: TaskKanbanProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const skipNextSync = useRef(false);
  const dragStartStatusRef = useRef<{ taskId: string; status: string } | null>(null);
  // Keeps local UI stable while react-query applies partial optimistic updates (e.g. sort order before status).

  const getProjectById = (id?: string) => id ? projects.find(p => p.id === id) : undefined;
  const pendingTaskOverrides = useRef<Map<string, Partial<Task>>>(new Map());
  const [dropIndicator, setDropIndicator] = useState<
    | { kind: "task"; overId: string; position: "before" | "after" }
    | { kind: "column"; overId: string; position: "end" }
    | null
  >(null);

  // Sort order definitions for effort and importance
  const effortOrder = ['easy', 'light', 'focused', 'deep'];
  const importanceOrder = ['low', 'routine', 'important', 'critical'];

  // Sort tasks within column based on sortField
  const sortTasksInColumn = useCallback((columnTasks: Task[]): Task[] => {
    if (sortField === 'manual') {
      return [...columnTasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    return [...columnTasks].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'dueDate') {
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === 'effort') {
        const aIndex = effortOrder.indexOf(a.effort || '');
        const bIndex = effortOrder.indexOf(b.effort || '');
        comparison = (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      } else if (sortField === 'importance') {
        const aIndex = importanceOrder.indexOf(a.importance || '');
        const bIndex = importanceOrder.indexOf(b.importance || '');
        comparison = (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      } else if (sortField === 'estimatedTime') {
        const aTime = a.estimatedTime || 0;
        const bTime = b.estimatedTime || 0;
        if (aTime === 0 && bTime === 0) comparison = 0;
        else if (aTime === 0) comparison = 1;
        else if (bTime === 0) comparison = -1;
        else comparison = aTime - bTime;
      } else if (sortField === 'stage') {
        // Stage sorting doesn't apply within columns (already grouped by stage)
        comparison = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      } else if (sortField === 'area') {
        const aArea = a.inheritedAreas?.[0]?.name || '';
        const bArea = b.inheritedAreas?.[0]?.name || '';
        if (!aArea && !bArea) comparison = 0;
        else if (!aArea) comparison = 1;
        else if (!bArea) comparison = -1;
        else comparison = aArea.localeCompare(bArea);
      }

      return sortAscending ? comparison : -comparison;
    });
  }, [sortField, sortAscending]);

  // Sync local tasks with props when not dragging (sorted by manual order)
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    if (!activeTask) {
      const merged = tasks
        .map((t) => {
          const override = pendingTaskOverrides.current.get(t.id);
          if (!override) return t;

          const shouldClear =
            (override.status === undefined || t.status === override.status) &&
            (override.sortOrder === undefined || (t.sortOrder ?? 0) === (override.sortOrder ?? 0));

          if (shouldClear) pendingTaskOverrides.current.delete(t.id);
          return { ...t, ...override };
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      setLocalTasks(merged);
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

  const getTasksByStatus = useCallback((status: string) => {
    const columnTasks = localTasks.filter((task) => task.status === status);
    return sortTasksInColumn(columnTasks);
  }, [localTasks, sortTasksInColumn]);

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
      // Prevent brief "snap back" if the tasks cache updates sort_order before status.
      pendingTaskOverrides.current.set(active.id as string, { status: targetStatus });
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
                  className={`bg-muted/30 rounded-lg p-3 flex-shrink-0 transition-all duration-200 h-full flex flex-col ${
                    isCollapsed ? "w-10" : "w-[280px]"
                  } ${
                    activeTask && (
                      (dropIndicator?.kind === "column" && dropIndicator.overId === column.id) ||
                      (dropIndicator?.kind === "task" && localTasks.find(t => t.id === dropIndicator.overId)?.status === column.id)
                    )
                      ? "bg-primary/5"
                      : ""
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center gap-2 mb-3 cursor-pointer rounded-md p-1 -m-1 ${
                      isCollapsed ? "flex-col" : ""
                    }`}>
                      {isCollapsed ? (
                        <div className="flex flex-col items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: column.color }}
                          />
                          <span 
                            className="text-xs font-medium text-muted-foreground writing-mode-vertical whitespace-nowrap"
                            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                          >
                            {column.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {columnTasks.length}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: column.color }}
                          />
                          <span className="text-sm font-medium text-muted-foreground">{column.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {columnTasks.length}
                          </span>
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
                        {columnTasks.map((task) => {
                          const dropPos =
                            dropIndicator?.kind === "task" &&
                            dropIndicator.overId === task.id &&
                            activeTask?.id !== task.id
                              ? dropIndicator.position
                              : undefined;

                          // Skip rendering the actively dragged task in its original position
                          const isBeingDragged = activeTask?.id === task.id;

                          return (
                            <div
                              key={task.id}
                              style={{ opacity: isBeingDragged ? 0.4 : 1 }}
                            >
                              <SortableTaskCard
                                task={task}
                                project={getProjectById(task.projectId)}
                                tags={tags}
                                onViewTask={onViewTask}
                                onDuplicateTask={onDuplicateTask}
                                onDeleteClick={setTaskToDelete}
                                onCompleteTask={(taskId) => onTaskUpdate(taskId, { status: 'done', progress: 100 })}
                                dropIndicatorPosition={dropPos}
                                showDetails={showDetails}
                                projectLeadNames={task.projectId ? (projectLeadMap[task.projectId] || []) : []}
                              />
                            </div>
                          );
                        })}

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
