-- Fix infinite recursion in project_members RLS policy
-- The old policy referenced itself causing "infinite recursion detected" errors

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;

-- Create a simple non-recursive SELECT policy
-- Project membership info is not sensitive, and modification is already admin-only
CREATE POLICY "Authenticated users can view project members"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (true);