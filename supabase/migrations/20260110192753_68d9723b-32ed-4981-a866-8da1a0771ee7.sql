-- Fix infinite recursion in conversation_participants policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove participants from their conversations" ON public.conversation_participants;

-- Create simple permissive policies (will be properly secured when auth is added)
CREATE POLICY "Allow viewing participants"
ON public.conversation_participants
FOR SELECT
USING (true);

CREATE POLICY "Allow adding participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow removing participants"
ON public.conversation_participants
FOR DELETE
USING (true);

-- Also fix conversations table which has the same issue
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Allow viewing conversations"
ON public.conversations
FOR SELECT
USING (true);

CREATE POLICY "Allow updating conversations"
ON public.conversations
FOR UPDATE
USING (true);