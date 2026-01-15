import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, Project, User, RecurrenceSettings } from '@/types';
import { teamMembers } from '@/data/workManagementConfig';
import { format } from 'date-fns';
import { recurrenceToDb, dbToRecurrence, getNextRecurrenceDate } from '@/lib/recurrence';
import { useAuth } from '@/contexts/AuthContext';

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

// Fetch all projects with owners, members, and areas
export function useProjects() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['projects', orgId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch all project members with roles
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*');
      
      if (membersError) throw membersError;

      // Fetch all areas for mapping
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*');
      
      if (areasError) throw areasError;
      
      // Create areas map for quick lookup
      const areasMap = new Map(areasData?.map(a => [a.id, { id: a.id, name: a.name, color: a.color }]) || []);
      
      // Group owners and members by project_id
      const ownersByProject = new Map<string, string[]>();
      const membersByProject = new Map<string, string[]>();
      
      membersData?.forEach(pm => {
        if (pm.role === 'owner') {
          const existing = ownersByProject.get(pm.project_id) || [];
          existing.push(pm.user_name);
          ownersByProject.set(pm.project_id, existing);
        } else {
          const existing = membersByProject.get(pm.project_id) || [];
          existing.push(pm.user_name);
          membersByProject.set(pm.project_id, existing);
        }
      });
      
      return data.map(p => {
        const projectAreaIds = (p as any).area_ids || [];
        const projectAreas = projectAreaIds
          .map((id: string) => areasMap.get(id))
          .filter(Boolean);
        
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color || '#3b82f6',
          status: p.status,
          dueDate: p.due_date ? parseDateOnly(p.due_date) : undefined,
          tasks: [] as Task[],
          owners: (ownersByProject.get(p.id) || []).map(getUserByName),
          members: (membersByProject.get(p.id) || []).map(getUserByName),
          areaIds: projectAreaIds,
          areas: projectAreas,
          createdAt: new Date(p.created_at),
          sortOrder: (p as any).sort_order || 0,
        };
      });
    },
  });
}

// Reorder projects
export function useReorderProjects() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projects: { id: string; sortOrder: number }[]) => {
      const updates = projects.map((project, index) => 
        supabase
          .from('projects')
          .update({ sort_order: index })
          .eq('id', project.id)
      );
      
      await Promise.all(updates);
      return projects;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Fetch all tasks with assignees and inherited project areas
export function useTasks() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['tasks', orgId],
    queryFn: async () => {
      // Fetch tasks - order by sort_order for manual sorting
      let query = supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false });
      
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      
      const { data: tasksData, error: tasksError } = await query;
      
      if (tasksError) throw tasksError;
      
      // Fetch all assignees
      const { data: assigneesData, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('*');
      
      if (assigneesError) throw assigneesError;
      
      // Fetch all projects with area_ids
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, area_ids');
      
      if (projectsError) throw projectsError;
      
      // Fetch all areas for mapping
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*');
      
      if (areasError) throw areasError;
      
      // Create areas map for quick lookup
      const areasMap = new Map(areasData?.map(a => [a.id, { id: a.id, name: a.name, color: a.color }]) || []);
      
      // Create project areas map
      const projectAreasMap = new Map<string, { id: string; name: string; color: string }[]>();
      projectsData?.forEach(p => {
        const areaIds = (p as any).area_ids || [];
        const areas = areaIds.map((id: string) => areasMap.get(id)).filter(Boolean);
        projectAreasMap.set(p.id, areas);
      });
      
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
        
        // Get inherited areas from project
        const inheritedAreas = t.project_id ? projectAreasMap.get(t.project_id) || [] : [];
        
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
          inheritedAreas: inheritedAreas.length > 0 ? inheritedAreas : undefined,
          isRecurring: t.is_recurring,
          recurrence,
          parentTaskId: (t as any).parent_task_id || undefined,
          progress: t.progress || 0,
          estimatedTime: t.estimated_time ? parseInt(t.estimated_time) : undefined,
          completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
          completedBy: (t as any).completed_by || undefined,
          archivedAt: (t as any).archived_at ? new Date((t as any).archived_at) : undefined,
          sortOrder: t.sort_order || 0,
          howToLink: (t as any).how_to_link || undefined,
          subtasks: Array.isArray((t as any).subtasks) ? (t as any).subtasks : [],
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
  const { currentOrganization } = useAuth();
  
  return useMutation({
    mutationFn: async (task: Partial<Task> & { title: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      
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
          organization_id: currentOrganization.id,
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
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      // Optimistically add the new task to the list
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status || 'not-started',
        effort: newTask.effort || 'easy',
        importance: newTask.importance || 'routine',
        dueDate: newTask.dueDate,
        assignees: newTask.assignees || [],
        projectId: newTask.projectId,
        tags: newTask.tags || [],
        isRecurring: newTask.isRecurring || false,
        recurrence: newTask.recurrence,
        progress: newTask.progress || 0,
        estimatedTime: newTask.estimatedTime,
        howToLink: newTask.howToLink,
        subtasks: [],
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      queryClient.setQueryData<Task[]>(['tasks'], (old) => 
        old ? [optimisticTask, ...old] : [optimisticTask]
      );
      
      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      // Roll back to previous state on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
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
          updateData.completed_by = 'You'; // Current user
        } else {
          updateData.completed_at = null;
          updateData.completed_by = null;
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
      if (updates.subtasks !== undefined) updateData.subtasks = updates.subtasks;
      
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
          completed_by: 'You', // Current user
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
  const { currentOrganization } = useAuth();
  
  return useMutation({
    mutationFn: async (project: { name: string; description?: string; color?: string; areaIds?: string[]; owners?: User[]; members?: User[] }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description || null,
          color: project.color || '#3b82f6',
          area_ids: project.areaIds || [],
          status: 'active',
          organization_id: currentOrganization.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Insert project owners
      if (project.owners && project.owners.length > 0) {
        const ownerInserts = project.owners.map(m => ({
          project_id: data.id,
          user_name: m.name,
          role: 'owner',
        }));
        
        await supabase.from('project_members').insert(ownerInserts);
      }
      
      // Insert project members
      if (project.members && project.members.length > 0) {
        const memberInserts = project.members.map(m => ({
          project_id: data.id,
          user_name: m.name,
          role: 'member',
        }));
        
        await supabase.from('project_members').insert(memberInserts);
      }
      
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
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: { name?: string; description?: string; color?: string; areaIds?: string[]; owners?: User[]; members?: User[] } }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.areaIds !== undefined) updateData.area_ids = updates.areaIds || [];

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Sync project owners and members - delete existing and insert new
      if (updates.owners !== undefined || updates.members !== undefined) {
        await supabase.from('project_members').delete().eq('project_id', projectId);
        
        // Insert owners
        if (updates.owners && updates.owners.length > 0) {
          const ownerInserts = updates.owners.map(m => ({
            project_id: projectId,
            user_name: m.name,
            role: 'owner',
          }));
          
          await supabase.from('project_members').insert(ownerInserts);
        }
        
        // Insert members
        if (updates.members && updates.members.length > 0) {
          const memberInserts = updates.members.map(m => ({
            project_id: projectId,
            user_name: m.name,
            role: 'member',
          }));
          
          await supabase.from('project_members').insert(memberInserts);
        }
      }
      
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

// Get project members for a specific project
export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('user_name');
      
      if (error) throw error;
      return data.map(m => ({
        id: m.id,
        projectId: m.project_id,
        userName: m.user_name,
        role: m.role || 'member',
      }));
    },
    enabled: !!projectId,
  });
}

// Get all project leads (owners) across all projects
export function useAllProjectLeads() {
  return useQuery({
    queryKey: ['all-project-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('role', 'owner');
      
      if (error) throw error;
      
      // Return a set of user names who are project leads
      return data.map(m => m.user_name);
    },
  });
}
