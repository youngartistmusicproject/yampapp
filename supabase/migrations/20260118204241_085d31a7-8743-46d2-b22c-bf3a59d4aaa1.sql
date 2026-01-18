-- Drop conflicting SELECT policies
DROP POLICY IF EXISTS "Members can view project tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in their org" ON public.tasks;

-- Create a unified SELECT policy that properly handles all cases
CREATE POLICY "Users can view tasks" 
ON public.tasks 
FOR SELECT 
USING (
  -- Admins can see all tasks
  is_admin(auth.uid())
  OR
  -- Users can see tasks in their organization
  (organization_id = ANY (get_user_organization_ids(auth.uid())))
);