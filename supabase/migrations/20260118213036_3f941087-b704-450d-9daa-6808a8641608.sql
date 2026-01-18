-- Create task_comment_reactions table for emoji reactions on comments
CREATE TABLE public.task_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.task_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all reactions on comments they can see
CREATE POLICY "Users can view task comment reactions"
ON public.task_comment_reactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can add their own reactions
CREATE POLICY "Users can add their own reactions"
ON public.task_comment_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.task_comment_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to set user_name from profile
CREATE TRIGGER set_reaction_user_name
BEFORE INSERT ON public.task_comment_reactions
FOR EACH ROW
EXECUTE FUNCTION public.set_authenticated_user();

-- Function to create notification when user is mentioned in a comment
CREATE OR REPLACE FUNCTION public.notify_task_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mentioned_user RECORD;
  task_title TEXT;
  commenter_name TEXT;
  mentioned_text TEXT;
  mention_match TEXT;
BEGIN
  -- Get task title
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
  commenter_name := NEW.author_name;
  
  -- Extract mentions from content (pattern: @[Name](user_id))
  FOR mention_match IN 
    SELECT (regexp_matches(NEW.content, '@\[([^\]]+)\]\(([^)]+)\)', 'g'))[2]
  LOOP
    -- Get the mentioned user's profile
    SELECT id INTO mentioned_user FROM public.profiles WHERE id::text = mention_match;
    
    IF mentioned_user.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, reference_id)
      VALUES (
        mentioned_user.id,
        'task_mention',
        'You were mentioned',
        commenter_name || ' mentioned you in a comment on: ' || COALESCE(task_title, 'a task'),
        '/projects',
        NEW.task_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to send notifications on mentions
CREATE TRIGGER notify_on_task_mention
AFTER INSERT ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_mention();

-- Add realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comment_reactions;