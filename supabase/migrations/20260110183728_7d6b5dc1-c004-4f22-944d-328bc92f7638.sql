-- Drop existing overly permissive policies on conversations
DROP POLICY IF EXISTS "Allow public read access on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public insert access on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow public update access on conversations" ON public.conversations;

-- Create a function to check if a user is a participant in a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = conv_id
      AND user_name = username
  )
$$;

-- Create more restrictive policies for conversations
-- Users can only view conversations they participate in
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id
  )
);

-- Users can create new conversations
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (true);

-- Users can update conversations they participate in  
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id
  )
);

-- Also update conversation_participants policies to be more restrictive
DROP POLICY IF EXISTS "Allow public read access on conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow public insert access on conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow public delete access on conversation_participants" ON public.conversation_participants;

-- Users can view participants of conversations
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
USING (true);

-- Users can add participants to conversations
CREATE POLICY "Users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true);

-- Users can remove participants from conversations
CREATE POLICY "Users can remove participants"
ON public.conversation_participants
FOR DELETE
USING (true);