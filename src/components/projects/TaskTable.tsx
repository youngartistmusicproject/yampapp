import { format } from "date-fns";
import { MoreHorizontal, ArrowUpDown, Repeat } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  statuses: StatusItem[];
}

const priorityColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-destructive text-destructive-foreground",
};

export function TaskTable({ tasks, onTaskUpdate, onEditTask, onViewTask, statuses }: TaskTableProps) {
  const getStatusById = (id: string) => statuses.find(s => s.id === id);
  const doneStatusId = statuses.find(s => s.name.toLowerCase() === 'done')?.id || 'done';
  return (
    <div className="rounded-lg border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12"></TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3">
                Task <ArrowUpDown className="w-3 h-3" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignees</TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3">
                Due Date <ArrowUpDown className="w-3 h-3" />
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewTask(task)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditTask(task)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
