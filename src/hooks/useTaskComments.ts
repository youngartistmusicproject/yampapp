import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { User, TaskComment, TaskAttachment, CommentReaction } from '@/types';

// Interface for comment reactions from database
interface CommentReactionRow {
  id: string;
  comment_id: string;
  user_id: string;
  user_name: string;
  emoji: string;
  created_at: string;
}

// Fetch comments for a specific task with realtime updates
export function useTaskComments(taskId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Realtime subscription for comments
  useEffect(() => {
    if (!taskId) return;
    
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comment_reactions',
        },
        () => {
          // Invalidate on reaction changes
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
  
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
      
      // Fetch comment reactions
      const commentIds = commentsData.map(c => c.id);
      let reactionsData: CommentReactionRow[] = [];
      if (commentIds.length > 0) {
        const { data, error: reactionsError } = await supabase
          .from('task_comment_reactions')
          .select('*')
          .in('comment_id', commentIds);
        
        if (reactionsError) throw reactionsError;
        reactionsData = (data || []) as CommentReactionRow[];
      }
      
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
      
      // Group reactions by comment_id and emoji
      const reactionsByComment = new Map<string, CommentReaction[]>();
      reactionsData.forEach(reaction => {
        const existing = reactionsByComment.get(reaction.comment_id) || [];
        const emojiReaction = existing.find(r => r.emoji === reaction.emoji);
        if (emojiReaction) {
          emojiReaction.users.push({ 
            id: reaction.user_id, 
            name: reaction.user_name, 
            email: '', 
            role: 'staff' as const 
          });
        } else {
          existing.push({
            emoji: reaction.emoji,
            users: [{ 
              id: reaction.user_id, 
              name: reaction.user_name, 
              email: '', 
              role: 'staff' as const 
            }],
          });
        }
        reactionsByComment.set(reaction.comment_id, existing);
      });
      
      // Map to TaskComment format
      return commentsData.map(c => ({
        id: c.id,
        content: c.content,
        author: { id: c.author_name, name: c.author_name, email: '', role: 'staff' as const } as User,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
        attachments: attachmentsByComment.get(c.id) || [],
        reactions: reactionsByComment.get(c.id) || [],
        parentCommentId: c.parent_comment_id || undefined,
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });
}

// Toggle reaction on a comment - only one emoji per user at a time
export function useToggleCommentReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      commentId, 
      emoji 
    }: { 
      taskId: string; 
      commentId: string; 
      emoji: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if user already has this exact reaction
      const { data: existingSame } = await supabase
        .from('task_comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();
      
      if (existingSame) {
        // Remove the same reaction (toggle off)
        const { error } = await supabase
          .from('task_comment_reactions')
          .delete()
          .eq('id', existingSame.id);
        
        if (error) throw error;
        return { action: 'removed' };
      }
      
      // Remove any existing reaction from this user on this comment (only one emoji allowed)
      await supabase
        .from('task_comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      
      // Add new reaction
      const { error } = await supabase
        .from('task_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          user_name: 'placeholder', // Will be set by trigger
          emoji,
        });
      
      if (error) throw error;
      return { action: 'added' };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
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
      files,
      parentCommentId,
    }: { 
      taskId: string; 
      content: string; 
      files?: File[];
      parentCommentId?: string;
    }) => {
      const authorName = profile ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}` : 'You';
      
      // Insert comment
      const { data: comment, error: commentError } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          content,
          author_name: authorName,
          parent_comment_id: parentCommentId || null,
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

// Update a comment
export function useUpdateTaskComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, commentId, content }: { taskId: string; commentId: string; content: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId);
      
      if (error) throw error;
      return commentId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
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
