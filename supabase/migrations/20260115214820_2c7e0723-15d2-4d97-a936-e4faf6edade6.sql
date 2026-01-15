-- =====================================================
-- SECURITY FIX: Allow admins to view all profiles
-- Admins need to see user emails for management purposes
-- =====================================================

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin(auth.uid()));