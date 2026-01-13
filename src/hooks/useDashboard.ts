import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, isToday, isTomorrow } from 'date-fns';

export interface DashboardStats {
  tasksDueToday: number;
  tasksDueTomorrow: number;
  overdueTasks: number;
  pendingRequests: number;
  activeProjects: number;
}

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  effort: string;
  importance: string;
  assignee: string | null;
  dueDate: Date | null;
}

export interface DashboardEvent {
  id: string;
  title: string;
  time: string;
  date: string;
}

export interface DashboardActivity {
  id: string;
  user_name: string;
  action: string;
  target_title: string;
  created_at: string;
}

export interface ProjectProgress {
  id: string;
  name: string;
  color: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
}

export interface WeeklyCompletionData {
  day: string;
  completed: number;
  date: string;
}

export function useDashboard() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Fetch stats
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Tasks due today
      const { count: tasksDueToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .gte('due_date', format(startOfDay(today), 'yyyy-MM-dd'))
        .lte('due_date', format(endOfDay(today), 'yyyy-MM-dd'));

      // Also count in-progress tasks due today
      const { count: inProgressDueToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .gte('due_date', format(startOfDay(today), 'yyyy-MM-dd'))
        .lte('due_date', format(endOfDay(today), 'yyyy-MM-dd'));

      // Tasks due tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      
      const { count: tasksDueTomorrowTodo } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .eq('due_date', tomorrowStr);

      const { count: tasksDueTomorrowInProgress } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .eq('due_date', tomorrowStr);

      // Overdue tasks (due date before today and not completed)
      const todayStr = format(today, 'yyyy-MM-dd');
      const { count: overdueTodo } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .lt('due_date', todayStr);

      const { count: overdueInProgress } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .lt('due_date', todayStr);

      // Active projects
      const { count: activeProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // For pending requests, we'll count tasks that need review (could be customized)
      // For now, counting high priority todo tasks as "pending"
      const { count: pendingRequests } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'todo')
        .eq('priority', 'high');

      return {
        tasksDueToday: (tasksDueToday || 0) + (inProgressDueToday || 0),
        tasksDueTomorrow: (tasksDueTomorrowTodo || 0) + (tasksDueTomorrowInProgress || 0),
        overdueTasks: (overdueTodo || 0) + (overdueInProgress || 0),
        pendingRequests: pendingRequests || 0,
        activeProjects: activeProjects || 0,
      };
    },
  });

  // Fetch tasks due today first, then recent tasks
  const tasksQuery = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async (): Promise<DashboardTask[]> => {
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // First, get tasks due today (not completed)
      const { data: dueTodayData, error: dueTodayError } = await supabase
        .from('tasks')
        .select('id, title, status, effort, importance, assignee, due_date')
        .eq('due_date', todayStr)
        .neq('status', 'done')
        .order('importance', { ascending: false });

      if (dueTodayError) throw dueTodayError;

      // Then get recent tasks (excluding ones already fetched)
      const dueTodayIds = (dueTodayData || []).map(t => t.id);
      
      const { data: recentData, error: recentError } = await supabase
        .from('tasks')
        .select('id, title, status, effort, importance, assignee, due_date')
        .not('id', 'in', dueTodayIds.length > 0 ? `(${dueTodayIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5 - dueTodayIds.length);

      if (recentError) throw recentError;

      // Combine: tasks due today first, then other recent tasks
      const combined = [...(dueTodayData || []), ...(recentData || [])].slice(0, 5);
      
      // Parse date-only strings into local dates to avoid timezone shifts
      const parseDateOnly = (dateStr: string | null): Date | null => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      };

      return combined.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        effort: t.effort || 'easy',
        importance: t.importance || 'routine',
        assignee: t.assignee,
        dueDate: parseDateOnly(t.due_date),
      }));
    },
  });

  // Fetch recent activity
  const activityQuery = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async (): Promise<DashboardActivity[]> => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, user_name, action, target_title, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch project progress
  const projectsQuery = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: async (): Promise<ProjectProgress[]> => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('status', 'active')
        .limit(3);

      if (error) throw error;
      if (!projects) return [];

      // Get task counts for each project
      const projectProgress = await Promise.all(
        projects.map(async (project) => {
          const { count: totalTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          const { count: completedTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('status', 'done');

          const total = totalTasks || 0;
          const completed = completedTasks || 0;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            id: project.id,
            name: project.name,
            color: project.color || '#6b7280',
            progress,
            completedTasks: completed,
            totalTasks: total,
          };
        })
      );

      return projectProgress;
    },
  });

  // Fetch weekly completion data
  const weeklyCompletionQuery = useQuery({
    queryKey: ['dashboard-weekly-completion'],
    queryFn: async (): Promise<WeeklyCompletionData[]> => {
      const days: WeeklyCompletionData[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Get last 7 days including today
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = dayNames[date.getDay()];
        
        // Count tasks completed on this day
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'done')
          .gte('completed_at', `${dateStr}T00:00:00`)
          .lt('completed_at', `${dateStr}T23:59:59`);
        
        days.push({
          day: dayName,
          completed: count || 0,
          date: dateStr,
        });
      }
      
      return days;
    },
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    tasks: tasksQuery.data || [],
    tasksLoading: tasksQuery.isLoading,
    activity: activityQuery.data || [],
    activityLoading: activityQuery.isLoading,
    projects: projectsQuery.data || [],
    projectsLoading: projectsQuery.isLoading,
    weeklyCompletion: weeklyCompletionQuery.data || [],
    weeklyCompletionLoading: weeklyCompletionQuery.isLoading,
    refetch: () => {
      statsQuery.refetch();
      tasksQuery.refetch();
      activityQuery.refetch();
      projectsQuery.refetch();
      weeklyCompletionQuery.refetch();
    },
  };
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return format(date, 'MMM d');
}

export function formatEventDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}
