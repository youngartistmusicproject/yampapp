-- Drop existing overly permissive policies on messages
DROP POLICY IF EXISTS "Allow public read access on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert access on messages" ON public.messages;

-- Users can only view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
  )
);

-- Users can send messages to conversations they participate in
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
  )
);