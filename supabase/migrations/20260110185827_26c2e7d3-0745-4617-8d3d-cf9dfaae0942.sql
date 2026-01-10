-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- Users can only view participants of conversations they are also in
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
  )
);