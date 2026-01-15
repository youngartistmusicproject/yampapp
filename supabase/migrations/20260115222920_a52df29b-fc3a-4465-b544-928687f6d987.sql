-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'task_assignment', 'due_reminder', 'chat_message'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- Optional link to navigate to
  reference_id UUID, -- ID of related task/message/etc
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System/triggers can insert notifications for any user
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification when task is assigned
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  task_title TEXT;
  assigner_name TEXT;
BEGIN
  -- Get task title
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
  
  -- Get assigner name (current user)
  SELECT first_name INTO assigner_name FROM public.profiles WHERE id = auth.uid();
  
  -- Only create notification if assignee has a user_id (is a registered user)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, reference_id)
    VALUES (
      NEW.user_id,
      'task_assignment',
      'New Task Assigned',
      COALESCE(assigner_name, 'Someone') || ' assigned you to: ' || COALESCE(task_title, 'a task'),
      '/projects',
      NEW.task_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for task assignments
CREATE TRIGGER on_task_assigned
AFTER INSERT ON public.task_assignees
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- Function to create notification for chat messages
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  sender_profile_id UUID;
BEGIN
  -- Get sender's profile ID
  SELECT id INTO sender_profile_id FROM public.profiles WHERE first_name = NEW.sender_name LIMIT 1;
  
  -- Notify all other participants in the conversation
  FOR participant IN 
    SELECT cp.user_name, p.id as user_id
    FROM public.conversation_participants cp
    LEFT JOIN public.profiles p ON p.first_name = cp.user_name
    WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_name != NEW.sender_name
    AND p.id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, reference_id)
    VALUES (
      participant.user_id,
      'chat_message',
      'New Message from ' || NEW.sender_name,
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      '/chat',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for chat messages
CREATE TRIGGER on_chat_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message();