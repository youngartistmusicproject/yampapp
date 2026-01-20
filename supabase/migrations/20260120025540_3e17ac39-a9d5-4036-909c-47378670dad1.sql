-- Function to get organization member profiles (secure, non-recursive)
-- Returns only public profile fields for members in the caller's organization
CREATE OR REPLACE FUNCTION public.get_org_member_profiles(org_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First verify the caller is a member of this organization
  SELECT 
    p.id,
    p.first_name,
    p.last_name::text,
    p.avatar_url
  FROM profiles p
  INNER JOIN organization_members om ON om.user_id = p.id
  WHERE om.organization_id = org_id
    AND public.user_in_organization(org_id, auth.uid())
$$;