import { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  MessageSquare,
  ArrowRight,
  Loader2,
  CalendarClock,
  BarChart3,
  FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useDashboard, formatRelativeTime, formatEventDate } from "@/hooks/useDashboard";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useTasks, useUpdateTask, useCompleteRecurringTask } from "@/hooks/useWorkManagement";
import { useAreas } from "@/hooks/useAreas";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TaskDetailDialog } from "@/components/projects/TaskDetailDialog";
import { Task, TaskComment } from "@/types";
import { teamMembers, statusLibrary, effortLibrary, importanceLibrary } from "@/data/workManagementConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const currentUser = teamMembers[0];

export default function Dashboard() {
  const { 
    stats, 
    statsLoading, 
    tasks, 
    tasksLoading, 
    activity, 
    activityLoading, 
    projects, 
    projectsLoading,
    weeklyCompletion,
    weeklyCompletionLoading,
    refetch
  } = useDashboard();
  
  const { data: areas = [] } = useAreas();
  const tags = areas.map(a => ({ id: a.id, name: a.name, color: a.color }));
  
  const { data: fullTasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const completeRecurringTask = useCompleteRecurringTask();
  const { events, isLoading: eventsLoading } = useGoogleCalendar();
  
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow'>('all');

  // Get upcoming events (next 3)
  const upcomingEvents = events
    .filter(e => e.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3);

  const overdueCount = stats?.overdueTasks ?? 0;

  // Filter tasks based on quick filter
  const filteredTasks = tasks.filter(task => {
    if (quickFilter === 'all') return true;
    if (!task.dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (quickFilter === 'overdue') return dueDate < today;
    if (quickFilter === 'today') return dueDate.getTime() === today.getTime();
    if (quickFilter === 'tomorrow') return dueDate.getTime() === tomorrow.getTime();
    return true;
  });

  const handleTaskClick = (taskId: string) => {
    const fullTask = fullTasks.find(t => t.id === taskId);
    if (fullTask) {
      setViewingTask(fullTask);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    const task = fullTasks.find(t => t.id === taskId);
    
    if (updates.status === 'done' && task?.isRecurring && task?.recurrence) {
      completeRecurringTask.mutate({ task }, {
        onSuccess: (result) => {
          refetch();
          if (result.nextTask) {
            toast.success('Recurring task completed! Next instance created.');
          } else if ((result as any).seriesEnded) {
            toast.success('Recurring task series completed!');
          }
        },
        onError: () => {
          toast.error('Failed to complete recurring task');
        },
      });
      
      if (viewingTask?.id === taskId) {
        setViewingTask(prev => prev ? { ...prev, ...updates } : null);
      }
      return;
    }
    
    updateTask.mutate({ taskId, updates }, {
      onSuccess: () => {
        refetch();
      },
      onError: () => {
        toast.error('Failed to update task');
      },
    });
    
    if (viewingTask?.id === taskId) {
      setViewingTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleAddComment = (taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>, parentCommentId?: string) => {
    toast.info('Comments are not yet persisted to the database');
  };

  const handleDeleteComment = (taskId: string, commentId: string) => {};
  const handleToggleReaction = (taskId: string, commentId: string, emoji: string) => {};

  const statItems = [
    { 
      label: "Overdue", 
      value: overdueCount, 
      icon: AlertCircle, 
      highlight: overdueCount > 0,
      link: "/projects?filter=overdue"
    },
    { 
      label: "Today", 
      value: stats?.tasksDueToday ?? 0, 
      icon: Clock, 
      highlight: false,
      link: "/projects?filter=today"
    },
    { 
      label: "Tomorrow", 
      value: stats?.tasksDueTomorrow ?? 0, 
      icon: CalendarClock, 
      highlight: false,
      link: "/projects?filter=tomorrow"
    },
    { 
      label: "Projects", 
      value: stats?.activeProjects ?? 0, 
      icon: FolderKanban, 
      highlight: false,
      link: undefined as string | undefined
    },
  ];

  const quickFilters = [
    { id: 'all' as const, label: 'All' },
    { id: 'overdue' as const, label: 'Overdue', count: overdueCount },
    { id: 'today' as const, label: 'Today', count: stats?.tasksDueToday ?? 0 },
    { id: 'tomorrow' as const, label: 'Tomorrow', count: stats?.tasksDueTomorrow ?? 0 },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your daily overview</p>
      </div>

      {/* Compact Stats Row */}
      <div className="flex flex-wrap gap-2">
        {statItems.map((stat) => {
          const content = (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
                stat.highlight 
                  ? "bg-destructive/10 border-destructive/30 text-destructive" 
                  : "bg-secondary/50 border-border/50 hover:bg-secondary",
                stat.link && "cursor-pointer"
              )}
            >
              <stat.icon className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">{stat.label}</span>
              {statsLoading ? (
                <Skeleton className="h-4 w-4 rounded-full" />
              ) : (
                <span className={cn(
                  "text-[13px] font-semibold",
                  stat.highlight && "text-destructive"
                )}>
                  ({stat.value})
                </span>
              )}
            </div>
          );

          return stat.link ? (
            <Link key={stat.label} to={stat.link}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Tasks Section */}
        <div className="lg:col-span-2 space-y-3">
          {/* Section Header with Quick Filters */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-foreground">Recent Tasks</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" asChild>
              <Link to="/projects">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {quickFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setQuickFilter(filter.id)}
                className={cn(
                  "px-2.5 py-1 text-[13px] font-medium rounded-full transition-colors",
                  quickFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span className="ml-1 opacity-80">({filter.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="space-y-1.5">
            {tasksLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 bg-muted/30 rounded-lg border border-border/50">
                No tasks found
              </div>
            ) : (
              filteredTasks.map((task) => {
                const taskAreas = task.areaIds?.map(id => areas.find(a => a.id === id)).filter(Boolean) || [];
                const effortConfig = effortLibrary.find(e => e.id === task.effort);
                const importanceConfig = importanceLibrary.find(i => i.id === task.importance);
                
                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer border border-transparent hover:border-border/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        task.status === 'done' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-primary' : 'bg-muted-foreground'
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          task.status === 'done' && 'line-through text-muted-foreground'
                        )}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
                          {task.projectName && (
                            <span className="flex items-center gap-1">
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: task.projectColor || '#6b7280' }}
                              />
                              <span className="font-medium">{task.projectName}</span>
                            </span>
                          )}
                          {taskAreas.length > 0 && (
                            <>
                              {task.projectName && <span className="text-border">•</span>}
                              <span className="flex gap-1">
                                {taskAreas.slice(0, 2).map(area => (
                                  <span 
                                    key={area!.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{
                                      backgroundColor: `${area!.color}20`,
                                      color: area!.color
                                    }}
                                  >
                                    {area!.name}
                                  </span>
                                ))}
                                {taskAreas.length > 2 && (
                                  <span className="text-muted-foreground text-[10px]">+{taskAreas.length - 2}</span>
                                )}
                              </span>
                            </>
                          )}
                          {(task.projectName || taskAreas.length > 0) && task.dueDate && <span className="text-border">•</span>}
                          {task.dueDate && (
                            <span className={cn(
                              task.dueDate < new Date(new Date().setHours(0,0,0,0)) && 'text-destructive font-medium'
                            )}>
                              {formatEventDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {effortConfig && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ 
                            backgroundColor: effortConfig.color + '20',
                            color: effortConfig.color
                          }}
                        >
                          {task.effort}
                        </span>
                      )}
                      {importanceConfig && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ 
                            backgroundColor: importanceConfig.color + '20',
                            color: importanceConfig.color
                          }}
                        >
                          {task.importance}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Upcoming Events */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Upcoming Events</h3>
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                <Link to="/calendar">View</Link>
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3">
              {eventsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-2.5">
                    <div className="min-w-[3.5rem] text-center flex-shrink-0">
                      <p className="text-xs font-semibold">{formatEventDate(event.start)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {event.isAllDay ? 'All day' : format(event.start, 'h:mm a')}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-border flex-shrink-0" />
                    <p className="text-xs truncate">{event.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium">Recent Activity</h3>
            </div>
            <div className="space-y-2.5 rounded-lg border border-border/50 bg-muted/30 p-3">
              {activityLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No recent activity</p>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-secondary">
                        {item.user_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">
                        <span className="font-medium">{item.user_name}</span>{' '}
                        <span className="text-muted-foreground">{item.action}</span>{' '}
                        <span className="font-medium truncate">{item.target_title}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Completion & Projects Progress */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Weekly Task Completion Chart */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">Weekly Completion</h3>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            {weeklyCompletionLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ChartContainer 
                config={{ completed: { label: "Completed", color: "hsl(var(--primary))" } }}
                className="h-[180px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyCompletion}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar 
                      dataKey="completed" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </div>

        {/* Projects Progress */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">Project Progress</h3>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No active projects</p>
            ) : (
              projects.slice(0, 4).map((project) => (
                <div key={project.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-sm font-medium truncate">{project.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {project.completedTasks}/{project.totalTasks}
                    </span>
                  </div>
                  <Progress 
                    value={project.totalTasks > 0 ? (project.completedTasks / project.totalTasks) * 100 : 0} 
                    className="h-1.5"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      {viewingTask && (
        <TaskDetailDialog
          task={viewingTask}
          projects={[]}
          statuses={statusLibrary}
          tags={tags}
          currentUser={currentUser}
          open={!!viewingTask}
          onOpenChange={(open) => !open && setViewingTask(null)}
          onTaskUpdate={handleTaskUpdate}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onToggleReaction={handleToggleReaction}
        />
      )}
    </div>
  );
}
