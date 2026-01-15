-- =====================================================
-- SECURITY FIX: Comprehensive RLS Policy Remediation
-- =====================================================

-- =====================================================
-- 1. FIX PROFILES TABLE - Create view excluding email
-- =====================================================

-- Create a public view that excludes email for general use
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT id, first_name, last_name, avatar_url, created_at, updated_at
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can only view their own full profile (with email)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- =====================================================
-- 2. FIX ACTIVITY LOG - Protect audit integrity
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all on activity_log" ON public.activity_log;

-- Users can view activity for their accessible projects
CREATE POLICY "Users can view relevant activity"
ON public.activity_log FOR SELECT
USING (
  -- Admins see everything
  is_admin(auth.uid()) OR
  -- Users see activity for projects they're members of
  (
    target_type = 'project' AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = activity_log.target_id::uuid
      AND user_id = auth.uid()
    )
  ) OR
  -- Users see activity for tasks in their projects
  (
    target_type = 'task' AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = activity_log.target_id::uuid
      AND pm.user_id = auth.uid()
    )
  )
);

-- Users can log their own activity (validated by username)
CREATE POLICY "Users can log own activity"
ON public.activity_log FOR INSERT
WITH CHECK (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- Prevent any updates to preserve audit integrity
CREATE POLICY "No updates to activity log"
ON public.activity_log FOR UPDATE
USING (false);

-- Prevent any deletes to preserve audit integrity
CREATE POLICY "No deletes from activity log"
ON public.activity_log FOR DELETE
USING (false);

-- =====================================================
-- 3. FIX MESSAGES - Restore participant-based RLS
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow view messages" ON public.messages;
DROP POLICY IF EXISTS "Allow send messages" ON public.messages;

-- Participants can view messages in their conversations
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- Participants can send messages to their conversations
CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- =====================================================
-- 4. FIX CONVERSATIONS - Restore participant-based RLS
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow viewing conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow updating conversations" ON public.conversations;

-- Participants can view their conversations
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- Participants can update their conversations
CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);