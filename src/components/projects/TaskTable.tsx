import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Repeat, Copy, Trash2, Clock, MessageSquare, Paperclip } from "lucide-react";
import { getProgressColor } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { UserAvatarGroup } from "@/components/ui/user-avatar";

export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

export type SortField = 'dueDate' | 'effort' | 'importance' | 'stage' | 'estimatedTime' | 'manual';

interface TaskTableProps {
  tasks: Task[];
  projects?: Project[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onToggleSort?: (field: SortField) => void;
  onReorderTasks?: (updates: { taskId: string; sortOrder: number }[]) => void;
  sortField?: SortField;
  sortAscending?: boolean;
  statuses: StatusItem[];
  showDetails?: boolean;
  teamLeaderNames?: string[];
}

const effortColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  light: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  focused: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  deep: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const importanceColors: Record<string, string> = {
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

interface SortableTableRowProps {
  task: Task;
  project?: Project;
  onViewTask: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteClick: (task: Task) => void;
  getStatusById: (id: string) => StatusItem | undefined;
  doneStatusId: string;
  showDetails: boolean;
  teamLeaderNames?: string[];
}

function SortableTableRow({
  task,
  project,
  onViewTask,
  onTaskUpdate,
  onDuplicateTask,
  onDeleteClick,
  getStatusById,
  doneStatusId,
  showDetails,
  teamLeaderNames = [],
}: SortableTableRowProps) {
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
  const status = getStatusById(task.status);
  const isDone = task.status === doneStatusId;
  const commentCount = task.comments?.length || 0;
  const attachmentCount = task.attachments?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col gap-1 px-3 py-2.5 border-b border-border/50 cursor-grab active:cursor-grabbing transition-colors ${
        overdue ? 'bg-destructive/5' : 'hover:bg-muted/30'
      }`}
      onClick={() => onViewTask(task)}
      {...attributes}
      {...listeners}
    >
      {/* Main row */}
      <div className="flex items-center gap-3">
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isDone}
            onCheckedChange={(checked) =>
              onTaskUpdate(task.id, { status: checked ? doneStatusId : "todo" })
            }
            className="border-muted-foreground/40"
          />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </span>
            {task.isRecurring && (
              <Repeat className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            )}
            {/* Comment & Attachment indicators */}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground/60">
                <MessageSquare className="w-3 h-3" />
                <span className="text-[10px]">{commentCount}</span>
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground/60">
                <Paperclip className="w-3 h-3" />
                <span className="text-[10px]">{attachmentCount}</span>
              </span>
            )}
          </div>
          {project && (
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-[11px] text-muted-foreground/70 truncate">{project.name}</span>
            </div>
          )}
        </div>

        {/* Right side info - fixed widths for alignment */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status && (
            <span 
              className="text-[11px] font-medium px-1.5 py-0.5 rounded w-20 text-center truncate"
              style={{
                backgroundColor: `${status.color}15`,
                color: status.color,
              }}
            >
              {status.name}
            </span>
          )}
          
          <div className="w-14">
            <UserAvatarGroup users={task.assignees} max={2} size="sm" teamLeaderIds={teamLeaderNames} />
          </div>
          
          <span className={`text-[12px] w-14 text-right ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {task.dueDate ? format(task.dueDate, "MMM d") : ""}
          </span>
        </div>

        <div 
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-14 justify-end"
          onClick={(e) => e.stopPropagation()} 
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => onDuplicateTask?.(task.id)}
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteClick(task)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Details row - right aligned with matching widths */}
      {showDetails && (
        <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground pr-14">
          <div className="flex items-center gap-3">
            <span>
              Effort: <span className="font-medium text-foreground capitalize">{task.effort || '—'}</span>
            </span>
            <span>
              Importance: <span className="font-medium text-foreground capitalize">{task.importance || '—'}</span>
            </span>
            {task.estimatedTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium text-foreground">{formatEstimatedTime(task.estimatedTime)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 w-28">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${getProgressColor(task.progress || 0)}`}
                style={{ width: `${task.progress || 0}%` }}
              />
            </div>
            <span className="text-[10px] font-medium w-6 text-right">{task.progress || 0}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DragOverlayRow({ task }: { task: Task }) {
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg flex items-center gap-3 cursor-grabbing">
      <span className="font-medium">{task.title}</span>
    </div>
  );
}

interface SortableMobileCardProps {
  task: Task;
  onViewTask: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteClick: (task: Task) => void;
  getStatusById: (id: string) => StatusItem | undefined;
  doneStatusId: string;
  teamLeaderNames?: string[];
}

function SortableMobileCard({
  task,
  onViewTask,
  onTaskUpdate,
  onDuplicateTask,
  onDeleteClick,
  getStatusById,
  doneStatusId,
  teamLeaderNames = [],
}: SortableMobileCardProps) {
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
  const status = getStatusById(task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-4 cursor-grab active:cursor-grabbing transition-colors ${
        overdue ? 'bg-destructive/5 border-destructive/20' : 'bg-card hover:bg-muted/30'
      }`}
      onClick={() => onViewTask(task)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3">
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.status === doneStatusId}
            onCheckedChange={(checked) =>
              onTaskUpdate(task.id, { status: checked ? doneStatusId : "todo" })
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${task.status === doneStatusId ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </p>
            {task.isRecurring && (
              <Repeat className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: status ? `${status.color}15` : undefined,
                color: status?.color,
              }}
            >
              {status?.name || task.status}
            </span>
            {task.dueDate && (
              <span className={overdue ? 'text-destructive font-medium' : ''}>
                {format(task.dueDate, "MMM d")}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <UserAvatarGroup users={task.assignees} max={2} size="sm" teamLeaderIds={teamLeaderNames} />
            <div 
              className="flex items-center gap-1" 
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => onDuplicateTask?.(task.id)}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteClick(task)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskTable({
  tasks,
  projects = [],
  onTaskUpdate,
  onEditTask,
  onViewTask,
  onDeleteTask,
  onDuplicateTask,
  onToggleSort,
  onReorderTasks,
  sortField = 'dueDate',
  sortAscending = true,
  statuses,
  showDetails = true,
  teamLeaderNames = [],
}: TaskTableProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Sync local tasks with props when not dragging
  useMemo(() => {
    if (!activeTask) {
      setLocalTasks(tasks);
    }
  }, [tasks, activeTask]);

  const getStatusById = (id: string) => statuses.find(s => s.id === id);
  const getProjectById = (id?: string) => id ? projects.find(p => p.id === id) : undefined;
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = localTasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const activeIndex = localTasks.findIndex(t => t.id === active.id);
    const overIndex = localTasks.findIndex(t => t.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newTasks = arrayMove(localTasks, activeIndex, overIndex);
      setLocalTasks(newTasks);

      // Calculate new sort orders
      const updates = newTasks.map((task, index) => ({
        taskId: task.id,
        sortOrder: index * 10,
      }));

      if (onReorderTasks) {
        onReorderTasks(updates);
      }
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
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {localTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <SortableMobileCard
                    task={task}
                    onViewTask={onViewTask}
                    onTaskUpdate={onTaskUpdate}
                    onDuplicateTask={onDuplicateTask}
                    onDeleteClick={setTaskToDelete}
                    getStatusById={getStatusById}
                    doneStatusId={doneStatusId}
                    teamLeaderNames={teamLeaderNames}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </div>

        {/* Desktop List View - Todoist style */}
        <div className="hidden md:block rounded-lg border border-border/50 bg-card overflow-hidden">
          <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {localTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.02,
                    ease: "easeOut"
                  }}
                >
                  <SortableTableRow
                    task={task}
                    project={getProjectById(task.projectId)}
                    onViewTask={onViewTask}
                    onTaskUpdate={onTaskUpdate}
                    onDuplicateTask={onDuplicateTask}
                    onDeleteClick={setTaskToDelete}
                    getStatusById={getStatusById}
                    doneStatusId={doneStatusId}
                    showDetails={showDetails}
                    teamLeaderNames={teamLeaderNames}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? <DragOverlayRow task={activeTask} /> : null}
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
