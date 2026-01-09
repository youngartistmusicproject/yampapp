import { format } from "date-fns";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
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

interface TaskTableProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const priorityColors = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors = {
  todo: "bg-secondary text-secondary-foreground",
  "in-progress": "bg-primary/10 text-primary",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

export function TaskTable({ tasks, onTaskUpdate }: TaskTableProps) {
  return (
    <div className="rounded-lg border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12"></TableHead>
            <TableHead>
              <Button variant="ghost" size="sm" className="gap-1 -ml-3">
                Title <ArrowUpDown className="w-3 h-3" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
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
            <TableRow key={task.id} className="group">
              <TableCell>
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={(checked) =>
                    onTaskUpdate(task.id, { status: checked ? "done" : "todo" })
                  }
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[task.status]} variant="secondary">
                  {task.status.replace("-", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[task.priority]} variant="secondary">
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "-"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {task.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {task.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{task.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
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
                    <DropdownMenuItem>Edit</DropdownMenuItem>
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
