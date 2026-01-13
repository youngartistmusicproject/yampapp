import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, Project, User, RecurrenceSettings } from '@/types';
import { teamMembers } from '@/data/workManagementConfig';
import { format } from 'date-fns';
import { recurrenceToDb, dbToRecurrence, getNextRecurrenceDate } from '@/lib/recurrence';

// Parse a DATE column (YYYY-MM-DD) into a local Date (avoids timezone day-shift)
function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Format Date -> YYYY-MM-DD in local timezone
function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Helper to map user_name to User object
function getUserByName(name: string): User {
  const found = teamMembers.find(m => m.name === name || m.name.startsWith(name.split(' ')[0]));
  if (found) return found;
  
  // Create a basic user object for unknown names
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
    role: 'staff' as const,
  };
}

// Fetch all teams
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data.map(team => ({
        id: team.id,
        name: team.name,
        color: team.color || '#6366f1',
        description: team.description,
      }));
    },
  });
}

// Create a new team
export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (team: { name: string; description?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: team.name,
          description: team.description || null,
          color: team.color || '#6366f1',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_name: 'You',
        action: 'created team',
        target_type: 'team',
        target_title: team.name,
        target_id: data.id,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Update an existing team
export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: { name?: string; description?: string; color?: string } }) => {
      const { data, error } = await supabase
        .from('teams')
        .update({
          name: updates.name,
          description: updates.description,
          color: updates.color,
        })
        .eq('id', teamId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_name: 'You',
        action: 'updated team',
        target_type: 'team',
        target_title: data.name,
        target_id: data.id,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Delete a team
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teamId: string) => {
      // First get the team name for activity log
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();
      
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      // Log activity
      if (team) {
        await supabase.from('activity_log').insert({
          user_name: 'You',
          action: 'deleted team',
          target_type: 'team',
          target_title: team.name,
          target_id: teamId,
        });
      }
      
      return teamId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Fetch all projects with their team info
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, teams(id, name)')
        .order('name');
      
      if (error) throw error;
      
      return data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color || '#3b82f6',
        status: p.status,
        dueDate: p.due_date ? parseDateOnly(p.due_date) : undefined,
        teamId: p.team_id,
        tasks: [] as Task[],
        members: [] as User[],
        createdAt: new Date(p.created_at),
      }));
    },
  });
}

// Fetch all tasks with assignees
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      // Fetch tasks - order by sort_order for manual sorting
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });
      
      if (tasksError) throw tasksError;
      
      // Fetch all assignees
      const { data: assigneesData, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('*');
      
      if (assigneesError) throw assigneesError;
      
      // Group assignees by task_id
      const assigneesByTask = new Map<string, string[]>();
      assigneesData?.forEach(a => {
        const existing = assigneesByTask.get(a.task_id) || [];
        existing.push(a.user_name);
        assigneesByTask.set(a.task_id, existing);
      });
      
      return tasksData.map(t => {
        // Normalize status: convert DB format to UI format
        // Handle both legacy statuses (todo, in_progress) and new format (not_started, in_progress)
        let normalizedStatus = t.status.replace('_', '-');
        if (normalizedStatus === 'todo') normalizedStatus = 'not-started';
        
        // Parse recurrence settings from DB columns
        const recurrence = dbToRecurrence(t as any);
        
        return {
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          status: normalizedStatus,
          effort: (t.effort || 'easy') as 'easy' | 'light' | 'focused' | 'deep',
          importance: (t.importance || 'routine') as 'low' | 'routine' | 'important' | 'critical',
          dueDate: t.due_date ? parseDateOnly(t.due_date) : undefined,
          assignees: (assigneesByTask.get(t.id) || []).map(getUserByName),
          projectId: t.project_id || undefined,
          tags: t.tags || [],
          isRecurring: t.is_recurring,
          recurrence,
          parentTaskId: (t as any).parent_task_id || undefined,
          progress: t.progress || 0,
          estimatedTime: t.estimated_time ? parseInt(t.estimated_time) : undefined,
          completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
          archivedAt: (t as any).archived_at ? new Date((t as any).archived_at) : undefined,
          sortOrder: t.sort_order || 0,
          howToLink: (t as any).how_to_link || undefined,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        };
      }) as Task[];
    },
  });
}

// Create a new task
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: Partial<Task> & { title: string }) => {
      // Get recurrence DB fields
      const recurrenceFields = recurrenceToDb(task.recurrence);
      
      // Insert task
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          status: (task.status || 'todo').replace('-', '_'),
          effort: task.effort || 'easy',
          importance: task.importance || 'routine',
          due_date: task.dueDate ? formatDateForDB(task.dueDate) : null,
          project_id: task.projectId || null,
          tags: task.tags || [],
          is_recurring: task.isRecurring || false,
          progress: task.progress || 0,
          estimated_time: task.estimatedTime?.toString() || null,
          how_to_link: task.howToLink || null,
          ...recurrenceFields,
        })
        .select()
        .single();
      
      if (taskError) throw taskError;
      
      // Insert assignees if any
      if (task.assignees && task.assignees.length > 0) {
        const { error: assigneesError } = await supabase
          .from('task_assignees')
          .insert(
            task.assignees.map(a => ({
              task_id: newTask.id,
              user_name: a.name,
            }))
          );
        
        if (assigneesError) throw assigneesError;
      }
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_name: 'You',
        action: 'created task',
        target_type: 'task',
        target_title: task.title,
        target_id: newTask.id,
      });
      
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) {
        updateData.status = updates.status.replace('-', '_');
        // Handle completion
        if (updates.status === 'done') {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }
      }
      if (updates.effort !== undefined) updateData.effort = updates.effort;
      if (updates.importance !== undefined) updateData.importance = updates.importance;
      if (updates.dueDate !== undefined) {
        updateData.due_date = updates.dueDate ? formatDateForDB(updates.dueDate) : null;
      }
      if (updates.projectId !== undefined) updateData.project_id = updates.projectId || null;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.estimatedTime !== undefined) updateData.estimated_time = updates.estimatedTime?.toString() || null;
      if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
      if (updates.completedAt !== undefined) {
        updateData.completed_at = updates.completedAt ? updates.completedAt.toISOString() : null;
      }
      if ((updates as any).archivedAt !== undefined) {
        (updateData as any).archived_at = (updates as any).archivedAt ? (updates as any).archivedAt.toISOString() : null;
      }
      if (updates.howToLink !== undefined) updateData.how_to_link = updates.howToLink || null;
      
      // Handle recurrence settings
      if (updates.recurrence !== undefined) {
        const recurrenceFields = recurrenceToDb(updates.recurrence);
        Object.assign(updateData, recurrenceFields);
      }
      
      // Update task if there are fields to update
      if (Object.keys(updateData).length > 0) {
        const { error: taskError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId);
        
        if (taskError) throw taskError;
      }
      
      // Update assignees if provided
      if (updates.assignees !== undefined) {
        // Delete existing assignees
        await supabase.from('task_assignees').delete().eq('task_id', taskId);
        
        // Insert new assignees
        if (updates.assignees.length > 0) {
          const { error: assigneesError } = await supabase
            .from('task_assignees')
            .insert(
              updates.assignees.map(a => ({
                task_id: taskId,
                user_name: a.name,
              }))
            );
          
          if (assigneesError) throw assigneesError;
        }
      }
      
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
    },
  });
}

// Complete a recurring task and create next instance
export function useCompleteRecurringTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ task }: { task: Task }) => {
      // First, mark the current task as done
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);
      
      if (updateError) throw updateError;
      
      // Check if we should create a next instance
      if (!task.isRecurring || !task.recurrence || !task.dueDate) {
        return { taskId: task.id, nextTask: null };
      }
      
      // Calculate next due date
      const nextDueDate = getNextRecurrenceDate(task.recurrence, task.dueDate);
      
      if (!nextDueDate) {
        // Recurrence has ended
        return { taskId: task.id, nextTask: null, seriesEnded: true };
      }
      
      // Get parent task ID (either current task or the original parent)
      const parentId = task.parentTaskId || task.id;
      
      // Get current recurrence index
      const { data: siblingTasks } = await supabase
        .from('tasks')
        .select('recurrence_index')
        .or(`id.eq.${parentId},parent_task_id.eq.${parentId}`)
        .order('recurrence_index', { ascending: false })
        .limit(1);
      
      const nextIndex = ((siblingTasks?.[0] as any)?.recurrence_index || 0) + 1;
      
      // Get assignees from current task
      const { data: currentAssignees } = await supabase
        .from('task_assignees')
        .select('user_name')
        .eq('task_id', task.id);
      
      // Get recurrence fields from parent
      const recurrenceFields = recurrenceToDb(task.recurrence);
      
      // Create new task instance
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          status: 'not_started',
          effort: task.effort,
          importance: task.importance,
          due_date: formatDateForDB(nextDueDate),
          project_id: task.projectId || null,
          tags: task.tags || [],
          is_recurring: true,
          progress: 0,
          estimated_time: task.estimatedTime?.toString() || null,
          how_to_link: task.howToLink || null,
          parent_task_id: parentId,
          recurrence_index: nextIndex,
          ...recurrenceFields,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Copy assignees to new task
      if (currentAssignees && currentAssignees.length > 0) {
        await supabase.from('task_assignees').insert(
          currentAssignees.map(a => ({
            task_id: newTask.id,
            user_name: a.user_name,
          }))
        );
      }
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_name: 'You',
        action: 'created recurring instance',
        target_type: 'task',
        target_title: task.title,
        target_id: newTask.id,
      });
      
      return { taskId: task.id, nextTask: newTask };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Reorder tasks (batch update sort_order)
export function useReorderTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { taskId: string; sortOrder: number }[]) => {
      const promises = updates.map(({ taskId, sortOrder }) =>
        supabase
          .from('tasks')
          .update({ sort_order: sortOrder })
          .eq('id', taskId)
      );

      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;

      return updates;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        if (!old) return old;
        const byId = new Map(updates.map(u => [u.taskId, u.sortOrder] as const));
        return old.map(t => {
          const nextOrder = byId.get(t.id);
          return nextOrder === undefined ? t : { ...t, sortOrder: nextOrder };
        });
      });

      return { previous };
    },
    onError: (_err, _updates, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['tasks'], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
    },
  });
}

// Duplicate a task
export function useDuplicateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      // Get original task
      const { data: original, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Get original assignees
      const { data: assignees } = await supabase
        .from('task_assignees')
        .select('user_name')
        .eq('task_id', taskId);
      
      // Create duplicate
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert({
          title: `${original.title} (Copy)`,
          description: original.description,
          status: 'todo',
          effort: original.effort,
          importance: original.importance,
          due_date: original.due_date,
          project_id: original.project_id,
          tags: original.tags,
          is_recurring: false,
          progress: 0,
          estimated_time: original.estimated_time,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Copy assignees
      if (assignees && assignees.length > 0) {
        await supabase.from('task_assignees').insert(
          assignees.map(a => ({
            task_id: newTask.id,
            user_name: a.user_name,
          }))
        );
      }
      
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// Create a new project
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (project: { name: string; description?: string; teamId?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description || null,
          team_id: project.teamId || null,
          color: project.color || '#3b82f6',
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_name: 'You',
        action: 'created project',
        target_type: 'project',
        target_title: project.name,
        target_id: data.id,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Update an existing project
export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: { name?: string; description?: string; teamId?: string; color?: string } }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: updates.name,
          description: updates.description,
          team_id: updates.teamId,
          color: updates.color,
        })
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_name: 'You',
        action: 'updated project',
        target_type: 'project',
        target_title: data.name,
        target_id: data.id,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}

// Delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      // First get the project name for activity log
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      
      // Log activity
      if (project) {
        await supabase.from('activity_log').insert({
          user_name: 'You',
          action: 'deleted project',
          target_type: 'project',
          target_title: project.name,
          target_id: projectId,
        });
      }
      
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  });
}
