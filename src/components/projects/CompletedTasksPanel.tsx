import { useMemo, useState } from "react";
import { Archive, CheckCircle2, RotateCcw, Search, Trash2 } from "lucide-react";
import { differenceInDays, format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

import { Task, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type GroupKey = "Today" | "Yesterday" | "This Week" | "This Month" | "Older";

function relativeCompletedLabel(date: Date): string {
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "Yesterday";

  const days = differenceInDays(new Date(), date);
  if (days < 7) return format(date, "EEEE");
  return format(date, "MMM d");
}

function groupKeyForCompletedAt(date: Date): GroupKey {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(date);
  const days = differenceInDays(today, d);

  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (days < 7) return "This Week";
  if (days < 30) return "This Month";
  return "Older";
}

const GROUP_ORDER: GroupKey[] = ["Today", "Yesterday", "This Week", "This Month", "Older"];

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
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-muted-foreground line-through">{task.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
          {task.completedAt && <span className="truncate">{relativeCompletedLabel(task.completedAt)}</span>}
          {project && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 truncate">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="truncate">{project.name}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
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
            <Archive className="h-3 w-3" />
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
        >
          <RotateCcw className="h-3 w-3" />
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
  const [tab, setTab] = useState<"completed" | "archived">("completed");
  const [query, setQuery] = useState("");

  const { completedTasks, archivedTasks } = useMemo(() => {
    const completed = tasks
      .filter((t) => t.completedAt && !t.archivedAt)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

    const archived = tasks
      .filter((t) => t.archivedAt)
      .sort((a, b) => (b.archivedAt?.getTime() || 0) - (a.archivedAt?.getTime() || 0));

    return { completedTasks: completed, archivedTasks: archived };
  }, [tasks]);

  const filteredCompleted = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return completedTasks;
    return completedTasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [completedTasks, query]);

  const filteredArchived = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivedTasks;
    return archivedTasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [archivedTasks, query]);

  const groupedCompleted = useMemo(() => {
    const map = new Map<GroupKey, Task[]>();
    GROUP_ORDER.forEach((k) => map.set(k, []));

    filteredCompleted.forEach((t) => {
      if (!t.completedAt) return;
      const key = groupKeyForCompletedAt(t.completedAt);
      map.get(key)!.push(t);
    });

    return GROUP_ORDER.map((key) => ({ key, tasks: map.get(key)! })).filter((g) => g.tasks.length > 0);
  }, [filteredCompleted]);

  const oldTasksCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return completedTasks.filter((t) => t.completedAt && differenceInDays(today, t.completedAt) > 7).length;
  }, [completedTasks]);

  const getProject = (projectId?: string) => (projectId ? projects.find((p) => p.id === projectId) : undefined);

  const emptyStateLabel = tab === "completed" ? "No completed tasks" : "No archived tasks";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground gap-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Completed</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[900px] p-0">
        <div className="flex h-[85vh] max-h-[85vh] flex-col">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Completed tasks</DialogTitle>
            <DialogDescription>Restore, archive, or search completed tasks.</DialogDescription>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="completed" className="h-7 text-xs">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="h-7 text-xs">
                    Archived
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-[340px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search completed tasks..."
                  className="h-8 pl-8 text-[13px]"
                />
              </div>
            </div>

            {tab === "completed" && oldTasksCount > 0 && (
              <div className="mt-3 flex items-center justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onArchiveOldTasks}>
                  <Archive className="h-3 w-3" />
                  Archive old
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 px-6 pb-6">
            <ScrollArea className="h-full pr-4">
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsContent value="completed" className="mt-0">
                  {groupedCompleted.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-6 w-6 opacity-40" />
                      <p className="mt-2 text-[13px]">{emptyStateLabel}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedCompleted.map((group) => (
                        <section key={group.key} className="space-y-1">
                          <div className="px-1 text-[13px] font-medium text-foreground">{group.key}</div>
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
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="archived" className="mt-0">
                  {filteredArchived.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                      <Archive className="h-6 w-6 opacity-40" />
                      <p className="mt-2 text-[13px]">{emptyStateLabel}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Clear archive
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear archive?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all archived tasks. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={onClearArchive}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="space-y-0.5">
                        {filteredArchived.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            project={getProject(task.projectId)}
                            onRestore={() => onRestoreTask(task.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
