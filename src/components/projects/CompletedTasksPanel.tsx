import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Search, X } from "lucide-react";
import { differenceInDays, format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

import { Task, Project, Team } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CompletedTasksPanelProps {
  tasks: Task[];
  projects: Project[];
  teams: Team[];
  onRestoreTask: (taskId: string) => void;
}

type TimeFilter = "all" | "today" | "yesterday" | "week" | "month" | "older";

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "older", label: "Older" },
];

function getTimeFilter(date: Date): TimeFilter {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(today, date);

  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  if (days < 7) return "week";
  if (days < 30) return "month";
  return "older";
}

function formatCompletedTime(date: Date): string {
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return "Yesterday";
  const days = differenceInDays(new Date(), date);
  if (days < 7) return format(date, "EEEE");
  return format(date, "MMM d");
}

function TaskRow({
  task,
  project,
  onRestore,
}: {
  task: Task;
  project?: Project;
  onRestore: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors w-full min-w-0 overflow-hidden">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />

      <div className="flex-1 min-w-0 w-0 overflow-hidden">
        <p className="text-sm text-muted-foreground line-through truncate w-full min-w-0">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/60">
          {task.completedAt && <span className="shrink-0">{formatCompletedTime(task.completedAt)}</span>}
          {project && (
            <>
              <span className="shrink-0">•</span>
              <span className="flex items-center gap-1 min-w-0 max-w-[120px]">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
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
  );
}

export function CompletedTasksPanel({
  tasks,
  projects,
  teams,
  onRestoreTask,
}: CompletedTasksPanelProps) {
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string>("__all__");
  const [projectFilter, setProjectFilter] = useState<string>("__all__");

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt)
        .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)),
    [tasks]
  );

  // Get projects filtered by selected team
  const filteredProjects = useMemo(() => {
    if (teamFilter === "__all__") return projects;
    return projects.filter((p) => p.teamId === teamFilter);
  }, [projects, teamFilter]);

  // Reset project filter when team changes and selected project is no longer valid
  useMemo(() => {
    if (projectFilter !== "__all__" && projectFilter !== "__none__") {
      const projectStillValid = filteredProjects.some((p) => p.id === projectFilter);
      if (!projectStillValid) {
        setProjectFilter("__all__");
      }
    }
  }, [filteredProjects, projectFilter]);

  const filteredTasks = useMemo(() => {
    let result = completedTasks;

    // Time filter
    if (timeFilter !== "all") {
      result = result.filter((t) => t.completedAt && getTimeFilter(t.completedAt) === timeFilter);
    }

    // Team filter (via project's teamId)
    if (teamFilter !== "__all__") {
      const teamProjectIds = projects.filter((p) => p.teamId === teamFilter).map((p) => p.id);
      result = result.filter((t) => t.projectId && teamProjectIds.includes(t.projectId));
    }

    // Project filter
    if (projectFilter === "__none__") {
      result = result.filter((t) => !t.projectId);
    } else if (projectFilter !== "__all__") {
      result = result.filter((t) => t.projectId === projectFilter);
    }

    // Search filter
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    return result;
  }, [completedTasks, timeFilter, teamFilter, projectFilter, projects, query]);

  const getProject = (projectId?: string) =>
    projectId ? projects.find((p) => p.id === projectId) : undefined;

  // Count by time filter for badges
  const counts = useMemo(() => {
    const c: Record<TimeFilter, number> = {
      all: completedTasks.length,
      today: 0,
      yesterday: 0,
      week: 0,
      month: 0,
      older: 0,
    };
    completedTasks.forEach((t) => {
      if (t.completedAt) {
        c[getTimeFilter(t.completedAt)]++;
      }
    });
    return c;
  }, [completedTasks]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Completed</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-[95vw] sm:max-w-[640px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header area - matches TaskDialog */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <h2 className="text-xl font-semibold">Completed Tasks</h2>
        </div>

        <div className="px-6 py-4 border-b border-border/50 space-y-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search completed tasks..."
              className="h-9 pl-9 pr-9 text-sm"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Team & Project filters */}
          <div className="flex gap-2">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="__all__">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="__all__">All Projects</SelectItem>
                <SelectItem value="__none__">No Project</SelectItem>
                {filteredProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time filters */}
          <div className="flex flex-wrap gap-1.5">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTimeFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full transition-colors",
                  timeFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {f.label}
                {counts[f.key] > 0 && f.key !== "all" && (
                  <span className="ml-1 opacity-70">{counts[f.key]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 h-full overflow-hidden">
          <ScrollArea className="h-[50vh] sm:h-[55vh] w-full">
            <div className="px-4 py-2 w-full min-w-0">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[12rem] text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 opacity-30 mb-2" />
                  <p className="text-sm">{query ? "No tasks match your search" : "No completed tasks"}</p>
                </div>
              ) : (
                <div className="space-y-0.5 w-full min-w-0">
                  {filteredTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={getProject(task.projectId)}
                      onRestore={() => onRestoreTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
