import { useState } from "react";
import { format } from "date-fns";
import { Repeat, Copy, Trash2 } from "lucide-react";
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
import { getTagById } from "@/data/workManagementConfig";

export interface StatusItem {
  id: string;
  name: string;
  color: string;
}

interface TaskTableProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  statuses: StatusItem[];
}

const priorityColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-destructive text-destructive-foreground",
};

export function TaskTable({ tasks, onTaskUpdate, onEditTask, onViewTask, onDeleteTask, onDuplicateTask, statuses }: TaskTableProps) {
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
                {(task.progress > 0 || task.description) && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {task.progress > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-1.5">{task.progress}%</span>
                    )}
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
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
                  <Badge className={`${priorityColors[task.priority]} text-xs`} variant="secondary">
                    {task.priority}
                  </Badge>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(task.dueDate, "MMM d")}
                    </span>
                  )}
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
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignees</TableHead>
              <TableHead>Due Date</TableHead>
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-medium ${task.status === doneStatusId ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      {task.isRecurring && (
                        <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    {(task.progress > 0 || task.description) && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {task.progress > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-1.5">{task.progress}%</span>
                        )}
                        {task.description}
                      </p>
                    )}
                  </div>
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
                  <Badge className={priorityColors[task.priority]} variant="secondary">
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UserAvatarGroup users={task.assignees} max={3} size="md" />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "-"}
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