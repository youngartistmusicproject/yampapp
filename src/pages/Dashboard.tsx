import { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  MessageSquare,
  FileText,
  ArrowRight,
  Loader2,
  CalendarClock,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Get upcoming events (next 3)
  const upcomingEvents = events
    .filter(e => e.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3);

  const overdueCount = stats?.overdueTasks ?? 0;

  const handleTaskClick = (taskId: string) => {
    const fullTask = fullTasks.find(t => t.id === taskId);
    if (fullTask) {
      setViewingTask(fullTask);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    // Find the task to check if it's recurring
    const task = fullTasks.find(t => t.id === taskId);
    
    // If marking a recurring task as done, use the special hook
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
      trend: "Past due date",
      highlight: overdueCount > 0,
      link: "/projects?filter=overdue"
    },
    { 
      label: "Due Today", 
      value: stats?.tasksDueToday ?? 0, 
      icon: Clock, 
      trend: "Tasks due today",
      highlight: false,
      link: "/projects?filter=today"
    },
    { 
      label: "Due Tomorrow", 
      value: stats?.tasksDueTomorrow ?? 0, 
      icon: CalendarClock, 
      trend: "Plan ahead",
      highlight: false,
      link: "/projects?filter=tomorrow"
    },
    { 
      label: "Active Projects", 
      value: stats?.activeProjects ?? 0, 
      icon: CheckCircle2, 
      trend: "In progress",
      highlight: false,
      link: undefined as string | undefined
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid - 2 cols on mobile, 4 on desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const cardContent = (
            <Card
              className={`shadow-card hover:shadow-elevated transition-shadow ${
                stat.highlight ? 'border-destructive bg-destructive/5' : ''
              } ${stat.link ? 'cursor-pointer' : ''}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className={`text-xs sm:text-sm font-medium line-clamp-1 ${
                  stat.highlight ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-4 w-4 flex-shrink-0 ${
                  stat.highlight ? 'text-destructive' : 'text-muted-foreground'
                }`} />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                {statsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className={`text-xl sm:text-2xl font-bold ${
                    stat.highlight ? 'text-destructive' : ''
                  }`}>{stat.value}</div>
                )}
                <p className={`text-[10px] sm:text-xs mt-1 line-clamp-1 ${
                  stat.highlight ? 'text-destructive/80' : 'text-muted-foreground'
                }`}>{stat.trend}</p>
              </CardContent>
            </Card>
          );

          return stat.link ? (
            <Link key={stat.label} to={stat.link} className="block">
              {cardContent}
            </Link>
          ) : (
            <div key={stat.label}>{cardContent}</div>
          );
        })}
      </div>

      {/* Main Content Grid - stack on mobile */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Tasks Section */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
            <div>
              <CardTitle className="text-base sm:text-lg">Recent Tasks</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your assigned and recent tasks</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm" asChild>
              <Link to="/projects">
                View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {tasksLoading ? (
              <div className="space-y-2 sm:space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks yet</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {tasks.map((task) => {
                  // Get area names for this task
                  const taskAreas = task.areaIds?.map(id => areas.find(a => a.id === id)).filter(Boolean) || [];
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'done' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-primary' : 'bg-muted-foreground'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            {task.projectName && (
                              <span className="flex items-center gap-1">
                                <span 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: task.projectColor || '#6b7280' }}
                                />
                                <span className="font-medium">{task.projectName}</span>
                              </span>
                            )}
                            {taskAreas.length > 0 && (
                              <>
                                {task.projectName && <span>•</span>}
                                <span className="flex gap-1">
                                  {taskAreas.slice(0, 2).map(area => (
                                    <span 
                                      key={area!.id}
                                      className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]"
                                      style={{
                                        backgroundColor: `${area!.color}20`,
                                        color: area!.color
                                      }}
                                    >
                                      {area!.name}
                                    </span>
                                  ))}
                                  {taskAreas.length > 2 && (
                                    <span className="text-muted-foreground">+{taskAreas.length - 2}</span>
                                  )}
                                </span>
                              </>
                            )}
                            {(task.projectName || taskAreas.length > 0) && task.dueDate && <span>•</span>}
                            {task.dueDate && (
                              <span className={task.dueDate < new Date(new Date().setHours(0,0,0,0)) ? 'text-destructive font-medium' : ''}>
                                {formatEventDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <Badge 
                          variant="secondary"
                          className="text-[10px] sm:text-xs"
                          style={{ 
                            backgroundColor: effortLibrary.find(e => e.id === task.effort)?.color + '20',
                            color: effortLibrary.find(e => e.id === task.effort)?.color
                          }}
                        >
                          {task.effort}
                        </Badge>
                        <Badge 
                          variant="secondary"
                          className="text-[10px] sm:text-xs"
                          style={{ 
                            backgroundColor: importanceLibrary.find(i => i.id === task.importance)?.color + '20',
                            color: importanceLibrary.find(i => i.id === task.importance)?.color
                          }}
                        >
                          {task.importance}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Upcoming Events */}
          <Card className="shadow-card">
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm sm:text-base">Upcoming Events</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                  <Link to="/calendar">View</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-2 sm:gap-3">
                    <div className="min-w-[3.5rem] sm:min-w-[4rem] text-center flex-shrink-0 pr-2">
                      <p className="text-[10px] sm:text-xs font-semibold">{formatEventDate(event.start)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {event.isAllDay ? 'All day' : format(event.start, 'h:mm a')}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-border flex-shrink-0" />
                    <p className="text-xs sm:text-sm truncate">{event.title}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card">
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm sm:text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 sm:gap-3">
                    <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                      <AvatarFallback className="text-[10px] sm:text-xs bg-secondary">
                        {item.user_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm">
                        <span className="font-medium">{item.user_name}</span>{' '}
                        <span className="text-muted-foreground">{item.action}</span>{' '}
                        <span className="font-medium truncate">{item.target_title}</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Completion & Projects Progress */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Weekly Task Completion Chart */}
        <Card className="shadow-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm sm:text-base">Weekly Completion</CardTitle>
            </div>
            <CardDescription className="text-xs">Tasks completed in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {weeklyCompletionLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ChartContainer
                config={{
                  completed: {
                    label: "Completed",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[180px] w-full"
              >
                <BarChart data={weeklyCompletion} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <XAxis 
                    dataKey="day" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    className="fill-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="completed" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Projects Progress */}
        <Card className="shadow-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm sm:text-base">Project Progress</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link to="/projects">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {projectsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active projects</p>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="font-medium truncate">{project.name}</span>
                      <span className="text-muted-foreground flex-shrink-0 ml-2">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {project.completedTasks}/{project.totalTasks} tasks
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        task={viewingTask}
        projects={projects.map(p => ({ id: p.id, name: p.name, color: p.color }))}
        currentUser={currentUser}
        availableMembers={teamMembers}
        statuses={statusLibrary}
        tags={tags}
        onTaskUpdate={handleTaskUpdate}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onToggleReaction={handleToggleReaction}
      />
    </div>
  );
}
