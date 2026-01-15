-- =====================================================
-- SECURITY FIX: Typing Indicators Access Control
-- =====================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow view typing" ON public.typing_indicators;
DROP POLICY IF EXISTS "Allow insert typing" ON public.typing_indicators;
DROP POLICY IF EXISTS "Allow update typing" ON public.typing_indicators;
DROP POLICY IF EXISTS "Allow delete typing" ON public.typing_indicators;

-- Only conversation participants can view typing indicators
CREATE POLICY "Participants can view typing indicators"
ON public.typing_indicators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = typing_indicators.conversation_id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- Users can only insert their own typing indicators (trigger also enforces this)
CREATE POLICY "Users can insert own typing indicator"
ON public.typing_indicators FOR INSERT
WITH CHECK (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = typing_indicators.conversation_id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- Users can only update their own typing indicators
CREATE POLICY "Users can update own typing indicator"
ON public.typing_indicators FOR UPDATE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- Users can only delete their own typing indicators
CREATE POLICY "Users can delete own typing indicator"
ON public.typing_indicators FOR DELETE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);