-- =====================================================
-- SECURITY FIX: User Presence Table Access Control
-- =====================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow view presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow upsert presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow update presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow delete presence" ON public.user_presence;

-- Authenticated users can view presence (needed for "online" indicators)
CREATE POLICY "Authenticated users can view presence"
ON public.user_presence FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can only insert their own presence (enforced by trigger too)
CREATE POLICY "Users can insert own presence"
ON public.user_presence FOR INSERT
WITH CHECK (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- Users can only update their own presence
CREATE POLICY "Users can update own presence"
ON public.user_presence FOR UPDATE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- Users can only delete their own presence
CREATE POLICY "Users can delete own presence"
ON public.user_presence FOR DELETE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);