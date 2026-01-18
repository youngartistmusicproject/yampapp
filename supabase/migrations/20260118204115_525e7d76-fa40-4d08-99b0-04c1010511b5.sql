-- Drop the problematic policies
DROP POLICY IF EXISTS "Participants can view conversation members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can add members" ON public.conversation_participants;

-- Create a helper function to check if user is in conversation (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_name = username
  );
$$;

-- Get current user's first_name for chat
CREATE OR REPLACE FUNCTION public.get_current_user_name()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT first_name FROM profiles WHERE id = auth.uid();
$$;

-- Recreate policies without self-referencing subqueries
CREATE POLICY "Participants can view conversation members" 
ON public.conversation_participants 
FOR SELECT 
USING (
  is_conversation_participant(conversation_id, get_current_user_name())
);

CREATE POLICY "Participants can add members" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  is_conversation_participant(conversation_id, get_current_user_name())
  OR user_name = get_current_user_name()
);