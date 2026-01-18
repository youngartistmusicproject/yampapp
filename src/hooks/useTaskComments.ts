import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { User, TaskComment, TaskAttachment } from '@/types';

// Fetch comments for a specific task
export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (commentsError) throw commentsError;
      
      // Fetch comment attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('task_comment_attachments')
        .select('*')
        .eq('task_id', taskId);
      
      if (attachmentsError) throw attachmentsError;
      
      // Group attachments by comment_id
      const attachmentsByComment = new Map<string, TaskAttachment[]>();
      attachmentsData?.forEach(att => {
        const existing = attachmentsByComment.get(att.comment_id) || [];
        existing.push({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          url: att.url,
          uploadedBy: { id: att.uploaded_by, name: att.uploaded_by, email: '', role: 'staff' as const },
          uploadedAt: new Date(att.created_at),
        });
        attachmentsByComment.set(att.comment_id, existing);
      });
      
      // Map to TaskComment format
      return commentsData.map(c => ({
        id: c.id,
        content: c.content,
        author: { id: c.author_name, name: c.author_name, email: '', role: 'staff' as const } as User,
        createdAt: new Date(c.created_at),
        attachments: attachmentsByComment.get(c.id) || [],
        parentCommentId: c.parent_comment_id || undefined,
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });
}

// Add a comment to a task
export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      content, 
      files 
    }: { 
      taskId: string; 
      content: string; 
      files?: File[];
    }) => {
      const authorName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}` : 'You';
      
      // Insert comment
      const { data: comment, error: commentError } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          content,
          author_name: authorName,
        })
        .select()
        .single();
      
      if (commentError) throw commentError;
      
      // Upload files if any
      if (files && files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${taskId}/${comment.id}/${crypto.randomUUID()}.${fileExt}`;
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(fileName, file);
          
          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(fileName);
          
          // Insert attachment record
          await supabase
            .from('task_comment_attachments')
            .insert({
              comment_id: comment.id,
              task_id: taskId,
              name: file.name,
              type: file.type,
              size: file.size,
              url: urlData.publicUrl,
              uploaded_by: authorName,
            });
        }
      }
      
      return comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Delete a comment
export function useDeleteTaskComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, commentId }: { taskId: string; commentId: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      return commentId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Fetch all attachments for a task (both direct and from comments)
export function useTaskAttachments(taskId: string | null) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      // Fetch direct task attachments
      const { data: directAttachments, error: directError } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId);
      
      if (directError) throw directError;
      
      // Fetch comment attachments
      const { data: commentAttachments, error: commentError } = await supabase
        .from('task_comment_attachments')
        .select('*')
        .eq('task_id', taskId);
      
      if (commentError) throw commentError;
      
      // Combine and map to TaskAttachment format
      const allAttachments: TaskAttachment[] = [
        ...(directAttachments || []).map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          url: att.url,
          uploadedBy: { id: att.uploaded_by, name: att.uploaded_by, email: '', role: 'staff' as const } as User,
          uploadedAt: new Date(att.created_at),
        })),
        ...(commentAttachments || []).map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          url: att.url,
          uploadedBy: { id: att.uploaded_by, name: att.uploaded_by, email: '', role: 'staff' as const } as User,
          uploadedAt: new Date(att.created_at),
        })),
      ];
      
      return allAttachments;
    },
    enabled: !!taskId,
  });
}

// Upload a direct attachment to a task
export function useUploadTaskAttachment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const uploaderName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}` : 'You';
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/direct/${crypto.randomUUID()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);
      
      // Insert attachment record
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: urlData.publicUrl,
          uploaded_by: uploaderName,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Delete a task attachment
export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, attachmentId, isCommentAttachment }: { 
      taskId: string; 
      attachmentId: string; 
      isCommentAttachment?: boolean;
    }) => {
      const table = isCommentAttachment ? 'task_comment_attachments' : 'task_attachments';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', attachmentId);
      
      if (error) throw error;
      return attachmentId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
