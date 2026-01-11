import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, isToday, isTomorrow } from 'date-fns';

export interface DashboardStats {
  tasksDueToday: number;
  completedThisWeek: number;
  pendingRequests: number;
  activeProjects: number;
}

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
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
  progress: number;
  completedTasks: number;
  totalTasks: number;
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

      // Completed this week
      const { count: completedThisWeek } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('completed_at', weekStart.toISOString())
        .lte('completed_at', weekEnd.toISOString());

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
        completedThisWeek: completedThisWeek || 0,
        pendingRequests: pendingRequests || 0,
        activeProjects: activeProjects || 0,
      };
    },
  });

  // Fetch recent tasks
  const tasksQuery = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async (): Promise<DashboardTask[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, assignee')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
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
        .select('id, name')
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
            progress,
            completedTasks: completed,
            totalTasks: total,
          };
        })
      );

      return projectProgress;
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
    refetch: () => {
      statsQuery.refetch();
      tasksQuery.refetch();
      activityQuery.refetch();
      projectsQuery.refetch();
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
