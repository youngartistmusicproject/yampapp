import { useState } from "react";
import { format } from "date-fns";
import { Repeat, Copy, Trash2, ArrowUpDown, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getTagById, effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

export type SortField = 'dueDate' | 'effort' | 'importance' | 'stage' | 'estimatedTime';

interface TaskTableProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onToggleSort?: (field: SortField) => void;
  sortField?: SortField;
  sortAscending?: boolean;
  statuses: StatusItem[];
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

// Helper to check if task is due today
function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() === today.getTime() && task.status !== 'done';
}

// Get due date styling
function getDueDateStyle(task: Task): { className: string; icon: string } {
  if (isTaskOverdue(task)) {
    return { className: 'text-red-600 dark:text-red-400 font-medium', icon: '🔴' };
  }
  if (isTaskDueToday(task)) {
    return { className: 'text-amber-600 dark:text-amber-400 font-medium', icon: '🟡' };
  }
  return { className: 'text-muted-foreground', icon: '' };
}

export function TaskTable({ tasks, onTaskUpdate, onEditTask, onViewTask, onDeleteTask, onDuplicateTask, onToggleSort, sortField = 'dueDate', sortAscending = true, statuses }: TaskTableProps) {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const getStatusById = (id: string) => statuses.find(s => s.id === id);
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';

  const handleDeleteConfirm = () => {
    if (taskToDelete && onDeleteTask) {
      onDeleteTask(taskToDelete.id);
    }
    setTaskToDelete(null);
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className="rounded-lg border bg-card p-4 shadow-card cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onViewTask(task)}
          >
            <div className="flex items-start gap-3">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={task.status === doneStatusId}
                  onCheckedChange={(checked) =>
                    onTaskUpdate(task.id, { status: checked ? doneStatusId : "todo" })
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`font-medium ${task.status === doneStatusId ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  {task.isRecurring && (
                    <Repeat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {task.description}
                  </p>
                )}
                {/* Progress bar under task name */}
                {task.progress !== undefined && task.progress > 0 && (
                  <div className="mt-1.5">
                    <Progress value={task.progress} colorByValue className="h-1.5 w-full max-w-[120px]" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {task.estimatedTime && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatEstimatedTime(task.estimatedTime)}
                    </div>
                  )}
                  {(() => {
                    const status = getStatusById(task.status);
                    return (
                      <Badge 
                        variant="secondary"
                        className="text-xs"
                        style={{ 
                          backgroundColor: status ? `${status.color}20` : undefined,
                          color: status?.color 
                        }}
                      >
                        {status?.name || task.status}
                      </Badge>
                    );
                  })()}
                  <Badge className={`${effortColors[task.effort]} text-xs`} variant="secondary">
                    {task.effort}
                  </Badge>
                  <Badge className={`${importanceColors[task.importance]} text-xs`} variant="secondary">
                    {task.importance}
                  </Badge>
                  {task.dueDate && (() => {
                    const style = getDueDateStyle(task);
                    return (
                      <span className={`text-xs ${style.className}`}>
                        {style.icon && <span className="mr-0.5">{style.icon}</span>}
                        {format(task.dueDate, "MMM d")}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <UserAvatarGroup users={task.assignees} max={3} size="sm" />
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDuplicateTask?.(task.id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setTaskToDelete(task)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="rounded-lg border bg-card shadow-card hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="w-14">
                <Button variant="ghost" size="sm" className="gap-1 -ml-3 p-1" onClick={() => onToggleSort?.('estimatedTime')}>
                  <Clock className={`w-4 h-4 ${sortField === 'estimatedTime' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <ArrowUpDown className={`w-3 h-3 ${sortField === 'estimatedTime' ? 'text-primary' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => onToggleSort?.('importance')}>
                  Importance <ArrowUpDown className={`w-3 h-3 ${sortField === 'importance' ? 'text-primary' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => onToggleSort?.('stage')}>
                  Stage <ArrowUpDown className={`w-3 h-3 ${sortField === 'stage' ? 'text-primary' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => onToggleSort?.('effort')}>
                  Effort <ArrowUpDown className={`w-3 h-3 ${sortField === 'effort' ? 'text-primary' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>Responsible</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => onToggleSort?.('dueDate')}>
                  Due Date <ArrowUpDown className={`w-3 h-3 ${sortField === 'dueDate' ? 'text-primary' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="group cursor-pointer" onClick={() => onViewTask(task)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.status === doneStatusId}
                    onCheckedChange={(checked) =>
                      onTaskUpdate(task.id, { status: checked ? doneStatusId : "todo" })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-medium ${task.status === doneStatusId ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      {task.isRecurring && (
                        <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    {task.progress > 0 && (
                      <Progress value={task.progress} colorByValue className="h-1.5 w-24" />
                    )}
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {task.estimatedTime ? formatEstimatedTime(task.estimatedTime) : "-"}
                </TableCell>
                <TableCell>
                  <Badge className={importanceColors[task.importance]} variant="secondary">
                    {task.importance}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(() => {
                    const status = getStatusById(task.status);
                    return (
                      <Badge 
                        variant="secondary"
                        style={{ 
                          backgroundColor: status ? `${status.color}20` : undefined,
                          color: status?.color 
                        }}
                      >
                        {status?.name || task.status}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Badge className={effortColors[task.effort]} variant="secondary">
                    {task.effort}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UserAvatarGroup users={task.assignees} max={3} size="md" />
                </TableCell>
                <TableCell className={getDueDateStyle(task).className}>
                  {task.dueDate ? (() => {
                    const style = getDueDateStyle(task);
                    return (
                      <>
                        {style.icon && <span className="mr-1">{style.icon}</span>}
                        {format(task.dueDate, "MMM d, yyyy")}
                      </>
                    );
                  })() : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {task.tags.slice(0, 2).map((tagId) => {
                      const tag = getTagById(tagId);
                      return (
                        <Badge 
                          key={tagId} 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: tag?.color, color: tag?.color }}
                        >
                          {tag?.name || tagId}
                        </Badge>
                      );
                    })}
                    {task.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{task.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); onDuplicateTask?.(task.id); }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setTaskToDelete(task); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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