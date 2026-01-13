import { useMemo } from "react";
import { CheckCircle2, RotateCcw, Archive, Trash2 } from "lucide-react";
import { isToday, isYesterday, differenceInDays, formatDistanceToNow, format } from "date-fns";
import { Task, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CompletedTasksPanelProps {
  tasks: Task[];
  projects: Project[];
  onRestoreTask: (taskId: string) => void;
  onArchiveTask: (taskId: string) => void;
  onArchiveOldTasks: () => void;
  onClearArchive: () => void;
}

interface TaskGroup {
  label: string;
  tasks: Task[];
}

function getRelativeTime(date: Date): string {
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "Yesterday";

  const days = differenceInDays(new Date(), date);
  if (days < 7) return format(date, "EEEE");
  return format(date, "MMM d");
}

function groupTasksByTime(tasks: Task[]): TaskGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups: TaskGroup[] = [
    { label: "Today", tasks: [] },
    { label: "Yesterday", tasks: [] },
    { label: "This Week", tasks: [] },
    { label: "This Month", tasks: [] },
    { label: "Older", tasks: [] },
  ];

  tasks.forEach((task) => {
    if (!task.completedAt) return;

    const completedDate = new Date(task.completedAt);
    const days = differenceInDays(today, completedDate);

    if (isToday(completedDate)) groups[0].tasks.push(task);
    else if (isYesterday(completedDate)) groups[1].tasks.push(task);
    else if (days < 7) groups[2].tasks.push(task);
    else if (days < 30) groups[3].tasks.push(task);
    else groups[4].tasks.push(task);
  });

  return groups.filter((g) => g.tasks.length > 0);
}

function TaskRow({
  task,
  project,
  onRestore,
  onArchive,
  showArchive,
}: {
  task: Task;
  project?: Project;
  onRestore: () => void;
  onArchive?: () => void;
  showArchive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors">
      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] line-through text-muted-foreground truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
          {task.completedAt && <span>{getRelativeTime(task.completedAt)}</span>}
          {project && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {showArchive && onArchive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onArchive();
            }}
            title="Archive"
          >
            <Archive className="w-3 h-3" />
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRestore();
          }}
          title="Restore"
        >
          <RotateCcw className="w-3 h-3" />
          Restore
        </Button>
      </div>
    </div>
  );
}

export function CompletedTasksPanel({
  tasks,
  projects,
  onRestoreTask,
  onArchiveTask,
  onArchiveOldTasks,
  onClearArchive,
}: CompletedTasksPanelProps) {
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt && !t.archivedAt)
        .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)),
    [tasks]
  );

  const archivedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.archivedAt)
        .sort((a, b) => (b.archivedAt?.getTime() || 0) - (a.archivedAt?.getTime() || 0)),
    [tasks]
  );

  const taskGroups = useMemo(() => groupTasksByTime(completedTasks), [completedTasks]);

  const oldTasksCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return completedTasks.filter((t) => t.completedAt && differenceInDays(today, t.completedAt) > 7).length;
  }, [completedTasks]);

  const getProject = (projectId?: string) => (projectId ? projects.find((p) => p.id === projectId) : undefined);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:w-[420px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Completed</SheetTitle>
            {oldTasksCount > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onArchiveOldTasks}>
                <Archive className="w-3 h-3" />
                Archive old ({oldTasksCount})
              </Button>
            )}
          </div>
          <SheetDescription className="text-[13px]">
            {completedTasks.length} completed{archivedTasks.length > 0 && `, ${archivedTasks.length} archived`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
          {completedTasks.length === 0 && archivedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CheckCircle2 className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-[13px]">No completed tasks</p>
            </div>
          ) : (
            <div className="space-y-4">
              {taskGroups.map((group) => (
                <section key={group.label} className="space-y-1">
                  <div className="px-1 text-[13px] font-medium text-foreground">
                    {group.label} <span className="text-xs text-muted-foreground font-normal">({group.tasks.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={getProject(task.projectId)}
                        onRestore={() => onRestoreTask(task.id)}
                        onArchive={() => onArchiveTask(task.id)}
                        showArchive
                      />
                    ))}
                  </div>
                </section>
              ))}

              {archivedTasks.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                      <Archive className="w-3.5 h-3.5" />
                      Archived <span className="text-xs font-normal">({archivedTasks.length})</span>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Archive?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {archivedTasks.length} archived tasks. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={onClearArchive}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="space-y-0.5">
                    {archivedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        project={getProject(task.projectId)}
                        onRestore={() => onRestoreTask(task.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
