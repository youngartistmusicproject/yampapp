import { useState } from "react";
import { 
  Clock, 
  AlertCircle, 
  Calendar,
  MessageSquare,
  ArrowRight,
  CalendarClock,
  BarChart3,
  FolderKanban,
  ListChecks,
  Paperclip,
  Repeat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useDashboard, formatRelativeTime, formatEventDate } from "@/hooks/useDashboard";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useTasks, useUpdateTask, useCompleteRecurringTask } from "@/hooks/useWorkManagement";
import { useAreas } from "@/hooks/useAreas";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TaskDetailDialog } from "@/components/projects/TaskDetailDialog";
import { Task, TaskComment } from "@/types";
import { statusLibrary } from "@/data/workManagementConfig";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CircularCheckbox } from "@/components/ui/circular-checkbox";
import { UserAvatarGroup } from "@/components/ui/user-avatar";

export default function Dashboard() {
  const { profile } = useAuth();
  const { members: orgMembers } = useOrgMembers();
  
  // Current user from auth context
  const currentUser = profile ? {
    id: profile.id,
    name: profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name,
    email: profile.email || '',
    role: 'staff' as const,
    avatar: profile.avatar_url || undefined,
  } : orgMembers[0];
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

  // Get upcoming events (next 3)
  const upcomingEvents = events
    .filter(e => e.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3);

  const overdueCount = stats?.overdueTasks ?? 0;

  // Sort tasks: overdue first, then today, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const aDate = a.dueDate ? new Date(a.dueDate) : null;
    const bDate = b.dueDate ? new Date(b.dueDate) : null;
    
    if (aDate) aDate.setHours(0, 0, 0, 0);
    if (bDate) bDate.setHours(0, 0, 0, 0);
    
    const aOverdue = aDate && aDate < today;
    const bOverdue = bDate && bDate < today;
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    return 0;
  }).slice(0, 8);

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

  const statCards = [
    { 
      label: "Overdue Tasks", 
      value: overdueCount, 
      icon: AlertCircle, 
      highlight: overdueCount > 0,
      link: "/projects?filter=overdue"
    },
    { 
      label: "Due Today", 
      value: stats?.tasksDueToday ?? 0, 
      icon: Clock, 
      highlight: false,
      link: "/projects?filter=today"
    },
    { 
      label: "Due Tomorrow", 
      value: stats?.tasksDueTomorrow ?? 0, 
      icon: CalendarClock, 
      highlight: false,
      link: "/projects?filter=tomorrow"
    },
    { 
      label: "Active Projects", 
      value: stats?.activeProjects ?? 0, 
      icon: FolderKanban, 
      highlight: false,
      link: undefined as string | undefined
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-2xl font-semibold text-foreground font-serif">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your daily overview</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const content = (
            <div
              className={cn(
                "relative rounded-xl border p-4 md:p-4 transition-all duration-150",
                stat.highlight 
                  ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10" 
                  : "bg-card border-border/50 hover:bg-muted/30 hover:border-border",
                stat.link && "cursor-pointer active:scale-[0.98]"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={cn(
                  "w-5 h-5 md:w-4 md:h-4",
                  stat.highlight ? "text-destructive" : "text-muted-foreground"
                )} />
                {stat.highlight && stat.value > 0 && (
                  <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                    Needs attention
                  </span>
                )}
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className={cn(
                  "text-2xl md:text-2xl font-semibold",
                  stat.highlight ? "text-destructive" : "text-foreground"
                )}>
                  {stat.value}
                </p>
              )}
              <p className={cn(
                "text-xs",
                stat.highlight ? "text-destructive/70" : "text-muted-foreground"
              )}>{stat.label}</p>
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
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks Section */}
        <div className="lg:col-span-2 space-y-3">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-foreground font-serif">Recent Tasks</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 md:h-7 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/projects">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>

          {/* Task List */}
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            {tasksLoading ? (
              <div className="divide-y divide-border/30">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-3 py-3">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-12">
                No tasks found
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {sortedTasks.map((task) => {
                  const fullTask = fullTasks.find(t => t.id === task.id);
                  const taskAreas = task.areaIds?.map(id => areas.find(a => a.id === id)).filter(Boolean) || [];
                  const isOverdue = task.dueDate && isPast(startOfDay(task.dueDate)) && !isToday(task.dueDate);
                  const isDueToday = task.dueDate && isToday(task.dueDate);
                  const isDueTomorrow = task.dueDate && isTomorrow(task.dueDate);
                  const isDone = task.status === 'done';
                  
                  // Get stage info
                  const stageInfo = statusLibrary.find(s => s.id === task.status);
                  
                  // Subtask count
                  const subtasks = fullTask?.subtasks || [];
                  const completedSubtasks = subtasks.filter((s: any) => s.completed).length;
                  const totalSubtasks = subtasks.length;
                  
                  // Comment and attachment counts
                  const commentCount = fullTask?.commentCount || 0;
                  const attachmentCount = fullTask?.attachmentCount || 0;
                  
                  // Assignees - already User[] type
                  const assigneeUsers = fullTask?.assignees || [];
                  
                  const handleCheckboxClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleTaskUpdate(task.id, { status: isDone ? 'not_started' : 'done' });
                  };
                  
                  // Format due date
                  const formatDueDate = () => {
                    if (!task.dueDate) return null;
                    if (isDueToday) return 'Today';
                    if (isDueTomorrow) return 'Tomorrow';
                    return format(task.dueDate, 'MMM d');
                  };
                  
                    return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className={cn(
                        "px-3 py-3.5 md:py-2.5 hover:bg-muted/30 transition-all cursor-pointer active:bg-muted/50",
                        isOverdue && "bg-destructive/5"
                      )}
                    >
                      {/* Single row: Checkbox + Title + Indicators + Project + Due + Stage + Avatars */}
                      <div className="flex items-center gap-2.5 md:gap-2.5">
                        {/* Checkbox */}
                        <div onClick={handleCheckboxClick} className="flex items-center justify-center w-11 h-11 md:w-auto md:h-auto -m-2 md:m-0">
                          <CircularCheckbox
                            checked={isDone}
                            onCheckedChange={() => {}}
                            className="flex-shrink-0"
                          />
                        </div>
                        
                        {/* Title */}
                        <p className={cn(
                          "flex-1 text-sm md:text-[13px] font-medium truncate min-w-0",
                          isDone && 'line-through text-muted-foreground'
                        )}>
                          {task.title}
                        </p>
                        
                        {/* Indicators - hidden on mobile */}
                        <div className="hidden md:flex items-center gap-1.5 text-muted-foreground/60 flex-shrink-0">
                          {fullTask?.isRecurring && (
                            <Repeat className="w-3 h-3" />
                          )}
                          {totalSubtasks > 0 && (
                            <div className="flex items-center gap-0.5">
                              <ListChecks className="w-3 h-3" />
                              <span className="text-[10px]">{completedSubtasks}/{totalSubtasks}</span>
                            </div>
                          )}
                          {commentCount > 0 && (
                            <div className="flex items-center gap-0.5">
                              <MessageSquare className="w-3 h-3" />
                              <span className="text-[10px]">{commentCount}</span>
                            </div>
                          )}
                          {attachmentCount > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Paperclip className="w-3 h-3" />
                              <span className="text-[10px]">{attachmentCount}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Project - hidden on mobile */}
                        {task.projectName && (
                          <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                            <span 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.projectColor || 'hsl(var(--muted-foreground))' }}
                            />
                            <span className="max-w-[80px] truncate">{task.projectName}</span>
                          </span>
                        )}
                        
                        {/* Due Date - always visible */}
                        {task.dueDate && (
                          <span className={cn(
                            "text-xs flex-shrink-0",
                            isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                          )}>
                            {formatDueDate()}
                          </span>
                        )}
                        
                        {/* Stage Badge - hidden on mobile */}
                        {stageInfo && (
                          <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                            {stageInfo.name}
                          </span>
                        )}
                        
                        {/* Assignees - hidden on mobile */}
                        {assigneeUsers.length > 0 && (
                          <div className="hidden md:block">
                            <UserAvatarGroup 
                              users={assigneeUsers} 
                              max={2} 
                              size="sm" 
                              className="flex-shrink-0"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                <h3 className="text-sm font-medium font-serif">Upcoming Events</h3>
              </div>
              <Button variant="ghost" size="sm" className="h-8 md:h-6 px-2 text-xs text-muted-foreground hover:text-foreground" asChild>
                <Link to="/calendar">View</Link>
              </Button>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 md:p-3">
              {eventsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-2.5">
                      <div className="min-w-[3.5rem] text-center flex-shrink-0">
                        <p className="text-xs font-semibold">{formatEventDate(event.start)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {event.isAllDay ? 'All day' : format(event.start, 'h:mm a')}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border/50 flex-shrink-0" />
                      <p className="text-xs truncate">{event.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium">Recent Activity</h3>
            </div>
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
              {activityLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-2.5">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
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
                  ))}
                </div>
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
          <div className="rounded-lg border border-border/40 bg-card p-4">
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
          <div className="rounded-lg border border-border/40 bg-card p-4 space-y-3">
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No active projects</p>
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
